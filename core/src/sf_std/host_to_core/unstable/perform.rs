use std::collections::BTreeMap;

use serde::{ser::SerializeMap, Deserialize, Serialize};

use super::{IoStream, EXCHANGE_MESSAGE};

define_exchange! {
    struct InPerformInput {
        kind: "perform-input"
    } -> enum OutPerformInput {
        Ok {
            map_name: String,
            map_input: StructuredValue
        }
    }
}

define_exchange! {
    struct InPerformOutput {
        kind: "perform-output",
        map_result: StructuredValue
    } -> enum OutPerformOutput {
        Ok
    }
}

pub struct PerformInput {
    pub map_name: String,
    pub map_input: StructuredValue,
}
pub fn perform_input() -> PerformInput {
    let response = InPerformInput {
        kind: InPerformInput::KIND,
    }
    .send_json(&EXCHANGE_MESSAGE)
    .unwrap();

    match response {
        OutPerformInput::Ok {
            map_name,
            map_input,
        } => PerformInput {
            map_name,
            map_input: map_input,
        },
    }
}

pub struct PerformOutput {
    pub map_result: StructuredValue,
}
pub fn perform_output(output: PerformOutput) {
    let response = InPerformOutput {
        kind: InPerformOutput::KIND,
        map_result: output.map_result,
    }
    .send_json(&EXCHANGE_MESSAGE)
    .unwrap();

    match response {
        OutPerformOutput::Ok => (),
    }
}

/// Similar to [serde_json::Value], it is able to represent any value passed in as input or output.
///
/// In addition to variants in [serde_json::Value] we also define our custom types, such as streams.
///
/// Our custom types are always objects with `__type` field signalling which type to parse. Any object with
/// `__type` key will be eligible to be parsed as one of our types.
#[derive(Debug, PartialEq, Eq)]
pub enum StructuredValue {
    // custom
    Stream(IoStream),
    // standard
    None,
    Bool(bool),
    // We use serde_json Number type, no reason to redefine it
    Number(serde_json::Number),
    String(String),
    Array(Vec<StructuredValue>),
    // serde_json::Value::Object is backed by BTreeMap by default
    Object(BTreeMap<String, StructuredValue>),
}
impl StructuredValue {
    const CUSTOM_TYPE_STREAM: &'static str = "$StructuredValue::Stream";
}
impl Serialize for StructuredValue {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        // see file serde_json/src/value/ser.rs:14

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
impl<'de> Deserialize<'de> for StructuredValue {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        // see file serde_json/src/value/de.rs:22
        use serde::de::{MapAccess, SeqAccess, Visitor};
        use std::fmt;

        struct ValueVisitor;
        impl<'de> Visitor<'de> for ValueVisitor {
            type Value = StructuredValue;

            fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
                write!(f, "any valid JSON value or one of custom types")
            }

            #[inline]
            fn visit_bool<E>(self, value: bool) -> Result<StructuredValue, E> {
                Ok(StructuredValue::Bool(value))
            }

            #[inline]
            fn visit_i64<E>(self, value: i64) -> Result<StructuredValue, E> {
                Ok(StructuredValue::Number(value.into()))
            }
            #[inline]
            fn visit_u64<E>(self, value: u64) -> Result<StructuredValue, E> {
                Ok(StructuredValue::Number(value.into()))
            }
            #[inline]
            fn visit_f64<E>(self, value: f64) -> Result<StructuredValue, E> {
                Ok(serde_json::Number::from_f64(value)
                    .map_or(StructuredValue::None, StructuredValue::Number))
            }

            #[inline]
            fn visit_str<E: serde::de::Error>(self, value: &str) -> Result<StructuredValue, E> {
                self.visit_string(String::from(value))
            }
            #[inline]
            fn visit_string<E>(self, value: String) -> Result<StructuredValue, E> {
                Ok(StructuredValue::String(value))
            }

            #[inline]
            fn visit_none<E>(self) -> Result<StructuredValue, E> {
                Ok(StructuredValue::None)
            }
            #[inline]
            fn visit_unit<E>(self) -> Result<StructuredValue, E> {
                Ok(StructuredValue::None)
            }

