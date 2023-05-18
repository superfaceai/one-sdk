use std::collections::BTreeMap;

use thiserror::Error;

use serde::{Deserialize, Serialize};

use sf_std::{abi::Handle, HeadersMultiMap, MultiMap, unstable::http::HttpCallError as HostHttpCallError};

pub mod security;
pub mod services;

#[allow(dead_code)]
pub const MODULE_NAME: &str = "sf_core_unstable";

pub type MapValueObject = BTreeMap<String, MapValue>;

#[derive(Debug, Clone)]
pub enum MapValue {
    None,
    Bool(bool),
    Number(serde_json::Number),
    String(String),
    Array(Vec<Self>),
    Object(MapValueObject),
}
impl MapValue {
    pub fn try_into_string(self) -> Option<String> {
        match self {
            Self::String(s) => Some(s),
            _ => None,
        }
    }

    pub fn try_into_object(self) -> Option<BTreeMap<String, Self>> {
        match self {
            Self::Object(o) => Some(o),
            _ => None,
        }
    }
}
impl Serialize for MapValue {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        // see file serde_json/src/value/ser.rs:14
        use serde::ser::SerializeMap;

        match self {
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
impl<'de> Deserialize<'de> for MapValue {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        // see file serde_json/src/value/de.rs:22
        use serde::de::{MapAccess, SeqAccess, Visitor};
        use std::fmt;

        struct ValueVisitor;
        impl<'de> Visitor<'de> for ValueVisitor {
            type Value = MapValue;

            fn expecting(&self, f: &mut fmt::Formatter) -> fmt::Result {
                write!(f, "any valid JSON value or one of custom types")
            }

            #[inline]
            fn visit_bool<E>(self, value: bool) -> Result<MapValue, E> {
                Ok(MapValue::Bool(value))
            }

            #[inline]
            fn visit_i64<E>(self, value: i64) -> Result<MapValue, E> {
                Ok(MapValue::Number(value.into()))
            }
            #[inline]
            fn visit_u64<E>(self, value: u64) -> Result<MapValue, E> {
                Ok(MapValue::Number(value.into()))
            }
            #[inline]
            fn visit_f64<E>(self, value: f64) -> Result<MapValue, E> {
                Ok(serde_json::Number::from_f64(value).map_or(MapValue::None, MapValue::Number))
            }

            #[inline]
            fn visit_str<E: serde::de::Error>(self, value: &str) -> Result<MapValue, E> {
                self.visit_string(String::from(value))
            }
            #[inline]
            fn visit_string<E>(self, value: String) -> Result<MapValue, E> {
                Ok(MapValue::String(value))
            }

            #[inline]
            fn visit_none<E>(self) -> Result<MapValue, E> {
                Ok(MapValue::None)
            }
            #[inline]
            fn visit_unit<E>(self) -> Result<MapValue, E> {
                Ok(MapValue::None)
            }

            #[inline]
            fn visit_some<D: serde::Deserializer<'de>>(
                self,
                deserializer: D,
            ) -> Result<MapValue, D::Error> {
                Deserialize::deserialize(deserializer)
            }

            #[inline]
            fn visit_seq<V: SeqAccess<'de>>(self, mut visitor: V) -> Result<MapValue, V::Error> {
                let mut vec = Vec::new();

                while let Some(elem) = visitor.next_element()? {
                    vec.push(elem);
                }

                Ok(MapValue::Array(vec))
            }

            fn visit_map<V: MapAccess<'de>>(self, mut visitor: V) -> Result<MapValue, V::Error> {
                let values = match visitor.next_key::<String>()? {
                    None => BTreeMap::new(),
                    Some(first_key) => {
                        let mut values = BTreeMap::new();

                        values.insert(first_key, visitor.next_value()?);
                        while let Some((key, value)) = visitor.next_entry()? {
                            values.insert(key, value);
                        }

                        values
                    }
                };

                Ok(MapValue::Object(values))
            }
        }

        deserializer.deserialize_any(ValueVisitor)
    }
}

