use std::{collections::BTreeMap, str::FromStr};

use sf_std::unstable::{
    exception::PerformException,
    perform::{
        set_perform_output_error, set_perform_output_exception, set_perform_output_result,
        PerformInput,
    },
    HostValue,
};

use comlink::json_schema_validator::JsonSchemaValidator;
use interpreter_js::JsInterpreter;
use map_std::unstable::{
    security::{prepare_provider_parameters, prepare_security_map},
    services::prepare_services_map,
    MapValue, MapValueObject,
};

use crate::{exception::FromJsonSchemaValidationError, metrics::PerformMetricsData};

pub use sf_std;

mod cache;
mod config;
mod digest;
mod exception;
mod map_std_impl;
mod metrics;
pub mod observability;

#[cfg(feature = "core_mock")]
mod mock;

// use crate::profile_validator::ProfileValidator;
use cache::DocumentCache;
pub use config::CoreConfiguration;
use map_std_impl::MapStdImpl;

use self::{
    cache::{MapCacheEntry, ProfileCacheEntry, ProviderJsonCacheEntry},
    map_std_impl::MapStdImplConfig,
};

#[derive(Debug)]
pub struct OneClientCore {
    profile_cache: DocumentCache<ProfileCacheEntry>,
    provider_cache: DocumentCache<ProviderJsonCacheEntry>,
    map_cache: DocumentCache<MapCacheEntry>,
    security_validator: JsonSchemaValidator,
    parameters_validator: JsonSchemaValidator,
    mapstd_config: MapStdImplConfig,
}
impl OneClientCore {
    const MAP_STDLIB_JS: &'static str = include_str!("../assets/js/map_std.js");
    const SECURITY_VALUES_JSON_SCHEMA: &'static str =
        include_str!("../assets/schemas/security_values.json");
    const PARAMETERS_VALUES_JSON_SCHEMA: &'static str =
        include_str!("../assets/schemas/parameters_values.json");

