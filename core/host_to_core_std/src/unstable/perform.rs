use serde::{Deserialize, Serialize};

use super::{value::SecurityValuesMap, ErrorCode, HostValue, MessageExchange, EXCHANGE_MESSAGE};

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
            map_security: SecurityValuesMap
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

pub struct PerformInput {
    pub profile_url: String,
    pub provider_url: String,
    pub map_url: String,
    pub usecase: String,
    pub map_input: HostValue,
    pub map_parameters: HostValue,
    pub map_security: SecurityValuesMap,
}
pub fn perform_input() -> PerformInput {
    let response = match PerformInputRequest::new().send_json(&EXCHANGE_MESSAGE) {
        Err(err) => {
            tracing::error!("Failed to receive perform_input response: {:#}", err);
            panic!("Failed to receive perform_input response: {}", err);
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
        } => PerformInput {
            profile_url,
            provider_url,
            map_url,
            usecase,
            map_input,
            map_parameters,
            map_security,
        },
        PerformInputResponse::Err {
            error_code,
            message,
        } => panic!("perform-input error: {:?} {}", error_code, message),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PerformException {
    pub message: String,
}

pub fn set_perform_output_result(result: HostValue) {
    let response = PerformOutputResultRequest::new(result)
        .send_json(&EXCHANGE_MESSAGE)
        .unwrap();

    match response {
        PerformOutputResultResponse::Ok => (),
        PerformOutputResultResponse::Err {
            error_code,
            message,
        } => panic!("perform-output-result error: {:?}: {}", error_code, message),
    }
}

pub fn set_perform_output_error(error: HostValue) {
    let response = PerformOutputErrorRequest::new(error)
        .send_json(&EXCHANGE_MESSAGE)
        .unwrap();

    match response {
        PerformOutputErrorResponse::Ok => (),
        PerformOutputErrorResponse::Err {
            error_code,
            message,
        } => panic!("perform-output-error error: {:?}: {}", error_code, message),
    }
}

pub fn set_perform_output_exception(exception: PerformException) {
    let response = PerformOutputExceptionRequest::new(exception)
        .send_json(&EXCHANGE_MESSAGE)
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
                assert_eq!(map_security.len(), 1);
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
