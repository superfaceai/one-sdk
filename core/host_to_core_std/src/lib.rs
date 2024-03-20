//! # Host <-> Core communication
//!
//! This can be understood as the standard library provided by Host to the Core.

use std::collections::HashMap;

pub use wasm_abi as abi;

pub mod fmt;
#[cfg(feature = "global_exchange")]
pub mod global_exchange;
pub mod unstable;

pub type MultiMap<K = String, V = String> = HashMap<K, Vec<V>>;
pub type HeadersMultiMap = MultiMap<HeaderName, HeaderValue>;
pub type HeaderValue = String;

#[derive(Debug, Clone, Hash)]
pub struct HeaderName(String);
impl HeaderName {
    pub fn new(value: String) -> HeaderName {
        HeaderName(value)
    }
    pub fn lowercase_chars(&self) -> impl Iterator<Item = char> + '_ {
        self.0.chars().flat_map(|c| c.to_lowercase())
    }
}
impl PartialEq for HeaderName {
    fn eq(&self, other: &Self) -> bool {
        let left = self.lowercase_chars();
        let right = other.lowercase_chars();
        left.eq(right)
    }
}
impl Eq for HeaderName {}
impl std::fmt::Display for HeaderName {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}
impl From<&str> for HeaderName {
    fn from(value: &str) -> Self {
        HeaderName(value.to_string())
    }
}
impl serde::Serialize for HeaderName {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        self.0.serialize(serializer)
    }
}
impl<'de> serde::Deserialize<'de> for HeaderName {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        Ok(HeaderName(value))
    }
}

pub fn lowercase_headers_multimap(map: HeadersMultiMap) -> HeadersMultiMap {
    map.into_iter()
        .map(|(key, value)| (HeaderName(key.lowercase_chars().collect()), value))
        .collect()
}

pub fn encode_query(query: &MultiMap) -> String {
    let mut pairs = Vec::<(&str, &str)>::new();

    for (key, values) in query.iter() {
        for value in values {
            pairs.push((key, value));
        }
    }

    serde_urlencoded::to_string(&pairs).unwrap()
}
