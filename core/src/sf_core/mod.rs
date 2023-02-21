use std::{
    collections::HashMap,
    io::Read,
    time::{Duration, Instant},
};

use anyhow::Context;

use crate::sf_std::host_to_core::unstable::{
    fs::OpenOptions,
    perform::{perform_input, perform_output, PerformOutput},
};

mod interpreter;
use interpreter::Interpreter;

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

        let file_name = format!("integration/wasm/{}.wasm", map_name);

        let mut bytes = Vec::new();
        let mut file = OpenOptions::new()
            .read(true)
            .open(&file_name)
            .context("Failed to open input file")?;
        file.read_to_end(&mut bytes)
            .context("Failed to read input file")?;

        self.map_cache.insert(
            map_name.to_string(),
            MapCacheEntry {
                store_time: Instant::now(),
                map: bytes,
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
        let mut interpreter = Interpreter::new().context("Failed to initialize interpreter")?;

        let entry_name = format!("sf_entry_{}", perform_input.map_name);
        let map_result = interpreter
            .run(wasm, entry_name.as_str(), perform_input.map_input)
            .context(format!("Failed to run map \"{}\"", entry_name))?;

        perform_output(PerformOutput { map_result });

        Ok(())
    }
}
