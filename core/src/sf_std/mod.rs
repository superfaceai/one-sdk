use std::collections::HashMap;

pub mod abi;
pub mod core_to_map;
pub mod host_to_core;

pub type MultiMap = HashMap<String, Vec<String>>;
// TODO: consider making the key always lowercase
pub type HeadersMultiMap = MultiMap;

pub fn encode_query(query: &MultiMap) -> String {
    let mut pairs = Vec::<(&str, &str)>::new();

    for (key, values) in query.iter() {
        for value in values {
            pairs.push((key, value));
        }
    }

    serde_urlencoded::to_string(&pairs).unwrap()
}
