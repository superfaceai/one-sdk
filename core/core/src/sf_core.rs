use std::{collections::BTreeMap, str::FromStr};

use sf_std::unstable::{
    exception::{PerformException, PerformExceptionErrorCode},
    perform::PerformInput,
    HostValue,
};

use interpreter_js::JsInterpreter;
use map_std::unstable::{
    security::{prepare_provider_parameters, prepare_security_map},
    services::prepare_services_map,
    MapValue, MapValueObject,
};

use crate::{
    bindings::{MessageExchangeFfi, StreamExchangeFfi},
    sf_core::{json_schema_validator::JsonSchemaValidator, metrics::PerformMetricsData},
};

mod cache;
mod config;
mod digest;
mod exception;
mod json_schema_validator;
mod map_std_impl;
mod metrics;
mod profile_validator;

// use crate::profile_validator::ProfileValidator;
use cache::DocumentCache;
pub use config::CoreConfiguration;
use map_std_impl::MapStdImpl;

use self::cache::{MapCacheEntry, ProfileCacheEntry, ProviderJsonCacheEntry};

type Fs = sf_std::unstable::fs::FsConvenience<MessageExchangeFfi, StreamExchangeFfi>;
type HttpRequest = sf_std::unstable::http::HttpRequest<MessageExchangeFfi, StreamExchangeFfi>;
type IoStream = sf_std::unstable::IoStream<StreamExchangeFfi>;

#[derive(Debug)]
pub struct OneClientCore {
    profile_cache: DocumentCache<ProfileCacheEntry>,
    provider_cache: DocumentCache<ProviderJsonCacheEntry>,
    map_cache: DocumentCache<MapCacheEntry>,
    security_validator: JsonSchemaValidator,
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
            security_validator: JsonSchemaValidator::new(
                &serde_json::Value::from_str(include_str!(
                    "../assets/schemas/security_values.schema.json"
                ))
                .expect("Valid JSON"),
            )
            .expect("Valid JSON Schema for security values exists"),
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

    pub fn perform(&mut self) -> Result<Result<HostValue, HostValue>, PerformException> {
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
        try_metrics!(self.map_cache.cache(&perform_input.map_url, |data| {
            // TODO: this is temporary, should be extracted from the map manifest
            let file_name = perform_input.map_url.split('/').last().unwrap().to_string();

            MapCacheEntry::new(data, file_name)
        }));

        // process map input and parameters
        let map_input = self.host_value_to_map_value(perform_input.map_input);
        // TODO: Validate Input
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

        // TODO: Validate Parameters
        let mut map_parameters = match perform_input.map_parameters {
            HostValue::Object(o) => MapValueObject::from_iter(
                o.into_iter()
                    .map(|(k, v)| (k, self.host_value_to_map_value(v))),
            ),
            HostValue::None => MapValueObject::new(),
            _ => {
                try_metrics!(Err(PerformException {
                    error_code: PerformExceptionErrorCode::ParametersFormatError,
                    message: "Parameters must be an Object or None".to_owned(),
                }))
            }
        };

        // Validate security values against json schema
        let result = self
            .security_validator
            .validate(&perform_input.map_security);

        if let Err(result) = result {
            return try_metrics!(Err(PerformException::from(result)));
        }

        // parse provider json
        let ProviderJsonCacheEntry {
            provider_json,
            content_hash: provider_json_content_hash,
        } = self
            .provider_cache
            .get(&perform_input.provider_url)
            .unwrap();
        // TODO: validate provider json with json schema, to verify OneClient will understand it?

        metrics_data.provider_content_hash = Some(provider_json_content_hash);
        metrics_data.provider = Some(&provider_json.name);

        // process provider and combine with inputs
        let mut provider_parameters = prepare_provider_parameters(provider_json);
        provider_parameters.append(&mut map_parameters);
        let map_parameters = provider_parameters;
        let map_security = try_metrics!(prepare_security_map(
            provider_json,
            &perform_input.map_security
        ));
        let map_services = prepare_services_map(provider_json, &map_parameters);

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
                    try_metrics!(Fs::read_to_string(&path).map_err(|err| PerformException {
                        error_code: PerformExceptionErrorCode::ReplacementStdlibError,
                        message: format!("Failed to load replacement map_std: {}", err),
                    }));

                interpreter.eval_code(&path, &replacement)
            }
        });

        let MapCacheEntry {
            map,
            content_hash: map_content_hash,
            file_name: map_file_name,
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
            try_metrics!(interpreter.run(map_file_name, map, &perform_input.usecase));

            interpreter.state_mut().take_output().unwrap()
        };

        try_metrics!(Send map_result.is_ok());

        Ok(match map_result {
            Ok(result) => Ok(self.map_value_to_host_value(result)),
            Err(error) => Err(self.map_value_to_host_value(error)),
        })
    }
}