pub struct HttpRequest {
    /// HTTP method - will be used as-is.
    pub method: String,
    pub url: String,
    pub headers: HeadersMultiMap,
    /// Query parameters.
    ///
    /// Multiple values with the same key will be repeated in the query string, no joining will be performed.
    pub query: MultiMap,
    /// Body as bytes.
    pub body: Option<Vec<u8>>,
    /// Security configuration
    pub security: Option<String>,
}
pub struct HttpResponse {
    /// Status code of the response.
    pub status: u16,
    /// Headers, as returned from the server without any client-side joining.
    pub headers: HeadersMultiMap,
    /// Body stream of content-encoding decoded data.
    pub body_stream: Handle,
}
#[derive(Debug, Serialize, Deserialize)]
pub enum ErrorCode {
    #[serde(rename = "network:error")]
    NetworkError,
    #[serde(rename = "network:ECONNREFUSED")]
    ConnectionRefused,
    #[serde(rename = "network:ENOTFOUND")]
    HostNotFound,
    #[serde(rename = "network:invalid_handle")]
    NetworkInvalidHandle,
    #[serde(rename = "network:invalid_url")]
    NetworkInvalidUrl,

    #[serde(rename = "security:misssing_secret")]
    SecurityMissingSecret,
    #[serde(rename = "security:invalid_configuration")]
    SecurityInvalidConfiguration,

    #[serde(rename = "outcome:unxpected")]
    OutcomeUnexpected,
    #[serde(rename = "context:taken")]
    ContextTaken,
}
#[derive(Debug, Error)]
pub enum HttpCallError {
    // TODO: define more granular categories
    #[error("http call failed: {0}")]
    Failed(String),
    #[error("Invalid security configuration: {0}")]
    InvalidSecurityConfiguration(String),
    #[error("Missing secret value: {0}")]
    MissingSecret(String),
}
impl From<HostHttpCallError> for HttpCallError {
    fn from(value: HostHttpCallError) -> Self {
        
        debug_assert!(!matches!(value, HostHttpCallError::HostNotFound(_) | HostHttpCallError::ConnectionRefused(_)));
        match value {
            HostHttpCallError::HostNotFound(m)
            | HostHttpCallError::ConnectionRefused(m)
            | HostHttpCallError::InvalidUrl(m)
            | HostHttpCallError::Unknown(m)
                => Self::Failed(m)
        }
    }
}

#[derive(Debug, Error)]
pub enum HttpCallHeadError {
    #[error("Response error: {0}")]
    Failed(String),

    #[error("Connection refused: {0}")]
    ConnectionRefused(String),
    #[error("Host was not found: {0}")]
    HostNotFound(String),

    #[error("Handle does not belong to an active http request")]
    InvalidHandle,
}
impl From<HostHttpCallError> for HttpCallHeadError {
    fn from(value: HostHttpCallError) -> Self {
        debug_assert!(!matches!(value, HostHttpCallError::InvalidUrl(_)));
        match value {
            HostHttpCallError::ConnectionRefused(m) => Self::ConnectionRefused(m),
            HostHttpCallError::HostNotFound(m) => Self::HostNotFound(m),
            HostHttpCallError::InvalidUrl(m) | HostHttpCallError::Unknown(m) => Self::Failed(m)
        }
    }
}

#[derive(Debug, Error)]
pub enum TakeContextError {
    #[error("Context has already been taken")]
    AlreadyTaken,
}
#[derive(Debug, Error)]
pub enum SetOutputError {
    #[error("Output has already been set")]
    AlreadySet,
}

pub trait MapStdUnstable {
    // env
    fn print(&mut self, message: &str);
    fn abort(&mut self, message: &str, filename: &str, line: usize, column: usize) -> String;

    // streams
    fn stream_read(&mut self, handle: Handle, buf: &mut [u8]) -> std::io::Result<usize>;
    fn stream_write(&mut self, handle: Handle, buf: &[u8]) -> std::io::Result<usize>;
    fn stream_close(&mut self, handle: Handle) -> std::io::Result<()>;

