//! Unstable functions provide no stability guarantees

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use super::{
    abi::{MessageFn, StreamFn},
    MessageExchange,
};
use crate::sf_std::abi::{PairRepr, Ptr, ResultRepr, Size};

pub mod fs;
pub mod http;
pub mod perform;

/// Similar to [serde_json::Value], it is able to represent any value passed in as input or output.
///
/// In addition to variants in [serde_json::Value] we also define our custom types, such as streams.
///
/// Our custom types are always objects with one field: `{ "$StructuredValue::<type>": <type_serialized> }`
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
    Array(Vec<HostValue>),
    // serde_json::Value::Object is backed by BTreeMap by default
    Object(BTreeMap<String, HostValue>),
}
impl HostValue {
    const CUSTOM_TYPE_STREAM: &'static str = "$StructuredValue::Stream";
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

//////////////
// MESSAGES //
//////////////

// SAFETY: We choose to trust this FFI.
const EXCHANGE_MESSAGE: MessageFn = unsafe {
    MessageFn::new(
        __import_message_exchange,
        __import_message_exchange_retrieve,
    )
};
#[cfg(not(test))]
#[link(wasm_import_module = "sf_host_unstable")]
extern "C" {
    #[link_name = "message_exchange"]
    fn __import_message_exchange(
        msg_ptr: Ptr,
        msg_len: Size,
        out_ptr: Ptr,
        out_len: Size,
    ) -> PairRepr;

    #[link_name = "message_exchange_retrieve"]
    fn __import_message_exchange_retrieve(handle: Size, out_ptr: Ptr, out_len: Size) -> ResultRepr;
}
// this is impractical but the imports don't get stripped when we are testing cdylib, so we stub them out
#[cfg(test)]
extern "C" fn __import_message_exchange(
    _msg_ptr: Ptr,
    _msg_len: Size,
    _out_ptr: Ptr,
    _out_len: Size,
) -> PairRepr {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_message_exchange_retrieve(
    _handle: Size,
    _out_ptr: Ptr,
    _out_len: Size,
) -> ResultRepr {
    unreachable!()
}

/////////////
// STREMAS //
/////////////

/// Stream which can be read from or written to.
///
/// Not all streams can be both read from and written to, those will return an error.
#[derive(Debug, PartialEq, Eq)]
pub struct IoStream(usize);
impl IoStream {
    pub(in crate::sf_std) fn from_raw_handle(handle: usize) -> Self {
        Self(handle)
    }

    // pub(in crate::sf_std) fn to_raw_handle(&self) -> usize {
    //     self.0
    // }
}
impl std::io::Read for IoStream {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        STREAM_IO.read(self.0, buf)
    }
}
impl std::io::Write for IoStream {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        STREAM_IO.write(self.0, buf)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        // this is a no-op right now
        Ok(())
    }
}
impl Drop for IoStream {
    fn drop(&mut self) {
        STREAM_IO.close(self.0).unwrap()
    }
}
impl Serialize for IoStream {
    fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
        self.0.serialize(ser)
    }
}
impl<'de> Deserialize<'de> for IoStream {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<IoStream, D::Error> {
        usize::deserialize(de).map(IoStream::from_raw_handle)
    }
}

// SAFETY: We choose to trust this FFI.
const STREAM_IO: StreamFn = unsafe {
    StreamFn::new(
        __import_stream_read,
        __import_stream_write,
        __import_stream_close,
    )
};

#[cfg(not(test))]
#[link(wasm_import_module = "sf_host_unstable")]
extern "C" {
    #[link_name = "stream_read"]
    fn __import_stream_read(handle: Size, out_ptr: Ptr, out_len: Size) -> ResultRepr;

    #[link_name = "stream_write"]
    fn __import_stream_write(handle: Size, in_ptr: Ptr, in_len: Size) -> ResultRepr;

    #[link_name = "stream_close"]
    fn __import_stream_close(handle: Size) -> ResultRepr;
}
// this is impractical but the imports don't get stripped when we are testing cdylib, so we stub them out
#[cfg(test)]
extern "C" fn __import_stream_read(_handle: Size, _out_ptr: Ptr, _out_len: Size) -> ResultRepr {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_stream_write(_handle: Size, _in_ptr: Ptr, _in_len: Size) -> ResultRepr {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_stream_close(handle: Size) -> ResultRepr {
    use crate::sf_std::abi::AbiResult;
    // this is actually called in tests which construct IoStreams, so we always succeed here
    // TODO: this should possibly be configurable on per-test basis
    assert_ne!(handle, 0);
    AbiResult::Ok(0).into()
}

#[cfg(test)]
mod test {
    use serde_json::json;

    use super::{HostValue, IoStream};

    // TODO: if this macro is needed outside of tests we can move it to the above module
    macro_rules! host_value_object {
        (
            $(
                $key: expr => $value: expr
            ),* $(,)?
        ) => {
            {
                let mut values = std::collections::BTreeMap::new();
                $(
                    values.insert($key.to_string(), $value);
                )+
                HostValue::Object(values)
            }
        }
    }

    #[test]
    fn test_json_structured_data() {
        let actual_json = json!({
            "none": null,
            "bool": false,
            "number_int": -123,
            "number_float": 0.123,
            "string": "this is a string",
            "array": [1, [2.0, true], { "a": "foo", "b": "bar" }],
            "object": {
                "none2": null,
                "boolean": true,
                "stream2": { "$StructuredValue::Stream": 123 }
            },
            "stream": { "$StructuredValue::Stream": 45 }
        });

        let actual: HostValue = serde_json::from_value(actual_json.clone()).unwrap();

        assert_eq!(
            actual,
            host_value_object! {
                "none" => HostValue::None,
                "bool" => HostValue::Bool(false),
                "number_int" => HostValue::Number(serde_json::Number::from(-123)),
                "number_float" => HostValue::Number(serde_json::Number::from_f64(0.123).unwrap()),
                "string" => HostValue::String("this is a string".to_string()),
                "array" => HostValue::Array(vec![
                    HostValue::Number(1.into()),
                    HostValue::Array(vec![HostValue::Number(serde_json::Number::from_f64(2.0).unwrap()), HostValue::Bool(true)]),
                    host_value_object! {
                        "a" => HostValue::String("foo".to_string()),
                        "b" => HostValue::String("bar".to_string())
                    }
                ]),
                "object" => host_value_object! {
                    "none2" => HostValue::None,
                    "boolean" => HostValue::Bool(true),
                    "stream2" => HostValue::Stream(IoStream::from_raw_handle(123))
                },
                "stream" => HostValue::Stream(IoStream::from_raw_handle(45))
            }
        );

        let actual_json_again = serde_json::to_value(actual).unwrap();
        assert_eq!(actual_json_again, actual_json);
    }
}
