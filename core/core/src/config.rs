use std::time::Duration;

#[derive(Debug, thiserror::Error)]
pub enum CoreConfigurationEnvError {
	#[error("Variable {0} could not be parsed as {1}")]
	InvalidVariableFormat(String, String)
}

#[derive(Debug)]
pub struct CoreConfiguration {
    pub cache_duration: Duration
}
impl CoreConfiguration {
    pub fn from_env() -> Result<Self, CoreConfigurationEnvError> {
        let mut base = Self::default();

        // TODO: document configuration env vars somewhere
		match std::env::var("SF_CONFIG_CACHE_DURATION").ok().map(|v| v.parse::<u64>()) {
			None => (),
			Some(Err(_)) => return Err(CoreConfigurationEnvError::InvalidVariableFormat("SF_CONFIG_CACHE_DURATION".into(), "u64 (seconds)".into())),
			Some(Ok(v)) => base.cache_duration = Duration::from_secs(v)
		};

        Ok(base)
    }
}
impl Default for CoreConfiguration {
    fn default() -> Self {
        Self {
            cache_duration: Duration::from_secs(60 * 60)
        }
    }
}
