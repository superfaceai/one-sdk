use std::{
    collections::HashMap,
    io::Read,
    time::{Duration, Instant},
};

use url::Url;

use sf_std::{
    unstable::{http::HttpCallError, provider::ProviderJson},
    HeaderName, HeadersMultiMap,
};

use super::{digest, Fs, HttpRequest};

#[derive(Debug, thiserror::Error)]
pub enum ProfileCacheEntryError {
    #[error("Failed to parse profile data as utf8: {0}")]
    ParseError(#[from] std::string::FromUtf8Error),
}
#[derive(Debug)]
pub struct ProfileCacheEntry {
    pub profile: String, // TODO: parsed so we can extract the version
    pub content_hash: String,
}
impl ProfileCacheEntry {
    pub fn from_data(data: Vec<u8>) -> Result<Self, ProfileCacheEntryError> {
        Ok(Self {
            content_hash: digest::content_hash(&data),
            profile: String::from_utf8(data)?,
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ProviderJsonCacheEntryError {
    #[error("Failed to deserialize provider JSON: {0}")]
    ParseError(#[from] serde_json::Error),
}
#[derive(Debug)]
pub struct ProviderJsonCacheEntry {
    pub provider_json: ProviderJson,
    pub content_hash: String,
}
impl ProviderJsonCacheEntry {
    pub fn from_data(data: Vec<u8>) -> Result<Self, ProviderJsonCacheEntryError> {
        Ok(Self {
            content_hash: digest::content_hash(&data),
            provider_json: serde_json::from_slice::<ProviderJson>(&data)?,
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum MapCacheEntryError {
    #[error("Failed to parse map data as utf8: {0}")]
    ParseError(#[from] std::string::FromUtf8Error),
}
#[derive(Debug)]
pub struct MapCacheEntry {
    pub map: String,
    pub content_hash: String,
    /// This is for the purposes of stacktraces in JsInterpreter
    pub file_name: String,
}
impl MapCacheEntry {
    // TODO: name should be taken from the manifest
    pub fn new(data: Vec<u8>, file_name: String) -> Result<Self, MapCacheEntryError> {
        let content_hash = digest::content_hash(&data);
        let map = String::from_utf8(data)?;

        Ok(Self {
            content_hash,
            map,
            file_name,
        })
    }
}

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
    registry_url: Url,
    user_agent: Option<String>,
}
impl<E> DocumentCache<E> {
    const FILE_URL_PREFIX: &'static str = "file://";
    const HTTP_URL_PREFIX: &'static str = "http://";
    const HTTPS_URL_PREFIX: &'static str = "https://";
    const BASE64_URL_PREFIX: &'static str = "data:;base64,";

    pub fn new(cache_duration: Duration, registry_url: Url, user_agent: Option<String>) -> Self {
        Self {
            map: HashMap::new(),
            cache_duration,
            registry_url,
            user_agent,
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
                    Self::cache_http(url, self.user_agent.as_deref())
                } else {
                    let file = format!("{}.js", url);
                    let full_url = self.registry_url.join(&file).map_err(|_e| {
                        DocumentCacheError::HttpLoadFailed(
                            url.to_string(),
                            HttpCallError::InvalidUrl(file.clone()),
                        )
                    })?;

                    Self::cache_http(full_url.as_str(), self.user_agent.as_deref())
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
        user_agent: Option<&str>,
    ) -> Result<Vec<u8>, DocumentCacheError<PostProcessError>> {
        let mut headers = HeadersMultiMap::new();
        if let Some(user_agent) = user_agent {
            headers.insert(HeaderName::from("user-agent"), vec![user_agent.to_string()]);
        }

        let mut response = HttpRequest::fetch("GET", url, &headers, &Default::default(), None)
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
