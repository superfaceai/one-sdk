//! Unstable functions provide no stability guarantees

pub mod fs;
pub mod http;
pub mod perform;
pub mod provider;

mod value;
use serde::Deserialize;
use serde::Serialize;
pub use value::HostValue;
mod stream;
pub use stream::{IoStream, IoStreamHandle};

/// Host JS counterpart: host/javascript/src/common/app.ts
#[derive(Debug, Serialize, Deserialize)]
pub enum ErrorCode {
    #[serde(rename = "network:error")]
    NetworkError,
    #[serde(rename = "network:ECONNREFUSED")]
    NetworkConnectionRefused,
    #[serde(rename = "network:ENOTFOUND")]
    NetworkHostNotFound,
    #[serde(rename = "network:invalid_url")]
    NetworkInvalidUrl,
    #[serde(rename = "network:invalid_handle")]
    NetworkInvalidHandle,
}

#[cfg(test)]
mod test {
    use serde_json::json;

    use super::{HostValue, IoStreamHandle};

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
                "stream2": { "$HostValue::Stream": 123 }
            },
            "stream": { "$HostValue::Stream": 45 }
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
                    "stream2" => HostValue::Stream(IoStreamHandle::from_raw_handle(123))
                },
                "stream" => HostValue::Stream(IoStreamHandle::from_raw_handle(45))
            }
        );

        let actual_json_again = serde_json::to_value(actual).unwrap();
        assert_eq!(actual_json_again, actual_json);
    }
}