    // TODO: Use thiserror and define specific errors
    pub fn new(config: &CoreConfiguration) -> anyhow::Result<Self> {
        tracing::info!(target: "@user", config = ?config);

        crate::observability::log_metric!(Init);

        Ok(Self {
            profile_cache: DocumentCache::new(
                config.cache_duration,
                config.registry_url.clone(),
                Some(config.user_agent.clone()),
            ),
            provider_cache: DocumentCache::new(
                config.cache_duration,
                config.registry_url.clone(),
                Some(config.user_agent.clone()),
            ),
            map_cache: DocumentCache::new(
                config.cache_duration,
                config.registry_url.clone(),
                Some(config.user_agent.clone()),
            ),
            security_validator: JsonSchemaValidator::new(
                &serde_json::Value::from_str(Self::SECURITY_VALUES_JSON_SCHEMA)
                    .expect("Valid JSON"),
            )
            .expect("Valid JSON Schema for security values exists"),
            parameters_validator: JsonSchemaValidator::new(
                &serde_json::Value::from_str(Self::PARAMETERS_VALUES_JSON_SCHEMA)
                    .expect("Valid JSON"),
            )
            .expect("Valid JSON Schema for parameters values exists"),
            mapstd_config: MapStdImplConfig {
                log_http_transactions: config.user_log,
                log_http_transactions_body_max_size: config.user_log_http_body_max_size,
                user_agent: config.user_agent.clone(),
            },
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

    #[cfg_attr(feature = "core_mock", allow(unreachable_code))]
    pub fn perform(&mut self) {
        #[cfg(feature = "core_mock")]
        {
            return crate::mock::perform();
        }

        // we can't send metrics if we don't even know the profile and provider urls
        let perform_input = match PerformInput::take() {
            Ok(i) => i,
            Err(exception) => {
                set_perform_output_exception(exception.into());
                return;
            }
        };

        // information we have so far parsed from the available data, might be partial if an exception happens
        let mut metrics_data = Default::default();

        match self.perform_impl(perform_input, &mut metrics_data) {
            Ok(map_result) => {
                tracing::debug!(perform_metrics = ?metrics_data);
                crate::observability::log_metric!(
                    Perform
                    success = true,
                    profile = metrics_data.get_profile().as_ref(),
                    profile_url = metrics_data.profile_url,
                    profile_content_hash = metrics_data.profile_content_hash,
                    provider = metrics_data.get_provider(),
                    provider_url = metrics_data.provider_url,
                    provider_content_hash = metrics_data.provider_content_hash,
                    map_url = metrics_data.map_url,
                    map_content_hash = metrics_data.map_content_hash
                );

                match map_result {
                    Ok(result) => set_perform_output_result(self.map_value_to_host_value(result)),
                    Err(error) => set_perform_output_error(self.map_value_to_host_value(error)),
                }
            }
            Err(exception) => {
                tracing::error!(target: "@user", "Perform failed unexpectedly: {}", exception);

                tracing::debug!(perform_metrics = ?metrics_data);
                crate::observability::log_metric!(
                    Perform
                    success = false,
                    profile = metrics_data.get_profile().as_ref(),
                    profile_url = metrics_data.profile_url,
                    profile_content_hash = metrics_data.profile_content_hash,
                    provider = metrics_data.get_provider(),
                    provider_url = metrics_data.provider_url,
                    provider_content_hash = metrics_data.provider_content_hash,
                    map_url = metrics_data.map_url,
                    map_content_hash = metrics_data.map_content_hash
                );

                set_perform_output_exception(exception)
            }
        }
    }

    fn perform_impl<'metrics, 'me: 'metrics>(
        &'me mut self,
        perform_input: PerformInput,
        metrics_data: &'metrics mut PerformMetricsData<'me>,
    ) -> Result<Result<MapValue, MapValue>, PerformException> {
        // first cache documents
        self.profile_cache
            .cache(&perform_input.profile_url, ProfileCacheEntry::from_data)?;
        self.provider_cache.cache(
            &perform_input.provider_url,
            ProviderJsonCacheEntry::from_data,
        )?;
        self.map_cache.cache(&perform_input.map_url, |data| {
            // TODO: this is temporary, should be extracted from the map manifest
            let file_name = perform_input.map_url.split('/').last().unwrap().to_string();

            MapCacheEntry::new(data, file_name)
        })?;

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

        // Validate parameters values against json schema
        self.parameters_validator
            .validate(&(&perform_input.map_parameters).into())
            .map_err(|err| {
                PerformException::from_json_schema_validation_error(
                    err,
                    Some("Parameters".to_string().as_ref()),
                )
            })?;

        let mut map_parameters = match perform_input.map_parameters {
            HostValue::Object(o) => MapValueObject::from_iter(
                o.into_iter()
                    .map(|(k, v)| (k, self.host_value_to_map_value(v))),
            ),
            HostValue::None => MapValueObject::new(),
            _ => unreachable!("Object or None ensured with JSON Schema validation"),
        };

        // Validate security values against json schema
        self.security_validator
            .validate(&(&perform_input.map_security).into())
            .map_err(|err| {
                PerformException::from_json_schema_validation_error(
                    err,
                    Some("Security".to_string().as_ref()),
                )
            })?;

        // parse provider json
        let (provider_url, provider_entry) = self
            .provider_cache
            .get_key_value(&perform_input.provider_url)
            .unwrap();
        // TODO: validate provider json with json schema, to verify OneClient will understand it?

        metrics_data.provider_url = provider_url;
        metrics_data.provider_content_hash = Some(&provider_entry.content_hash);
        metrics_data.provider = Some(&provider_entry.provider_json.name);

        // process provider and combine with inputs
        let mut provider_parameters = prepare_provider_parameters(&provider_entry.provider_json);
        provider_parameters.append(&mut map_parameters);
        let map_parameters = provider_parameters;
        let map_security =
            prepare_security_map(&provider_entry.provider_json, &perform_input.map_security)?;
        let map_services = prepare_services_map(&provider_entry.provider_json, &map_parameters)?;

        let (profile_url, profile_entry) = self
            .profile_cache
            .get_key_value(&perform_input.profile_url)
            .unwrap();
        metrics_data.profile_url = profile_url;
        metrics_data.profile_content_hash = Some(&profile_entry.content_hash);

        // start interpreting stdlib and then map code
        // TODO: should this be here or should we hold an instance of the interpreter in global state
        // and clear per-perform data each time it is called?
        let mut interpreter = JsInterpreter::new(MapStdImpl::new(self.mapstd_config.to_owned()))?;
        interpreter.eval_code("map_std.js", Self::MAP_STDLIB_JS)?;

        let (map_url, map_entry) = self
            .map_cache
            .get_key_value(&perform_input.map_url)
            .unwrap();
        metrics_data.map_url = map_url;
        metrics_data.map_content_hash = Some(&map_entry.content_hash);

        let map_result = {
            interpreter.state_mut().set_context(
                map_std::map_value!({
                    "input": map_input,
                    "parameters": MapValue::Object(map_parameters),
                    "services": map_services
                }),
                Some(map_security),
            );
            interpreter.run(&map_entry.file_name, &map_entry.map, &perform_input.usecase)?;

            interpreter.state_mut().take_output().unwrap()
        };

        Ok(map_result)
    }
}