    // http
    fn http_call(&mut self, params: HttpRequest) -> Result<Handle, HttpCallError>;
    fn http_call_head(&mut self, handle: Handle) -> Result<HttpResponse, HttpCallHeadError>;

    // input and output
    fn take_context(&mut self) -> Result<MapValue, TakeContextError>;
    fn set_output_success(&mut self, output: MapValue) -> Result<(), SetOutputError>;
    fn set_output_failure(&mut self, output: MapValue) -> Result<(), SetOutputError>;
}

//////////////
// MESSAGES //
//////////////

define_exchange_map_to_core! {
    let state: MapStdUnstable;
    enum RequestUnstable {
        // http
        HttpCall {
            method: String,
            url: String,
            headers: HeadersMultiMap,
            query: MultiMap,
            security: Option<String>,
            body: Option<Vec<u8>>,
        } -> enum Response {
            Ok {
                request_body_stream: Option<()>, // TODO: think about implementation/ergonomics
                handle: Handle,
            },
            Err {
                error_code: ErrorCode,
                message: String
            },
        } => {
            let handle = state.http_call(HttpRequest {
                method,
                url,
                headers,
                query,
                security,
                body,
            });

            match handle {
                Ok(handle) => Response::Ok {
                    request_body_stream: None,
                    handle,
                },
                Err(err) => match err {
                    HttpCallError::Failed(message) => Response::Err { error_code: ErrorCode::NetworkError, message },
                    HttpCallError::MissingSecret(message) => Response::Err { error_code: ErrorCode::SecurityMissingSecret, message },
                    HttpCallError::InvalidSecurityConfiguration(message) => Response::Err { error_code: ErrorCode::SecurityInvalidConfiguration, message },
                }
            }
        },
        HttpCallHead {
            handle: Handle,
        } -> enum Response {
            Ok {
                status: u16,
                headers: HeadersMultiMap,
                body_stream: Handle,
            },
            Err {
                error_code: ErrorCode,
                message: String
            },
        } => match state.http_call_head(handle) {
            Ok(HttpResponse {
                status,
                headers,
                body_stream,
            }) => Response::Ok { status, headers, body_stream, },
            Err(err) => match err {
                HttpCallHeadError::InvalidHandle => Response::Err { error_code: ErrorCode::NetworkInvalidHandle, message: "Invalid request handle".to_string() },
                HttpCallHeadError::Failed(message) => Response::Err { error_code: ErrorCode::NetworkError, message },
                HttpCallHeadError::ConnectionRefused(message) => Response::Err { error_code: ErrorCode::ConnectionRefused, message },
                HttpCallHeadError::HostNotFound(message) => Response::Err { error_code: ErrorCode::HostNotFound, message },
            }
        },
        // input and output
        TakeContext -> enum Response {
            Ok { context: MapValue },
            Err {
                error_code: ErrorCode,
                message: String
            }
        } => match state.take_context() {
            Ok(context) => Response::Ok { context },
            Err(err) => match err {
                TakeContextError::AlreadyTaken => Response::Err { error_code: ErrorCode::ContextTaken, message: err.to_string() }
            }
        },
        SetOutputSuccess { output: MapValue } -> enum Response {
            Ok,
            Err {
                error_code: ErrorCode,
                message: String,
            }
        } => match state.set_output_success(output) {
            Ok(()) => Response::Ok,
            Err(err) => Response::Err {
                error_code: ErrorCode::OutcomeUnexpected,
                message: err.to_string()
            }
        },
        SetOutputFailure { output: MapValue } -> enum Response {
            Ok,
            Err {
                error_code: ErrorCode,
                message: String,
            }
        } => match state.set_output_failure(output) {
            Ok(()) => Response::Ok,
            Err(err) => Response::Err { error_code: ErrorCode::OutcomeUnexpected, message: err.to_string() }
        }
    }
}

pub fn handle_message<H: MapStdUnstable>(state: &mut H, message: &[u8]) -> String {
    RequestUnstable::handle(state, message)
}
