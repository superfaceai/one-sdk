use std::{
    collections::HashMap,
    io::Read,
    time::{Duration, Instant},
};

use sf_std::unstable::http::HttpCallError;

use super::{Fs, HttpRequest};

#[derive(Debug, thiserror::Error)]
pub enum DocumentCacheError<PostProcessError: std::error::Error> {
    #[error("Failed to load document \"{0}\" file: {1}")]
    FileLoadFailed(String, std::io::Error),
    #[error("Failed to load document \"{0}\" over http: {1}")]
    HttpLoadFailed(String, HttpCallError),
    #[error("Failed to read http body: {0}")]
    HttpBodyReadFailed(std::io::Error),
    #[error("Failed to post process data: {0}")]
    PostProcessError(PostProcessError),
}

struct DocumentCacheEntry<E> {
    store_time: Instant,
    data: E,
}
impl<E: std::fmt::Debug> std::fmt::Debug for DocumentCacheEntry<E> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "MapCacheEntry({:?}, {}s old)",
            self.data,
            self.store_time.elapsed().as_secs()
        )
    }
}

pub struct DocumentCache<E> {
    map: HashMap<String, DocumentCacheEntry<E>>,
    cache_duration: Duration,
}
impl<E> DocumentCache<E> {
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

    pub fn get(&self, url: &str) -> Option<&E> {
        self.map.get(url).map(|e| &e.data)
    }

    pub fn cache<PostProcessError: std::error::Error>(
        &mut self,
        url: &str,
        post_process_fn: impl FnOnce(Vec<u8>) -> Result<E, PostProcessError>,
    ) -> Result<(), DocumentCacheError<PostProcessError>> {
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

        self.map.insert(
            url.to_string(),
            DocumentCacheEntry {
                store_time: Instant::now(),
                data: post_process_fn(data).map_err(|e| DocumentCacheError::PostProcessError(e))?,
            },
        );
        Ok(())
    }

    fn cache_file<PostProcessError: std::error::Error>(
        url: &str,
    ) -> Result<Vec<u8>, DocumentCacheError<PostProcessError>> {
        match url.strip_prefix(Self::FILE_URL_PREFIX) {
            None => Err(DocumentCacheError::FileLoadFailed(
                url.to_string(),
                std::io::ErrorKind::NotFound.into(),
            )),
            Some(path) => Fs::read(path)
                .map_err(|err| DocumentCacheError::FileLoadFailed(path.to_string(), err)),
        }
    }

    fn cache_http<PostProcessError: std::error::Error>(
        url: &str,
    ) -> Result<Vec<u8>, DocumentCacheError<PostProcessError>> {
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
    fn cache_base64<PostProcessError: std::error::Error>(
        url: &str,
    ) -> Result<Vec<u8>, DocumentCacheError<PostProcessError>> {
        use base64::Engine;

        match url.strip_prefix(Self::BASE64_URL_PREFIX) {
            None => unimplemented!(),
            Some(data) => Ok(base64::engine::general_purpose::STANDARD
                .decode(data)
                .expect("Failed to parse base64 document")),
        }
    }
}
impl<E: std::fmt::Debug> std::fmt::Debug for DocumentCache<E> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("DocumentCache")
            .field("map", &self.map)
            .field("cache_duration", &self.cache_duration)
            .finish()
    }
}
