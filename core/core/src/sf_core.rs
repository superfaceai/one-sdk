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
    HostValue,
};

use interpreter_js::JsInterpreter;
use map_std::{unstable::MapValue, MapInterpreter};
use tracing::instrument;

use crate::profile_validator::ProfileValidator;

struct DocumentCacheEntry {
    store_time: Instant,
    data: Vec<u8>,
}
impl std::fmt::Debug for DocumentCacheEntry {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("MapCacheEntry")
            .field("store_time", &self.store_time)
            .field("data", &format!("<{} bytes>", self.data.len()))
            .finish()
    }
}

#[derive(Debug)]
pub struct SuperfaceCore {
    document_cache: HashMap<String, DocumentCacheEntry>,
}
impl SuperfaceCore {
    const MAP_STDLIB_JS: &str = include_str!("../assets/js/map_std.js");

    const MAX_CACHE_TIME: Duration = Duration::from_secs(3);

    // TODO: Use thiserror and define specific errors
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            document_cache: HashMap::new(),
        })
    }

    fn cache_document(&mut self, url: &str) -> anyhow::Result<()> {
        match self.document_cache.get(url) {
            Some(DocumentCacheEntry { store_time, .. })
                if store_time.elapsed() <= Self::MAX_CACHE_TIME =>
            {
                return Ok(())
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
            data = base64::engine::general_purpose::STANDARD.decode(data_base64).unwrap();
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

    fn host_value_to_hash_map(value: HostValue) -> HashMap<String, String> {
        match value {
            HostValue::None => HashMap::new(),
            HostValue::Object(o) => o
                .into_iter()
                .map(|(k, v)| match v {
                    HostValue::String(s) => (k, String::from(s)),
                    _ => panic!("Expected HostValue::String"),
                })
                .collect(),
            _ => panic!("Expected HostValue::Object or HostValue::None"),
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
        self.cache_document(&perform_input.map_url)
            .context("Failed to cache map")?;

        let map_input = self.host_value_to_map_value(perform_input.map_input);
        let map_vars = self.host_value_to_map_value(perform_input.map_vars); // TODO yes MapValue but limited to None and Object
        let map_secrets = Self::host_value_to_hash_map(perform_input.map_secrets);

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
                map_vars,
                map_secrets,
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
