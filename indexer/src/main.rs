use std::collections::{HashMap, HashSet};
use std::ffi::OsString;
use std::io::Read;
use std::path::{Component, PathBuf};
use std::sync::Arc;

use anyhow::{Context, Result};
use bytes::Buf;
use flate2::bufread::GzDecoder;
use reqwest::Client;
use serde::Serialize;
use tar::Archive;
use tokio::sync::Semaphore;
use tracing::{debug, error, info, instrument, warn};
use zstd::stream::Decoder as ZstdDecoder;

use crate::desc::{DescKey, parse_desc};

mod desc;
mod meili;

const MIRRORS: &str = "https://mirrors.ustc.edu.cn/archlinux";

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    index_repo("core").await?;
    index_repo("community").await?;
    index_repo("extra").await?;

    Ok(())
}

#[derive(Default)]
struct PackageEntry {
    root: OsString,
    desc: String,
    files: String,
}

/// index a repo
///
/// name can be one of `core`, `community`, `extra`
async fn index_repo(name: &str) -> Result<()> {
    let files = format!("{}/{}/os/x86_64/{}.files.tar.gz", MIRRORS, name, name);

    info!("fetching {}", files);
    let client = Client::new();
    let response = client.get(files).send().await?;
    let binary = response.bytes().await?;
    info!("opening repo files {}", name);
    let mut archive = Archive::new(GzDecoder::new(binary.reader()));
    let entries = archive.entries()?;

    let mut current = None;
    let mut current_root = OsString::new();

    let mut hs = Vec::new();
    let sem = Arc::new(Semaphore::new(4));

    for entry in entries {
        let mut entry = entry?;
        let path = entry.path()?;

        let mut c = path.components();
        let root = {
            let root = c.next();
            match root {
                Some(root) => root,
                None => continue,
            }
        };
        let child = c.next();

        match root {
            Component::Normal(root) => {
                if root != &current_root {
                    // pop current package entry and process
                    let e = current.take();
                    if let Some(e) = e {
                        let sem = sem.clone();
                        let handle = sem.acquire_owned().await?;
                        let client = client.clone();
                        let name = name.to_owned();

                        let h = tokio::spawn(async move {
                            let _handle = handle;
                            process_package(name, e, client).await?;

                            Ok::<_, anyhow::Error>(())
                        });

                        hs.push(h);
                    }

                    // begin a new package entry
                    current = Some(PackageEntry {
                        root: root.to_os_string(),
                        ..Default::default()
                    });
                    current_root = root.to_os_string();

                    continue;
                }

                // already in package entry
                match child {
                    Some(Component::Normal(child)) if child == "desc" => {
                        if let Some(e) = &mut current {
                            entry.read_to_string(&mut e.desc)?;
                        }
                    }
                    Some(Component::Normal(child)) if child == "files" => {
                        if let Some(e) = &mut current {
                            entry.read_to_string(&mut e.files)?;
                        }
                    }
                    _ => {
                        warn!("invalid child component type")
                    }
                }
            }
            _ => {
                warn!("invalid root component type");
            }
        }
    }

    if let Some(e) = current {
        hs.push(tokio::spawn(process_package(name.to_owned(), e, client)));
    }

    for h in hs {
        if let Err(e) = h.await.unwrap() {
            error!("{}", e);
        }
    }

    Ok(())
}

/// process a package entry
#[instrument(skip(e, client))]
async fn process_package(repo: String, e: PackageEntry, client: Client) -> Result<()> {
    let mut services = HashSet::new();
    let mut timers = HashSet::new();

    for line in e.files.lines() {
        if line.contains("systemd") && line.ends_with(".service") {
            services.insert(PathBuf::from(line.trim()));
        }

        if line.contains("systemd") && line.ends_with(".timer") {
            timers.insert(PathBuf::from(line.trim()));
        }
    }

    // send package description to index server.
    let mut desc = parse_desc(&e.desc)?;
    // put an extra `repo` key in package desc
    desc.put_single(DescKey::Repo, repo.clone());

    meili::put("packages", &desc).await?;

    if !services.is_empty() || !timers.is_empty() {
        let filename = desc
            .get_single(DescKey::Filename)
            .context("package has filename")?;
        let archive = retrieve_package(&repo, filename, &client).await?;

        let package = desc
            .get_single(DescKey::Name)
            .context("package has no name")?;
        index_file(
            &repo,
            package,
            archive,
            &[("services", &services), ("timers", &timers)],
        )
        .await?;

        info!(
            "{:?} total service {}, total timer {}",
            e.root,
            services.len(),
            timers.len()
        );
    }

    Ok(())
}

/// download a package from mirrors
async fn retrieve_package(
    repo: &str,
    filename: &str,
    client: &Client,
) -> Result<Archive<impl Read>> {
    let url = format!("{}/{}/os/x86_64/{}", MIRRORS, repo, filename);
    info!("retrieve {}", url);

    let response = client.get(url).send().await?;
    let binary = response.bytes().await?;

    let archive = Archive::new(ZstdDecoder::new(binary.reader())?);

    return Ok(archive);
}

/// systemd unit stored in index engine
#[derive(Serialize)]
struct UnitEntry<'a> {
    /// document id
    ///
    /// format: \[package name\]-\[filename\]
    id: String,
    /// package name
    package: &'a str,
    /// file content
    content: String,
    /// systemd unit filename
    filename: String,
    /// package repo
    repo: &'a str,
}

/// index many files from an archive to search engine
///
/// # Arguments
/// * repo - package repo
/// * package - package name
/// * archive - package archive download before
/// * index_list - pair of files need to be indexed. First entry is a name for search engine index,
/// the second is a set contains files need to be indexed.
async fn index_file<T>(
    repo: &str,
    package: &str,
    mut archive: Archive<T>,
    index_list: &[(&str, &HashSet<PathBuf>)],
) -> Result<()>
where
    T: Read,
{
    let mut units = index_list
        .iter()
        .map(|(index, _)| (*index, Vec::new()))
        .collect::<HashMap<_, _>>();

    {
        let entries = archive.entries()?;
        for entry in entries {
            let mut entry = entry?;
            let path = entry.path()?;

            'inner: for (index, files) in index_list {
                if files.contains(&*path) {
                    debug!("{:?}", path);

                    match path.file_name() {
                        None => {
                            warn!("no filename, skip");
                        }
                        Some(unit_filename) => {
                            let unit_filename = unit_filename
                                .to_str()
                                .context("invalid filename")?
                                .to_owned();
                            let id = format!(
                                "{}-{}",
                                package,
                                unit_filename.replace('@', "_").replace('.', "-")
                            );
                            let mut content = String::new();
                            entry.read_to_string(&mut content)?;

                            let unit = UnitEntry {
                                id,
                                package,
                                content,
                                filename: unit_filename,
                                repo,
                            };

                            units.get_mut(index).unwrap().push(unit);
                        }
                    }

                    break 'inner;
                }
            }
        }
    }

    for (index, units) in units {
        meili::put_batch(index, &units).await?;
    }

    Ok(())
}