            #[inline]
            fn visit_some<D: serde::Deserializer<'de>>(
                self,
                deserializer: D,
            ) -> Result<StructuredValue, D::Error> {
                Deserialize::deserialize(deserializer)
            }

            #[inline]
            fn visit_seq<V: SeqAccess<'de>>(
                self,
                mut visitor: V,
            ) -> Result<StructuredValue, V::Error> {
                let mut vec = Vec::new();

                while let Some(elem) = visitor.next_element()? {
                    vec.push(elem);
                }

                Ok(StructuredValue::Array(vec))
            }

            fn visit_map<V: MapAccess<'de>>(
                self,
                mut visitor: V,
            ) -> Result<StructuredValue, V::Error> {
                let values = match visitor.next_key::<String>()? {
                    None => BTreeMap::new(),
                    Some(key) if key == StructuredValue::CUSTOM_TYPE_STREAM => {
                        let stream: IoStream = visitor.next_value()?;

                        return Ok(StructuredValue::Stream(stream));
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

                Ok(StructuredValue::Object(values))
            }
        }

        deserializer.deserialize_any(ValueVisitor)
    }
}

#[cfg(test)]
mod test {
    use serde_json::json;

    use super::{
        InPerformInput, InPerformOutput, IoStream, OutPerformInput, OutPerformOutput,
        StructuredValue,
    };

    #[test]
    fn test_message_in_perform_input() {
        let actual = serde_json::to_value(InPerformInput {
            kind: InPerformInput::KIND,
        })
        .unwrap();

        assert_eq!(
            serde_json::to_value(actual).unwrap(),
            json!({
                "kind": "perform-input"
            })
        )
    }

    #[test]
    fn test_message_out_perform_input() {
        let actual = json!({
            "kind": "ok",
            "map_name": "foo",
            "map_input": true
        });

        match serde_json::from_value::<OutPerformInput>(actual).unwrap() {
            OutPerformInput::Ok {
                map_name,
                map_input,
            } => {
                assert_eq!(map_name, "foo");
                assert_eq!(map_input, StructuredValue::Bool(true));
            }
        }
    }

    #[test]
    fn test_message_in_perform_output() {
        let actual = serde_json::to_value(InPerformOutput {
            kind: InPerformOutput::KIND,
            map_result: StructuredValue::String("hello".into()),
        })
        .unwrap();

        assert_eq!(
            serde_json::to_value(actual).unwrap(),
            json!({
                "kind": "perform-output",
                "map_result": "hello"
            })
        )
    }

    #[test]
    fn test_message_out_perform_output() {
        let actual = json!({
            "kind": "ok"
        });

        match serde_json::from_value::<OutPerformOutput>(actual).unwrap() {
            OutPerformOutput::Ok => (),
        }
    }

    // TODO: if this macro is needed outside of tests we can move it to the above module
    macro_rules! structured_value_object {
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
                StructuredValue::Object(values)
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

        let actual: StructuredValue = serde_json::from_value(actual_json.clone()).unwrap();

        assert_eq!(
            actual,
            structured_value_object! {
                "none" => StructuredValue::None,
                "bool" => StructuredValue::Bool(false),
                "number_int" => StructuredValue::Number(serde_json::Number::from(-123)),
                "number_float" => StructuredValue::Number(serde_json::Number::from_f64(0.123).unwrap()),
                "string" => StructuredValue::String("this is a string".to_string()),
                "array" => StructuredValue::Array(vec![
                    StructuredValue::Number(1.into()),
                    StructuredValue::Array(vec![StructuredValue::Number(serde_json::Number::from_f64(2.0).unwrap()), StructuredValue::Bool(true)]),
                    structured_value_object! {
                        "a" => StructuredValue::String("foo".to_string()),
                        "b" => StructuredValue::String("bar".to_string())
                    }
                ]),
                "object" => structured_value_object! {
                    "none2" => StructuredValue::None,
                    "boolean" => StructuredValue::Bool(true),
                    "stream2" => StructuredValue::Stream(IoStream::from_raw_handle(123))
                },
                "stream" => StructuredValue::Stream(IoStream::from_raw_handle(45))
            }
        );

        let actual_json_again = serde_json::to_value(actual).unwrap();
        assert_eq!(actual_json_again, actual_json);
    }
}
