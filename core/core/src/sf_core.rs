use std::{
    collections::{BTreeMap, HashMap},
    io::Read,
    time::{Duration, Instant},
};

use anyhow::Context;

use sf_std::unstable::{
    fs::{self, OpenOptions},
    http::HttpRequest,
    perform::{perform_input, perform_output, PerformOutput},
    provider::ProviderJson,
    HostValue,
};

use interpreter_js::JsInterpreter;
use map_std::{
    unstable::{
        security::{prepare_provider_parameters, prepare_security_map},
        services::prepare_services_map,
        MapValue, MapValueObject,
    },
    MapInterpreter,
};
use tracing::instrument;

// use crate::profile_validator::ProfileValidator;

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
pub struct SuperfaceCore {
    document_cache: HashMap<String, DocumentCacheEntry>,
}
impl SuperfaceCore {
    const MAP_STDLIB_JS: &str = include_str!("../assets/js/map_std.js");

    // TODO: this is only illustrative - should be configurable from the host and possbily separately for each document
    const MAX_CACHE_TIME: Duration = Duration::from_secs(3);

    // TODO: Use thiserror and define specific errors
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            document_cache: HashMap::new(),
        })
    }

    fn cache_document(&mut self, url: &str) -> anyhow::Result<()> {
        let _span = tracing::span!(tracing::Level::DEBUG, "cache_document");
        let _span = _span.enter();

        tracing::debug!(url);
        match self.document_cache.get(url) {
            Some(DocumentCacheEntry { store_time, .. })
                if store_time.elapsed() <= Self::MAX_CACHE_TIME =>
            {
                tracing::debug!("already cached");
                return Ok(());
            }
            _ => (),
        }

        let mut data = Vec::with_capacity(16 * 1024);
        if let Some(path) = url.strip_prefix("file://") {
            let mut file = OpenOptions::new()
                .read(true)
                .open(&path)
                .context("Failed to open map file")?;

            file.read_to_end(&mut data)
                .context("Failed to read map file")?;
        } else if url.starts_with("https://") || url.starts_with("http://") {
            let mut response =
                HttpRequest::fetch("GET", &url, &Default::default(), &Default::default(), None)
                    .context("Failed to retrieve map over HTTP")?
                    .into_response()
                    .context("Failed to retrieve response")?;
            response
                .body()
                .read_to_end(&mut data)
                .context("Failed to read response body")?;
        } else if let Some(data_base64) = url.strip_prefix("data:;base64,") {
            // TODO: just hacking it in here
            use base64::Engine;
            data = base64::engine::general_purpose::STANDARD
                .decode(data_base64)
                .unwrap();
        } else {
            // TODO: better url join
            let url_base =
                std::env::var("SF_REGISTRY_URL").unwrap_or("http://localhost:8321".to_string());
            let url = format!("{}/{}.js", url_base, url);

            let mut response =
                HttpRequest::fetch("GET", &url, &Default::default(), &Default::default(), None)
                    .context("Failed to retrieve map over HTTP")?
                    .into_response()
                    .context("Failed to retrieve response")?;
            response
                .body()
                .read_to_end(&mut data)
                .context("Failed to read response body")?;
        }

        tracing::trace!("bytes: {:?}", data);
        if tracing::enabled!(tracing::Level::DEBUG) {
            if let Ok(utf8) = std::str::from_utf8(&data) {
                tracing::debug!(utf8);
            }
        }

        self.document_cache.insert(
            url.to_string(),
            DocumentCacheEntry {
                store_time: Instant::now(),
                data,
            },
        );
        Ok(())
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

    // TODO: use thiserror
    #[instrument(level = "Trace")]
    pub fn send_metrics(&mut self) -> anyhow::Result<()> {
        tracing::trace!("send metrics");
        Ok(())
    }

    // TODO: Use thiserror and define specific errors
    pub fn perform(&mut self) -> anyhow::Result<()> {
        let perform_input = perform_input();

        self.cache_document(&perform_input.profile_url)
            .context("Failed to cache profile")?;
        self.cache_document(&perform_input.provider_url)
            .context("Failed to cache provider")?;
        self.cache_document(&perform_input.map_url)
            .context("Failed to cache map")?;

        let map_input = self.host_value_to_map_value(perform_input.map_input);
        let mut map_parameters = match perform_input.map_parameters {
            HostValue::Object(o) => MapValueObject::from_iter(
                o.into_iter()
                    .map(|(k, v)| (k, self.host_value_to_map_value(v))),
            ),
            HostValue::None => MapValueObject::new(),
            _ => anyhow::bail!("Parameters must be an Object or None"),
        };

        let provider_json = &self
            .document_cache
            .get(&perform_input.provider_url)
            .unwrap()
            .data;
        let provider_json = match serde_json::from_slice::<ProviderJson>(provider_json) {
            Err(err) => {
                tracing::error!("Failed to deserialize provider JSON: {:#}", err);
                panic!("Failed to deserialize provider JSON: {}", err);
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
        let mut interpreter = JsInterpreter::new().context("Failed to initialize interpreter")?;
        // here we allow runtime stdlib replacement for development purposes
        // this might be removed in the future
        match std::env::var("SF_REPLACE_MAP_STDLIB").ok() {
            None => interpreter.eval_code("map_std.js", Self::MAP_STDLIB_JS),
            Some(path) => {
                let replacement =
                    fs::read_to_string(&path).context("Failed to load replacement map_std")?;
                interpreter.eval_code(&path, &replacement)
            }
        }
        .context("Failed to evaluate map stdlib code")?;

        let map_code = &self
            .document_cache
            .get(&perform_input.map_url)
            .unwrap()
            .data
            .as_slice();

        let map_result = interpreter
            .run(
                map_code,
                &perform_input.usecase,
                map_input,
                MapValue::Object(map_parameters),
                map_services,
                map_security,
            )
            .context(format!(
                "Failed to run map \"{}::{}\"",
                perform_input.map_url, perform_input.usecase
            ))?;

        // if let Err(err) = profile_validator.validate_output(map_result.clone()) {
        //     tracing::error!("Output validation error: {}", err);
        // }
        let map_result = map_result
            .map(|v| self.map_value_to_host_value(v))
            .map_err(|v| self.map_value_to_host_value(v));
        perform_output(PerformOutput { map_result });

        Ok(())
    }
}
