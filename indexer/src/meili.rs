use anyhow::Result;
use once_cell::sync::Lazy;
use reqwest::Client;
use serde::Serialize;

static CLIENT: Lazy<Client> = Lazy::new(|| Client::new());

pub async fn put<D: Serialize>(index: &str, value: &D) -> Result<()> {
    let key = std::env::var("MEILI_KEY")?;
    let url = std::env::var("MEILI_URL")?;

    CLIENT
        .post(format!("{url}/indexes/{index}/documents"))
        .header("Authorization", format!("Bearer {key}"))
        .json(&[value])
        .send()
        .await?;

    Ok(())
}

pub async fn put_batch<D: Serialize>(index: &str, value: &[D]) -> Result<()> {
    let key = std::env::var("MEILI_KEY")?;
    let url = std::env::var("MEILI_URL")?;

    CLIENT
        .post(format!("{url}/indexes/{index}/documents"))
        .header("Authorization", format!("Bearer {key}"))
        .json(value)
        .send()
        .await?;

    Ok(())
}
