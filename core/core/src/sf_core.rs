use std::{collections::BTreeMap, borrow::Cow};

use sf_std::unstable::{perform::PerformInput, provider::ProviderJson, HostValue};

use interpreter_js::JsInterpreter;
use map_std::unstable::{
    security::{prepare_provider_parameters, prepare_security_map},
    services::prepare_services_map,
    MapValue, MapValueObject,
};

use crate::bindings::{MessageExchangeFfi, StreamExchangeFfi};

mod cache;
mod config;
mod digest;
mod exception;
mod map_std_impl;
mod profile_validator;

// use crate::profile_validator::ProfileValidator;
use cache::DocumentCache;
pub use config::CoreConfiguration;
use exception::PerformExceptionError;
use map_std_impl::MapStdImpl;

type Fs = sf_std::unstable::fs::FsConvenience<MessageExchangeFfi, StreamExchangeFfi>;
type HttpRequest = sf_std::unstable::http::HttpRequest<MessageExchangeFfi, StreamExchangeFfi>;
type IoStream = sf_std::unstable::IoStream<StreamExchangeFfi>;

/// For the purposes of metrics we are interested in some data which may or may not be parsed out of the profile, provider and map.
///
/// If the perform ends successfully or with a maped error these fields will be available. If it ends with an exception some of these fields might not be available.
#[derive(Debug, Default)]
// #[allow(dead_code)] // TODO: until we use these fields
struct PerformMetricsData<'a> {
    /// Profile id in format `<scope>.<name>`
    pub profile: Option<&'a str>,
    /// Profile url as passed into perform
    pub profile_url: &'a str,
    /// Profile version as parsed from the profile header
    pub profile_version: Option<String>,
    pub profile_content_hash: Option<&'a str>,
    /// Provider name
    pub provider: Option<&'a str>,
    /// Provider url as passed into perform
    pub provider_url: &'a str,
    pub provider_content_hash: Option<&'a str>,
    /// Map url as passed into perform
    pub map_url: &'a str,
    /// Map version as parsed from map metadata
    pub map_version: Option<String>,
    pub map_content_hash: Option<&'a str>,
}
impl<'a> PerformMetricsData<'a> {
    pub fn get_profile(&self) -> Cow<'_, str> {
        match self.profile {
            Some(profile) => Cow::Borrowed(profile),
            None => Cow::Owned(
                self
                    .profile_url
                    .split('/')
                    .last()
                    .and_then(|b| b.strip_suffix(".profile"))
                    .unwrap()
                    .replace('.', "/")
            )
        }
    }

    pub fn get_provider(&self) -> &str {
        match self.provider {
            Some(provider) => provider,
            None => self
                .profile_url
                .split('/')
                .last()
                .and_then(|b| b.strip_suffix(".provider.json"))
                .unwrap(),
        }
    }
}

#[derive(Debug, thiserror::Error)]
enum ProfileCacheEntryError {
    #[error("Failed to parse profile data as utf8: {0}")]
    ParseError(#[from] std::string::FromUtf8Error),
}
#[derive(Debug)]
struct ProfileCacheEntry {
    pub profile: String, // TODO: parsed
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
enum ProviderJsonCacheEntryError {
    #[error("Failed to deserialize provider JSON: {0}")]
    ParseError(#[from] serde_json::Error),
}
#[derive(Debug)]
struct ProviderJsonCacheEntry {
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
enum MapCacheEntryError {
    #[error("Failed to parse map data as utf8: {0}")]
    ParseError(#[from] std::string::FromUtf8Error),
}
#[derive(Debug)]
struct MapCacheEntry {
    pub map: String,
    pub content_hash: String,
}
impl MapCacheEntry {
    pub fn from_data(data: Vec<u8>) -> Result<Self, MapCacheEntryError> {
        Ok(Self {
            content_hash: digest::content_hash(&data),
            map: String::from_utf8(data)?,
        })
    }
}

#[derive(Debug)]
pub struct OneClientCore {
    profile_cache: DocumentCache<ProfileCacheEntry>,
    provider_cache: DocumentCache<ProviderJsonCacheEntry>,
    map_cache: DocumentCache<MapCacheEntry>,
}
impl OneClientCore {
    const MAP_STDLIB_JS: &str = include_str!("../assets/js/map_std.js");

