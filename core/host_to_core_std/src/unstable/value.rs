use std::collections::{BTreeMap, HashMap};

use serde::{Deserialize, Serialize};

use super::IoStream;

/// Similar to [serde_json::Value], it is able to represent any value passed in as input or output.
///
/// In addition to variants in [serde_json::Value] we also define our custom types, such as streams.
///
/// Our custom types are always objects with one field: `{ "$HostValue::<type>": <type_serialized> }`
#[derive(Debug, PartialEq, Eq)]
pub enum HostValue {
    // custom
    Stream(IoStream),
    // standard
    None,
    Bool(bool),
    // We use serde_json Number type, no reason to redefine it
    Number(serde_json::Number),
    String(String),
    Array(Vec<Self>),
    // serde_json::Value::Object is backed by BTreeMap by default
    Object(BTreeMap<String, Self>),
}
impl HostValue {
    const CUSTOM_TYPE_STREAM: &'static str = "$HostValue::Stream";
}
impl Serialize for HostValue {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        // see file serde_json/src/value/ser.rs:14
        use serde::ser::SerializeMap;

        match self {
            Self::Stream(stream) => {
                let mut map = serializer.serialize_map(Some(2))?;
                map.serialize_entry(Self::CUSTOM_TYPE_STREAM, stream)?;
                map.end()
            }
            Self::None => serializer.serialize_unit(),
            Self::Bool(b) => serializer.serialize_bool(*b),
            Self::Number(n) => n.serialize(serializer),
            Self::String(s) => serializer.serialize_str(s),
            Self::Array(v) => v.serialize(serializer),
            Self::Object(m) => {
                // start serializing the map, and we know the length
                let mut map = serializer.serialize_map(Some(m.len()))?;
                for (key, value) in m {
                    map.serialize_entry(key, value)?;
                }
                map.end()
            }
        }
    }
}
impl<'de> Deserialize<'de> for HostValue {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        // see file serde_json/src/value/de.rs:22
        use serde::de::{MapAccess, SeqAccess, Visitor};
        use std::fmt;

        struct ValueVisitor;
        impl<'de> Visitor<'de> for ValueVisitor {
            type Value = HostValue;

            fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
                write!(f, "any valid JSON value or one of custom types")
            }

            #[inline]
            fn visit_bool<E>(self, value: bool) -> Result<HostValue, E> {
                Ok(HostValue::Bool(value))
            }

            #[inline]
            fn visit_i64<E>(self, value: i64) -> Result<HostValue, E> {
                Ok(HostValue::Number(value.into()))
            }
            #[inline]
            fn visit_u64<E>(self, value: u64) -> Result<HostValue, E> {
                Ok(HostValue::Number(value.into()))
            }
            #[inline]
            fn visit_f64<E>(self, value: f64) -> Result<HostValue, E> {
                Ok(serde_json::Number::from_f64(value).map_or(HostValue::None, HostValue::Number))
            }

            #[inline]
            fn visit_str<E: serde::de::Error>(self, value: &str) -> Result<HostValue, E> {
                self.visit_string(String::from(value))
            }
            #[inline]
            fn visit_string<E>(self, value: String) -> Result<HostValue, E> {
                Ok(HostValue::String(value))
            }

            #[inline]
            fn visit_none<E>(self) -> Result<HostValue, E> {
                Ok(HostValue::None)
            }
            #[inline]
            fn visit_unit<E>(self) -> Result<HostValue, E> {
                Ok(HostValue::None)
            }

            #[inline]
            fn visit_some<D: serde::Deserializer<'de>>(
                self,
                deserializer: D,
            ) -> Result<HostValue, D::Error> {
                Deserialize::deserialize(deserializer)
            }

            #[inline]
            fn visit_seq<V: SeqAccess<'de>>(self, mut visitor: V) -> Result<HostValue, V::Error> {
                let mut vec = Vec::new();

                while let Some(elem) = visitor.next_element()? {
                    vec.push(elem);
                }

                Ok(HostValue::Array(vec))
            }

            fn visit_map<V: MapAccess<'de>>(self, mut visitor: V) -> Result<HostValue, V::Error> {
                let values = match visitor.next_key::<String>()? {
                    None => BTreeMap::new(),
                    Some(key) if key == HostValue::CUSTOM_TYPE_STREAM => {
                        let stream: IoStream = visitor.next_value()?;

                        return Ok(HostValue::Stream(stream));
                    }
                    Some(first_key) => {
                        let mut values = BTreeMap::new();

                        values.insert(first_key, visitor.next_value()?);
                        while let Some((key, value)) = visitor.next_entry()? {
                            values.insert(key, value);
                        }

                        values
                    }
                };

                Ok(HostValue::Object(values))
            }
        }

        deserializer.deserialize_any(ValueVisitor)
    }
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum SecurityValue {
    ApiKey { apikey: String },
    Basic { user: String, password: String },
    Bearer { token: String },
}

pub type SecurityValuesMap = HashMap<String, SecurityValue>;
