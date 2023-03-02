use std::collections::HashMap;

pub mod abi;
pub mod core_to_map;
pub mod host_to_core;

// TODO: consider making the key always lowercase
pub type HeadersMultiMap = HashMap<String, Vec<String>>;