    // TODO: Use thiserror and define specific errors
    pub fn new(config: CoreConfiguration) -> anyhow::Result<Self> {
        tracing::info!(target: "@user", config = ?config);

        crate::observability::metrics::log_metric!(Init);

        Ok(Self {
            profile_cache: DocumentCache::new(config.cache_duration),
            provider_cache: DocumentCache::new(config.cache_duration),
            map_cache: DocumentCache::new(config.cache_duration),
        })
    }

    /// Converts HostValue into MapValue.
    ///
    /// For primitive types this is a simple move. For custom types with drop code this might include adding
    /// reference counting and registering handles.
    fn host_value_to_map_value(&mut self, value: HostValue) -> MapValue {
        match value {
            HostValue::Stream(_) => todo!(),
            HostValue::None => MapValue::None,
            HostValue::Bool(b) => MapValue::Bool(b),
            HostValue::Number(n) => MapValue::Number(n),
            HostValue::String(s) => MapValue::String(s),
            HostValue::Array(a) => MapValue::Array(
                a.into_iter()
                    .map(|v| self.host_value_to_map_value(v))
                    .collect(),
            ),
            HostValue::Object(o) => MapValue::Object(BTreeMap::from_iter(
                o.into_iter()
                    .map(|(k, v)| (k, self.host_value_to_map_value(v))),
            )),
        }
    }

    /// Converts MapValue into HostValue.
    ///
    /// This is the opposite action to [host_value_to_map_value].
    fn map_value_to_host_value(&mut self, value: MapValue) -> HostValue {
        match value {
            MapValue::None => HostValue::None,
            MapValue::Bool(b) => HostValue::Bool(b),
            MapValue::Number(n) => HostValue::Number(n),
            MapValue::String(s) => HostValue::String(s),
            MapValue::Array(a) => HostValue::Array(
                a.into_iter()
                    .map(|v| self.map_value_to_host_value(v))
                    .collect(),
            ),
            MapValue::Object(o) => HostValue::Object(BTreeMap::from_iter(
                o.into_iter()
                    .map(|(k, v)| (k, self.map_value_to_host_value(v))),
            )),
        }
    }

