use std::time::Duration;

#[derive(Debug, thiserror::Error)]
pub enum CoreConfigurationEnvError {
    #[error("Variable {0} could not be parsed as {1}")]
    InvalidVariableFormat(String, String),
}

#[derive(Debug)]
pub struct CoreConfiguration {
    pub cache_duration: Duration,
    pub developer_dump_buffer_size: usize
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
            (__internal parse u64) => { |v| v.parse::<u64>() };
            (__internal parse usize) => { |v| v.parse::<usize>() };
        }

        if let Some(v) = get_env!("OSDK_CONFIG_CACHE_DURATION", u64 "seconds")? {
            base.cache_duration = Duration::from_secs(v);
        }
        if let Some(v) = get_env!("OSDK_CONFIG_DEV_DUMP_BUFFER_SIZE", usize "buffer size")? {
            base.developer_dump_buffer_size = v;
        }

        Ok(base)
    }
}
impl Default for CoreConfiguration {
    fn default() -> Self {
        Self {
            cache_duration: Duration::from_secs(60 * 60),
            developer_dump_buffer_size: 1024 * 1024 // 1 MiB
        }
    }
}
