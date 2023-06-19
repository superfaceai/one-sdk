use std::{
    collections::HashMap,
    io::Read,
    time::{Duration, Instant},
};

use sf_std::unstable::http::HttpCallError;

use super::{Fs, HttpRequest};

#[derive(Debug, thiserror::Error)]
pub enum DocumentCacheError {
    #[error("Failed to load document \"{0}\" file: {1}")]
    FileLoadFailed(String, std::io::Error),
    #[error("Failed to load document \"{0}\" over http: {1}")]
    HttpLoadFailed(String, HttpCallError),
    #[error("Failed to read http body: {0}")]
    HttpBodyReadFailed(std::io::Error),
}

struct DocumentCacheEntry {
    store_time: Instant,
    data: Vec<u8>,
}
impl std::fmt::Debug for DocumentCacheEntry {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "MapCacheEntry(<{} bytes>, {}s old)",
            self.data.len(),
            self.store_time.elapsed().as_secs()
        )
    }
}

#[derive(Debug)]
pub struct DocumentCache {
    map: HashMap<String, DocumentCacheEntry>,
    cache_duration: Duration,
}
impl DocumentCache {
    const FILE_URL_PREFIX: &str = "file://";
    const HTTP_URL_PREFIX: &str = "http://";
    const HTTPS_URL_PREFIX: &str = "https://";
    const BASE64_URL_PREFIX: &str = "data:;base64,";

    pub fn new(cache_duration: Duration) -> Self {
        Self {
            map: HashMap::new(),
            cache_duration,
        }
    }

    pub fn get(&self, url: &str) -> Option<&[u8]> {
        self.map.get(url).map(|e| e.data.as_slice())
    }

    pub fn cache(&mut self, url: &str) -> Result<(), DocumentCacheError> {
        let _span = tracing::debug_span!("cache_document").entered();

        tracing::debug!(url);

        match self.map.get(url) {
            Some(DocumentCacheEntry { store_time, .. })
                if store_time.elapsed() <= self.cache_duration =>
            {
                tracing::debug!("already cached");
                return Ok(());
            }
            _ => (),
        }

        let data = match url {
            url if url.starts_with(Self::FILE_URL_PREFIX) => Self::cache_file(url),
            url if url.starts_with("data:;base64,") => Self::cache_base64(url),
            url => {
                if url.starts_with(Self::HTTP_URL_PREFIX) || url.starts_with(Self::HTTPS_URL_PREFIX)
                {
                    Self::cache_http(&url)
                } else {
                    let url_base = std::env::var("ONESDK_REGISTRY_URL")
                        .unwrap_or("http://localhost:8321".to_string());
                    let url = format!("{}/{}.js", url_base, url);

                    Self::cache_http(&url)
                }
            }
        }?;

        tracing::trace!(bytes = ?data);
        if tracing::enabled!(tracing::Level::DEBUG) {
            if let Ok(utf8) = std::str::from_utf8(&data) {
                tracing::debug!(%utf8);
            }
        }

        tracing::info!(
            target: "@metrics",
            kind = "cache-document",
            url,
            len = data.len()
        );

        self.map.insert(
            url.to_string(),
            DocumentCacheEntry {
                store_time: Instant::now(),
                data,
            },
        );
        Ok(())
    }

    fn cache_file(url: &str) -> Result<Vec<u8>, DocumentCacheError> {
        match url.strip_prefix(Self::FILE_URL_PREFIX) {
            None => Err(DocumentCacheError::FileLoadFailed(
                url.to_string(),
                std::io::ErrorKind::NotFound.into(),
            )),
            Some(path) => Fs::read(path)
                .map_err(|err| DocumentCacheError::FileLoadFailed(path.to_string(), err)),
        }
    }

    fn cache_http(url: &str) -> Result<Vec<u8>, DocumentCacheError> {
        let mut response =
            HttpRequest::fetch("GET", &url, &Default::default(), &Default::default(), None)
                .and_then(|v| v.into_response())
                .map_err(|err| DocumentCacheError::HttpLoadFailed(url.to_string(), err))?;

        let mut data = Vec::new();
        response
            .body()
            .read_to_end(&mut data)
            .map_err(|err| DocumentCacheError::HttpBodyReadFailed(err))?;

        Ok(data)
    }

    // TODO: for debugging only
    fn cache_base64(url: &str) -> Result<Vec<u8>, DocumentCacheError> {
        use base64::Engine;

        match url.strip_prefix(Self::BASE64_URL_PREFIX) {
            None => unimplemented!(),
            Some(data) => Ok(base64::engine::general_purpose::STANDARD
                .decode(data)
                .expect("Failed to parse base64 document")),
        }
    }
}