    pub fn perform(&mut self) -> Result<Result<HostValue, HostValue>, PerformExceptionError> {
        // we can't send metrics if we don't even know the profile and provider urls
        let perform_input = PerformInput::take_in(MessageExchangeFfi)?;

        // information we have so far parsed from the available data, might be partial if an exception happens
        let mut metrics_data = PerformMetricsData {
            profile_url: &perform_input.profile_url,
            provider_url: &perform_input.provider_url,
            map_url: &perform_input.map_url,
            ..Default::default()
        };

        /// This is like the `?` operator but allows us to run cleanup code within the same borrow scope,
        /// so we don't have to clone metrics data around for no reason
        macro_rules! try_metrics {
            (Send $success: expr) => {
                tracing::debug!(perform_metrics = ?metrics_data);
                // Cleanup code is this
                crate::observability::metrics::log_metric!(
                    Perform
                    success = $success,
                    profile = metrics_data.get_profile().as_ref(),
                    profile_url = metrics_data.profile_url,
                    profile_content_hash = metrics_data.profile_content_hash,
                    provider = metrics_data.get_provider(),
                    provider_url = metrics_data.provider_url,
                    provider_content_hash = metrics_data.provider_content_hash,
                    map_url = metrics_data.map_url,
                    map_content_hash = metrics_data.map_content_hash
                );
            };

            ($e: expr) => {
                match $e {
                    Ok(v) => v,
                    Err(err) => {
                        try_metrics!(Send false);

                        return Err(err.into());
                    }
                }
            };
        }

        // first cache documents
        try_metrics!(self
            .profile_cache
            .cache(&perform_input.profile_url, ProfileCacheEntry::from_data));
        try_metrics!(self.provider_cache.cache(
            &perform_input.provider_url,
            ProviderJsonCacheEntry::from_data
        ));
        try_metrics!(self
            .map_cache
            .cache(&perform_input.map_url, MapCacheEntry::from_data));

        // process map input and parameters
        let map_input = self.host_value_to_map_value(perform_input.map_input);
        let mut map_parameters = match perform_input.map_parameters {
            HostValue::Object(o) => MapValueObject::from_iter(
                o.into_iter()
                    .map(|(k, v)| (k, self.host_value_to_map_value(v))),
            ),
            HostValue::None => MapValueObject::new(),
            _ => {
                try_metrics!(Err(PerformExceptionError {
                    error_core: "PerformInputParametersFormatError".to_string(),
                    message: "Parameters must be an Object or None".to_string(),
                }))
            }
        };

        // parse provider json
        let ProviderJsonCacheEntry {
            provider_json,
            content_hash: provider_json_content_hash,
        } = self
            .provider_cache
            .get(&perform_input.provider_url)
            .unwrap();
        metrics_data.provider_content_hash = Some(&provider_json_content_hash);
        metrics_data.provider = Some(&provider_json.name);

        // process provider and combine with inputs
        let mut provider_parameters = prepare_provider_parameters(&provider_json);
        provider_parameters.append(&mut map_parameters);
        let map_parameters = provider_parameters;
        let map_security = try_metrics!(prepare_security_map(
            &provider_json,
            &perform_input.map_security
        ));
        let map_services = prepare_services_map(&provider_json, &map_parameters);

        // let mut profile_validator = ProfileValidator::new(
        //     std::str::from_utf8(
        //         self.document_cache
        //             .get(&perform_input.profile_url)
        //             .unwrap()
        //             .data
        //             .as_slice(),
        //     )
        //     .unwrap()
        //     .to_string(),
        //     perform_input.usecase.clone(),
        // )
        // .context("Failed to initialize profile validator")?;
        // if let Err(err) = profile_validator.validate_input(map_input.clone()) {
        //     tracing::error!("Input validation error: {}", err);
        // }
        let ProfileCacheEntry {
            profile: _,
            content_hash: profile_content_hash,
        } = self.profile_cache.get(&perform_input.profile_url).unwrap();
        metrics_data.profile_content_hash = Some(profile_content_hash);

        // start interpreting stdlib and then map code
        // TODO: should this be here or should we hold an instance of the interpreter in global state
        // and clear per-perform data each time it is called?
        let mut interpreter = try_metrics!(JsInterpreter::new(MapStdImpl::new()));
        // here we allow runtime stdlib replacement for development purposes
        // this might be removed in the future
        try_metrics!(match std::env::var("ONESDK_REPLACE_MAP_STDLIB").ok() {
            None => interpreter.eval_code("map_std.js", Self::MAP_STDLIB_JS),
            Some(path) => {
                let replacement =
                    try_metrics!(
                        Fs::read_to_string(&path).map_err(|err| PerformExceptionError {
                            error_core: "ReplacementStdlibError".to_string(),
                            message: format!("Failed to load replacement map_std: {}", err),
                        })
                    );

                interpreter.eval_code(&path, &replacement)
            }
        });

        let MapCacheEntry {
            map,
            content_hash: map_content_hash,
        } = self.map_cache.get(&perform_input.map_url).unwrap();
        metrics_data.map_content_hash = Some(map_content_hash);
        let map_result = {
            interpreter.state_mut().set_context(
                map_std::map_value!({
                    "input": map_input,
                    "parameters": MapValue::Object(map_parameters),
                    "services": map_services
                }),
                Some(map_security),
            );
            try_metrics!(interpreter.run(map, &perform_input.usecase));

            interpreter.state_mut().take_output().unwrap()
        };

        try_metrics!(Send map_result.is_ok());

        Ok(match map_result {
            Ok(result) => Ok(self.map_value_to_host_value(result)),
            Err(error) => Err(self.map_value_to_host_value(error)),
        })
    }
}
