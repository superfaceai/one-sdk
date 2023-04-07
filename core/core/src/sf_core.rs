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

struct MapCacheEntry {
    store_time: Instant,
    map: Vec<u8>,
}
impl std::fmt::Debug for MapCacheEntry {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("MapCacheEntry")
            .field("store_time", &self.store_time)
            .field("map", &format!("<{} bytes>", self.map.len()))
            .finish()
    }
}

#[derive(Debug)]
pub struct SuperfaceCore {
    map_cache: HashMap<String, MapCacheEntry>,
}
impl SuperfaceCore {
    const MAP_STDLIB_JS: &str = include_str!("../assets/js/map_std.js");

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

    /// Converts HostValue into MapValue.
    ///
    /// For primitive types this is a simple move. For custom types with drop code this might include adding
    /// reference counting and registering handles.
    fn host_value_to_map_value(&mut self, value: HostValue) -> MapValue {
        match value {
            HostValue::Stream(_) => todo!(),
            HostValue::None => MapValue::Null,
            HostValue::Bool(b) => MapValue::Bool(b),
            HostValue::Number(n) => MapValue::Number(n),
            HostValue::String(s) => MapValue::String(s),
            HostValue::Array(a) => MapValue::Array(
                a.into_iter()
                    .map(|v| self.host_value_to_map_value(v))
                    .collect(),
            ),
            HostValue::Object(o) => {
                let mut res = MapValue::Object(Default::default());
                res.as_object_mut().unwrap().extend(
                    o.into_iter()
                        .map(|(k, v)| (k, self.host_value_to_map_value(v))),
                );

                res
            }
        }
    }

    /// Converts MapValue into HostValue.
    ///
    /// This is the opposite action to [host_value_to_map_value].
    fn map_value_to_host_value(&mut self, value: MapValue) -> HostValue {
        match value {
            MapValue::Null => HostValue::None,
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
    pub fn periodic(&mut self) -> anyhow::Result<()> {
        tracing::trace!("periodic invoked");
        Ok(())
    }

    // TODO: Use thiserror and define specific errors
    pub fn perform(&mut self) -> anyhow::Result<()> {
        let perform_input = perform_input();

        self.cache_map(&perform_input.map_name)
            .context("Failed to cache map")?;

        let map_input = self.host_value_to_map_value(perform_input.map_input);
        let map_parameters = self.host_value_to_map_value(perform_input.map_parameters);
        let map_security = self.host_value_to_map_value(perform_input.map_security);

        let mut profile_validator = ProfileValidator::new(r#"
        """
        Points of Interest
        Find points of interest near the given location using a map service.
        """
        name = "navigation/nearby-poi"
        version = "1.0.1"
        
        """
        Find nearby points of interest
        Find points of interest near the given location.
        """
        usecase NearbyPoi {
            input {
                """
                center
                Center of the search
                """
                center! Coordinates!
                
                """
                radius
                Radius of the search
                """
                radius! number!
                
                """
                categories
                Optional categories filter
                Points belonging to at least one of these categories are returned
                """
                categories [InterestCategory!]
            }
        
            result [
                {
                    "Coordinates of this point"
                    coordinates! Coordinates!
                    "Name of the point of interest"
                    name! string!
                    "Categories this point belongs to"
                    categories! [InterestCategory!]
                }
            ]
        
            error {
                "Human-readable status description"
                status! string!
                "Human-readable error message"
                message! string!
            }
        
          example success {
            input {
              center = {
                latitude = 51.477,
                longitude = 0.0,
              },
              radius = 100,
              categories = ['CAFE'],
            }
          
        
          result [{
              categories = [
                'CAFE',
              ],
              coordinates = {
                latitude = 51.476838,
                longitude = -0.0006877,
              },
              name = "2738840351",
            }
          ]
        }
        
          example failed {
            input {
              center = {
                latitude = 589.477,
                longitude = 998.0,
              },
              radius = 10
            }
        
            error {
              status = "Not Found",
              message = "Invalid parameters"
            }
          }
        }
        
        model Coordinates {
            latitude! number!
            longitude! number!
        }
        
        model InterestCategory enum {
            RESTAURANT,
            CAFE,
            BAR,
          SCHOOL,
          TAXI,
          POST,
          POLICE,
          HEALTHCARE,
          BANK,
          ATM,
          PARKING
        }
        "#.to_string())
            .context("Failed to initialize profile validator")?;
        profile_validator.validate_input(map_input.clone()).unwrap();

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

        let map_code = self
            .map_cache
            .get(&perform_input.map_name)
            .unwrap()
            .map
            .as_slice();
        let map_result = interpreter
            .run(
                map_code,
                &perform_input.map_usecase,
                map_input,
                map_parameters,
                map_security,
            )
            .context(format!(
                "Failed to run map \"{}::{}\"",
                perform_input.map_name, perform_input.map_usecase
            ))?;

        profile_validator.validate_output(map_result.clone()).unwrap();
        let map_result = map_result
            .map(|v| self.map_value_to_host_value(v))
            .map_err(|v| self.map_value_to_host_value(v))
        ;
        perform_output(PerformOutput { map_result });

        Ok(())
    }
}
