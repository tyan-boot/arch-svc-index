use std::collections::HashMap;
use std::str::FromStr;

use anyhow::Result;
use serde::{Serialize, Serializer};

#[derive(Serialize)]
#[serde(transparent)]
pub struct PackageDesc(HashMap<DescKey, DescValue>);

#[derive(Debug, Copy, Clone, Eq, PartialEq, Serialize, Hash)]
#[serde(rename_all = "snake_case")]
pub enum DescKey {
    Filename,
    Name,
    Base,
    Version,
    Desc,
    CSize,
    ISize,
    #[serde(rename = "md5_sum")]
    MD5Sum,
    #[serde(rename = "sha256_sum")]
    SHA256Sum,
    #[serde(rename = "pgp_sig")]
    PGPSig,
    Url,
    License,
    Arch,
    BuildDate,
    Packager,
    Depends,
    MakeDepends,

    Groups,
    Replaces,
    Provides,
    CheckDepends,
    Conflicts,
    OptDepends,

    Repo,

    Begin,
}

impl FromStr for DescKey {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        match &*s.to_uppercase() {
            "FILENAME" => Ok(DescKey::Filename),
            "NAME" => Ok(DescKey::Name),
            "BASE" => Ok(DescKey::Base),
            "VERSION" => Ok(DescKey::Version),
            "DESC" => Ok(DescKey::Desc),
            "CSIZE" => Ok(DescKey::CSize),
            "ISIZE" => Ok(DescKey::ISize),
            "MD5SUM" => Ok(DescKey::MD5Sum),
            "SHA256SUM" => Ok(DescKey::SHA256Sum),
            "PGPSIG" => Ok(DescKey::PGPSig),
            "URL" => Ok(DescKey::Url),
            "LICENSE" => Ok(DescKey::License),
            "ARCH" => Ok(DescKey::Arch),
            "BUILDDATE" => Ok(DescKey::BuildDate),
            "PACKAGER" => Ok(DescKey::Packager),
            "DEPENDS" => Ok(DescKey::Depends),
            "MAKEDEPENDS" => Ok(DescKey::MakeDepends),
            "GROUPS" => Ok(DescKey::Groups),
            "REPLACES" => Ok(DescKey::Replaces),
            "PROVIDES" => Ok(DescKey::Provides),
            "CHECKDEPENDS" => Ok(DescKey::CheckDepends),
            "CONFLICTS" => Ok(DescKey::Conflicts),
            "OPTDEPENDS" => Ok(DescKey::OptDepends),

            _ => Err(anyhow::anyhow!("invalid key: {}", s)),
        }
    }
}

pub enum DescValue {
    Single(String),
    Array(Vec<String>),
}

impl Serialize for DescValue {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match self {
            DescValue::Single(v) => v.serialize(serializer),
            DescValue::Array(v) => v.serialize(serializer),
        }
    }
}

pub fn parse_desc(desc: &str) -> Result<PackageDesc> {
    let mut current = DescKey::Begin;
    let mut dict: HashMap<DescKey, Vec<String>> = HashMap::new();

    for line in desc.lines().filter(|l| !l.is_empty()) {
        if line.starts_with('%') && line.ends_with('%') {
            let key = line.trim_matches('%');
            let key = key.parse::<DescKey>()?;

            current = key;
        } else {
            dict.entry(current).or_default().push(line.to_owned());
        }
    }

    let dict = dict
        .into_iter()
        .map(|(k, mut v)| {
            if v.len() == 1 {
                (k, DescValue::Single(v.pop().unwrap()))
            } else {
                (k, DescValue::Array(v))
            }
        })
        .collect::<HashMap<_, _>>();

    Ok(PackageDesc(dict))
}

impl PackageDesc {
    pub fn get_single(&self, key: DescKey) -> Option<&str> {
        let value = self.0.get(&key)?;
        match value {
            DescValue::Single(value) => Some(&value),
            DescValue::Array(_) => None,
        }
    }

    /// put a single value into package desc
    ///
    /// will override exist value
    pub fn put_single(&mut self, key: DescKey, value: String) {
        self.0.insert(key, DescValue::Single(value));
    }
}
