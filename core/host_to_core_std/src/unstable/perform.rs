use serde::{Deserialize, Serialize};

use super::{exception::PerformException, ErrorCode, HostValue};
use crate::abi::{JsonMessageError, MessageExchange};

define_exchange_core_to_host! {
    struct PerformInputRequest {
        kind: "perform-input"
    } -> enum PerformInputResponse {
        Ok {
            /// Url of the profile.
            profile_url: String,
            /// Url of the provider.
            provider_url: String,
            /// Url of the map (e.g. `file://<path>`).
            map_url: String,
            /// Usecase defined in the profile.
            usecase: String,
            /// Input passed into the map.
            map_input: HostValue,
            /// Integrations parameters.
            map_parameters: HostValue,
            /// Security values
            map_security: HostValue
        },
        Err {
            error_code: ErrorCode,
            message: String,
        }
    }
}

define_exchange_core_to_host! {
    struct PerformOutputResultRequest {
        kind: "perform-output-result",
        /// Result of the map.
        result: HostValue
    } -> enum PerformOutputResultResponse {
        Ok,
        Err {
            error_code: ErrorCode,
            message: String
        }
    }
}

define_exchange_core_to_host! {
    struct PerformOutputErrorRequest {
        kind: "perform-output-error",
        /// Only errors defined in the profile are returned here.
        error: HostValue
    } -> enum PerformOutputErrorResponse {
        Ok,
        Err {
            error_code: ErrorCode,
            message: String
        }
    }
}

define_exchange_core_to_host! {
    struct PerformOutputExceptionRequest {
        kind: "perform-output-exception",
        /// All other unexpected errors are returned here.
        exception: PerformException
    } -> enum PerformOutputExceptionResponse {
        Ok,
        Err {
            error_code: ErrorCode,
            message: String
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum TakePerformInputError {
    #[error("Invalid input format: {0}")]
    InvalidFormat(JsonMessageError),
    #[error("Unknown perform input error: {0}")]
    Unknown(String),
}
impl From<TakePerformInputError> for PerformException {
    fn from(value: TakePerformInputError) -> Self {
        PerformException {
            error_code: "TakePerformInputError".to_string(),
            message: value.to_string(),
        }
    }
}

pub struct PerformInput {
    pub profile_url: String,
    pub provider_url: String,
    pub map_url: String,
    pub usecase: String,
    pub map_input: HostValue,
    pub map_parameters: HostValue,
    pub map_security: HostValue,
}
impl PerformInput {
    pub fn take_in<E: MessageExchange>(
        message_exchange: E,
    ) -> Result<PerformInput, TakePerformInputError> {
        let response = match PerformInputRequest::new().send_json_in(message_exchange) {
            Err(err) => {
                tracing::error!("Failed to receive perform_input response: {:#}", err);
                return Err(TakePerformInputError::InvalidFormat(err));
            }
            Ok(r) => r,
        };

        match response {
            PerformInputResponse::Ok {
                profile_url,
                provider_url,
                map_url,
                usecase,
                map_input,
                map_parameters,
                map_security,
            } => Ok(PerformInput {
                profile_url,
                provider_url,
                map_url,
                usecase,
                map_input,
                map_parameters,
                map_security,
            }),
            PerformInputResponse::Err {
                error_code,
                message,
            } => Err(TakePerformInputError::Unknown(format!(
                "{:?} {}",
                error_code, message
            ))),
        }
    }
}

pub fn set_perform_output_result_in<E: MessageExchange>(result: HostValue, message_exchange: E) {
    let response = PerformOutputResultRequest::new(result)
        .send_json_in(message_exchange)
        .unwrap();

    match response {
        PerformOutputResultResponse::Ok => (),
        PerformOutputResultResponse::Err {
            error_code,
            message,
        } => panic!("perform-output-result error: {:?}: {}", error_code, message),
    }
}

pub fn set_perform_output_error_in<E: MessageExchange>(error: HostValue, message_exchange: E) {
    let response = PerformOutputErrorRequest::new(error)
        .send_json_in(message_exchange)
        .unwrap();

    match response {
        PerformOutputErrorResponse::Ok => (),
        PerformOutputErrorResponse::Err {
            error_code,
            message,
        } => panic!("perform-output-error error: {:?}: {}", error_code, message),
    }
}

pub fn set_perform_output_exception_in<E: MessageExchange>(
    exception: PerformException,
    message_exchange: E,
) {
    let response = PerformOutputExceptionRequest::new(exception)
        .send_json_in(message_exchange)
        .unwrap();

    match response {
        PerformOutputExceptionResponse::Ok => (),
        PerformOutputExceptionResponse::Err {
            error_code,
            message,
        } => panic!(
            "perform-output-exception error: {:?}: {}",
            error_code, message
        ),
    }
}

#[cfg(test)]
mod test {
    use std::collections::BTreeMap;

    use serde_json::json;

    use super::*;

    #[test]
    fn test_message_in_perform_input() {
        let actual = serde_json::to_value(PerformInputRequest {
            kind: PerformInputRequest::KIND,
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
            "profile_url": "quz",
            "provider_url": "baz",
            "map_url": "foo",
            "usecase": "bar",
            "map_input": true,
            "map_parameters": null,
            "map_security": {
                "basic": {
                    "username": "username",
                    "password": "pass"
                }
            }
        });

        match serde_json::from_value::<PerformInputResponse>(actual).unwrap() {
            PerformInputResponse::Ok {
                profile_url,
                provider_url,
                map_url,
                usecase,
                map_input,
                map_parameters,
                map_security,
            } => {
                assert_eq!(profile_url, "quz");
                assert_eq!(provider_url, "baz");
                assert_eq!(map_url, "foo");
                assert_eq!(usecase, "bar");
                assert_eq!(map_input, HostValue::Bool(true));
                assert_eq!(map_parameters, HostValue::None);

                let mut basic = BTreeMap::new();
                basic.insert(
                    "username".to_string(),
                    HostValue::String("username".to_string()),
                );
                basic.insert(
                    "password".to_string(),
                    HostValue::String("pass".to_string()),
                );

                let mut security = BTreeMap::new();
                security.insert("basic".to_string(), HostValue::Object(basic));
                assert_eq!(map_security, HostValue::Object(security));
            }
            PerformInputResponse::Err { .. } => unreachable!(),
        }
    }

    #[test]
    fn test_message_in_perform_output_result() {
        let actual = serde_json::to_value(PerformOutputResultRequest {
            kind: PerformOutputResultRequest::KIND,
            result: HostValue::String("hello".into()),
        })
        .unwrap();

        assert_eq!(
            serde_json::to_value(actual).unwrap(),
            json!({
                "kind": "perform-output-result",
                "result": "hello"
            })
        )
    }

    #[test]
    fn test_message_out_perform_output_result() {
        let actual = json!({
            "kind": "ok"
        });

        match serde_json::from_value::<PerformOutputResultResponse>(actual).unwrap() {
            PerformOutputResultResponse::Ok => (),
            PerformOutputResultResponse::Err { .. } => unreachable!(),
        }

        let actual = json!({
            "kind": "err",
            "error_code": "network:invalid_url",
            "message": "Message explaining the error"
        });

        match serde_json::from_value::<PerformOutputResultResponse>(actual).unwrap() {
            PerformOutputResultResponse::Ok => unreachable!(),
            PerformOutputResultResponse::Err {
                error_code,
                message,
            } => {
                assert!(matches!(error_code, ErrorCode::NetworkInvalidUrl));
                assert_eq!(message, "Message explaining the error");
            }
        }
    }
}
