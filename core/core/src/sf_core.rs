use std::{
    collections::HashMap,
    io::Read,
    time::{Duration, Instant},
};

use anyhow::Context;

use sf_std::unstable::{
    fs::OpenOptions,
    http::HttpRequest,
    perform::{perform_input, perform_output, PerformOutput},
};

use interpreter_js::JsInterpreter;
use map_std::MapInterpreter;

struct MapCacheEntry {
    store_time: Instant,
    map: Vec<u8>,
}
pub struct SuperfaceCore {
    map_cache: HashMap<String, MapCacheEntry>,
}
impl SuperfaceCore {
    const MAX_CACHE_TIME: Duration = Duration::from_secs(3);

    // TODO: Use thiserror and define specific errors
    pub fn new() -> anyhow::Result<Self> {
        Ok(Self {
            map_cache: HashMap::new(),
        })
    }

    fn cache_map(&mut self, map_name: &str) -> anyhow::Result<()> {
        match self.map_cache.get(map_name) {
            Some(MapCacheEntry { store_time, .. })
                if store_time.elapsed() <= Self::MAX_CACHE_TIME =>
            {
                return Ok(())
            }
            _ => (),
        }

        let mut map = Vec::with_capacity(16 * 1024);
        match map_name.strip_prefix("file://") {
            Some(path) => {
                let mut file = OpenOptions::new()
                    .read(true)
                    .open(&path)
                    .context("Failed to open map file")?;

                file.read_to_end(&mut map)
                    .context("Failed to read map file")?;
            }
            None => {
                // TODO: better url join
                let url_base =
                    std::env::var("SF_REGISTRY_URL").unwrap_or("http://localhost:8321".to_string());
                let url = format!("{}/{}.js", url_base, map_name);

                let mut response =
                    HttpRequest::fetch("GET", &url, &Default::default(), &Default::default(), None)
                        .context("Failed to retrieve map over HTTP")?
                        .into_response()
                        .context("Failed to retrieve response")?;
                response
                    .body()
                    .read_to_end(&mut map)
                    .context("Failed to read response body")?;
            }
        };

        self.map_cache.insert(
            map_name.to_string(),
            MapCacheEntry {
                store_time: Instant::now(),
                map,
            },
        );
        Ok(())
    }

    // TODO: Use thiserror and define specific errors
    pub fn perform(&mut self) -> anyhow::Result<()> {
        let perform_input = perform_input();

        self.cache_map(&perform_input.map_name)
            .context("Failed to cache map")?;
        let wasm = self
            .map_cache
            .get(&perform_input.map_name)
            .unwrap()
            .map
            .as_slice();

        // TODO: should this be here or should we hold an instance of the interpreter in global state
        // and clear per-perform data each time it is called?
        let mut interpreter = {
            let replacement_std = match std::env::var("SF_REPLACE_MAP_STDLIB").ok() {
                None => None,
                Some(path) => {
                    let mut file = OpenOptions::new()
                        .read(true)
                        .open(&path)
                        .context("Failed to open map stdlib file")?;

                    let mut string = String::new();
                    file.read_to_string(&mut string)
                        .context("Failed to open map stdlib file")?;

                    Some(string)
                }
            };

            JsInterpreter::new(replacement_std.as_deref())
                .context("Failed to initialize interpreter")?
        };

        let map_result = interpreter
            .run(
                wasm,
                &perform_input.map_usecase,
                perform_input.map_input,
                perform_input.map_parameters,
                perform_input.map_security,
            )
            .context(format!(
                "Failed to run map \"{}::{}\"",
                perform_input.map_name, perform_input.map_usecase
            ))?;

        perform_output(PerformOutput { map_result });

        Ok(())
    }
}