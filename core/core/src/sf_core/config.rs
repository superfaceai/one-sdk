use std::time::Duration;

use url::Url;

#[derive(Debug, thiserror::Error)]
pub enum CoreConfigurationEnvError {
    #[error("Variable {0} could not be parsed as {1}")]
    InvalidVariableFormat(String, String),
}

#[derive(Debug)]
pub struct CoreConfiguration {
    /// Duration to cache documents for.
    pub cache_duration: Duration,
    /// Size of the developer dump buffer in bytes.
    pub developer_dump_buffer_size: usize,
    /// URL to document registry from which to download documents.
    pub registry_url: Url,
    pub user_log: bool,
    pub user_log_http_body_max_size: usize,
    pub developer_log: String,
}
impl CoreConfiguration {
    pub fn from_env() -> Result<Self, CoreConfigurationEnvError> {
        let mut base = Self::default();

        macro_rules! get_env {
            (
                $env_name: literal, $parse_type: ident $parse_type_hint: literal
            ) => {
                match std::env::var($env_name).ok().map(get_env!(__internal parse $parse_type)) {
                    None => Ok(None),
                    Some(Err(_)) => Err(CoreConfigurationEnvError::InvalidVariableFormat(
                        $env_name.into(),
                        concat!(stringify!($parse_type), " (", $parse_type_hint, ")").into()
                    )),
                    Some(Ok(v)) => Ok(Some(v))
                }
            };

            (__internal parse String) => { |v| Result::<String, std::convert::Infallible>::Ok(v) };
            (__internal parse Url) => { |v| Url::parse(&v) };
            (__internal parse u64) => { |v| v.parse::<u64>() };
            (__internal parse usize) => { |v| v.parse::<usize>() };
            (__internal parse bool) => { |v| match v.as_str() {
                "on" | "yes" | "true" | "1" => Ok::<bool, CoreConfigurationEnvError>(true),
                _ => Ok(false)
            } };
        }

        if let Some(v) = get_env!("ONESDK_CONFIG_CACHE_DURATION", u64 "seconds")? {
            base.cache_duration = Duration::from_secs(v);
        }
        if let Some(v) = get_env!("ONESDK_CONFIG_DEV_DUMP_BUFFER_SIZE", usize "buffer size")? {
            base.developer_dump_buffer_size = v;
        }
        if let Some(v) = get_env!("ONESDK_LOG", bool "boolean")? {
            base.user_log = v;
        }
        if let Some(v) = get_env!("ONESDK_REGISTRY_URL", Url "url")? {
            base.registry_url = v;
        }
        if let Some(v) = get_env!("ONESDK_DEV_LOG", String "string")? {
            base.developer_log = v;
        }

        Ok(base)
    }
}
impl Default for CoreConfiguration {
    fn default() -> Self {
        Self {
            cache_duration: Duration::from_secs(60 * 60),
            developer_dump_buffer_size: 1024 * 1024, // 1 MiB
            registry_url: Url::parse("http://localhost:8321").unwrap(),
            user_log: false,
            user_log_http_body_max_size: 1024 * 1024, // 1 MiB
            developer_log: "off".to_string(),
        }
    }
}
