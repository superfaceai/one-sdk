use std::collections::BTreeMap;

use sf_std::unstable::{
    perform::{PerformException, PerformInput, TakePerformInputError},
    provider::ProviderJson,
    HostValue,
};

use interpreter_js::{JsInterpreter, JsInterpreterError};
use map_std::unstable::{
    security::{prepare_provider_parameters, prepare_security_map, PrepareSecurityMapError},
    services::prepare_services_map,
    MapValue, MapValueObject,
};

use crate::bindings::{MessageExchangeFfi, StreamExchangeFfi};

mod cache;
mod config;
mod map_std_impl;
mod profile_validator;

// use crate::profile_validator::ProfileValidator;
use cache::{DocumentCache, DocumentCacheError};
pub use config::CoreConfiguration;
use map_std_impl::MapStdImpl;

type Fs = sf_std::unstable::fs::FsConvenience<MessageExchangeFfi, StreamExchangeFfi>;
type HttpRequest = sf_std::unstable::http::HttpRequest<MessageExchangeFfi, StreamExchangeFfi>;
type IoStream = sf_std::unstable::IoStream<StreamExchangeFfi>;

pub struct PerformExceptionError {
    pub error_core: String,
    pub message: String,
}
impl From<DocumentCacheError> for PerformExceptionError {
    fn from(value: DocumentCacheError) -> Self {
        PerformExceptionError {
            error_core: "DocumentCacheError".to_string(),
            message: value.to_string(),
        }
    }
}
impl From<PrepareSecurityMapError> for PerformExceptionError {
    fn from(value: PrepareSecurityMapError) -> Self {
        PerformExceptionError {
            error_core: "PrepareSecurityMapError".to_string(),
            message: value.to_string(),
        }
    }
}
impl From<JsInterpreterError> for PerformExceptionError {
    fn from(value: JsInterpreterError) -> Self {
        PerformExceptionError {
            error_core: "JsInterpreterError".to_string(),
            message: value.to_string(),
        }
    }
}
impl From<TakePerformInputError> for PerformExceptionError {
    fn from(value: TakePerformInputError) -> Self {
        PerformExceptionError {
            error_core: "TakePerformInputError".to_string(),
            message: value.to_string(),
        }
    }
}
impl From<PerformExceptionError> for PerformException {
    fn from(value: PerformExceptionError) -> Self {
        PerformException {
            error_code: value.error_core,
            message: value.message,
        }
    }
}

#[derive(Debug)]
pub struct OneClientCore {
    document_cache: DocumentCache,
}
impl OneClientCore {
    const MAP_STDLIB_JS: &str = include_str!("../assets/js/map_std.js");

    // TODO: Use thiserror and define specific errors
    pub fn new(config: CoreConfiguration) -> anyhow::Result<Self> {
        tracing::info!(target: "@user", config = ?config);

        crate::observability::metrics::log_metric!(
            Init
        );

        Ok(Self {
            document_cache: DocumentCache::new(config.cache_duration),
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
        let perform_input = PerformInput::take_in(MessageExchangeFfi)?;
        let profile_url = perform_input.profile_url.clone();
        let provider_url = perform_input.provider_url.clone();
        
        let result = self.perform_inner(perform_input);
        crate::observability::metrics::log_metric!(
            Perform
            // success is when the result is `Ok(Ok(_))`
            success = result.as_ref().map(|inner| inner.is_ok()).unwrap_or(false),
            profile = &profile_url,
            provider = &provider_url
        );

        result
    }

    /// Internal implementation of perform so we can have ergonomics of `?` operator while handling metrics outside
    fn perform_inner(&mut self, perform_input: PerformInput) -> Result<Result<HostValue, HostValue>, PerformExceptionError> {
        self.document_cache.cache(&perform_input.profile_url)?;
        self.document_cache.cache(&perform_input.provider_url)?;
        self.document_cache.cache(&perform_input.map_url)?;

        let map_input = self.host_value_to_map_value(perform_input.map_input);
        let mut map_parameters = match perform_input.map_parameters {
            HostValue::Object(o) => MapValueObject::from_iter(
                o.into_iter()
                    .map(|(k, v)| (k, self.host_value_to_map_value(v))),
            ),
            HostValue::None => MapValueObject::new(),
            _ => {
                return Err(PerformExceptionError {
                    error_core: "PerformInputParametersFormatError".to_string(),
                    message: "Parameters must be an Object or None".to_string(),
                })
            }
        };

        let provider_json = self
            .document_cache
            .get(&perform_input.provider_url)
            .unwrap();
        let provider_json = match serde_json::from_slice::<ProviderJson>(provider_json) {
            Err(err) => {
                return Err(PerformExceptionError {
                    error_core: "ProviderJsonFormatError".to_string(),
                    message: format!("Failed to deserialize provider JSON: {}", err),
                })
            }
            Ok(v) => v,
        };

        let mut provider_parameters = prepare_provider_parameters(&provider_json);
        provider_parameters.append(&mut map_parameters);
        map_parameters = provider_parameters;

        let map_security = prepare_security_map(&provider_json, &perform_input.map_security)?;
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

        // TODO: should this be here or should we hold an instance of the interpreter in global state
        // and clear per-perform data each time it is called?
        let mut interpreter = JsInterpreter::new(MapStdImpl::new())?;
        // here we allow runtime stdlib replacement for development purposes
        // this might be removed in the future
        match std::env::var("ONESDK_REPLACE_MAP_STDLIB").ok() {
            None => interpreter.eval_code("map_std.js", Self::MAP_STDLIB_JS),
            Some(path) => {
                let replacement =
                    Fs::read_to_string(&path).map_err(|err| PerformExceptionError {
                        error_core: "ReplacementStdlibError".to_string(),
                        message: format!("Failed to load replacement map_std: {}", err),
                    })?;

                interpreter.eval_code(&path, &replacement)
            }
        }?;

        let map_code =
            match std::str::from_utf8(self.document_cache.get(&perform_input.map_url).unwrap()) {
                Err(err) => {
                    return Err(PerformExceptionError {
                        error_core: "MapFormatError".to_string(),
                        message: format!("Failed to parse map as utf8: {}", err),
                    })
                }
                Ok(v) => v,
            };

        let map_result = {
            interpreter.state_mut().set_context(
                map_std::map_value!({
                    "input": map_input,
                    "parameters": MapValue::Object(map_parameters),
                    "services": map_services
                }),
                Some(map_security),
            );
            interpreter.run(map_code, &perform_input.usecase)?;

            interpreter.state_mut().take_output().unwrap()
        };

        Ok(match map_result {
            Ok(result) => Ok(self.map_value_to_host_value(result)),
            Err(error) => Err(self.map_value_to_host_value(error)),
        })
    }
}
