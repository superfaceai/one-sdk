use serde::{Deserialize, Serialize};

use super::{HostValue, MessageExchange, EXCHANGE_MESSAGE};

define_exchange_core_to_host! {
    struct PerformInputRequest {
        kind: "perform-input"
    } -> enum PerformInputResponse {
        Ok {
            /// Remote name of the map or `file://<path>`.
            map_name: String,
            /// Usecase defined in the map.
            map_usecase: String,
            /// Input passed into the map.
            map_input: HostValue,
            /// Parameters passed into the map.
            ///
            /// Must be an object with at least these properties:
            /// ```ts
            /// type Parameters = {
            ///     __provider: {
            ///         services: Record<string, { baseUrl: string }>
            ///     }
            /// }
            /// ```
            map_parameters: HostValue,
            /// Security values passed into the map.
            map_security: HostValue
        },
        Err {
            error: String
        }
    }
}

define_exchange_core_to_host! {
    struct PerformOutputRequest<'a> {
        kind: "perform-output",
        /// Result or error of the map.
        ///
        /// Only errors defined in the profile are returned here.
        map_result: &'a Result<HostValue, HostValue>
    } -> enum PerformOutputResponse {
        Ok,
        Err { error: String }
    }
}

pub struct PerformInput {
    pub map_name: String,
    pub map_usecase: String,
    pub map_input: HostValue,
    pub map_parameters: HostValue,
    pub map_security: HostValue,
}
pub fn perform_input() -> PerformInput {
    let response = PerformInputRequest::new()
        .send_json(&EXCHANGE_MESSAGE)
        .unwrap();

    match response {
        PerformInputResponse::Ok {
            map_name,
            map_input,
            map_usecase,
            map_parameters,
            map_security,
        } => PerformInput {
            map_name,
            map_usecase,
            map_input,
            map_parameters,
            map_security,
        },
        PerformInputResponse::Err { error } => panic!("perform-input error: {}", error),
    }
}

pub struct PerformOutput {
    pub map_result: Result<HostValue, HostValue>,
}
pub fn perform_output(output: PerformOutput) {
    let response = PerformOutputRequest::new(&output.map_result)
        .send_json(&EXCHANGE_MESSAGE)
        .unwrap();

    match response {
        PerformOutputResponse::Ok => (),
        PerformOutputResponse::Err { error } => panic!("perform-output error: {}", error),
    }
}

#[cfg(test)]
mod test {
    use serde_json::json;

    use super::{
        HostValue, PerformInputRequest, PerformInputResponse, PerformOutputRequest,
        PerformOutputResponse,
    };

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
            "map_name": "foo",
            "map_usecase": "bar",
            "map_input": true,
            "map_parameters": null,
            "map_security": "banana"
        });

        match serde_json::from_value::<PerformInputResponse>(actual).unwrap() {
            PerformInputResponse::Ok {
                map_name,
                map_usecase,
                map_input,
                map_parameters,
                map_security,
            } => {
                assert_eq!(map_name, "foo");
                assert_eq!(map_usecase, "bar");
                assert_eq!(map_input, HostValue::Bool(true));
                assert_eq!(map_parameters, HostValue::None);
                assert_eq!(map_security, HostValue::String("banana".into()));
            }
            PerformInputResponse::Err { .. } => unreachable!(),
        }
    }

    #[test]
    fn test_message_in_perform_output() {
        let actual = serde_json::to_value(PerformOutputRequest {
            kind: PerformOutputRequest::KIND,
            map_result: &Ok(HostValue::String("hello".into())),
        })
        .unwrap();

        assert_eq!(
            serde_json::to_value(actual).unwrap(),
            json!({
                "kind": "perform-output",
                "map_result": {"Ok": "hello"}
            })
        )
    }

    #[test]
    fn test_message_out_perform_output() {
        let actual = json!({
            "kind": "ok"
        });

        match serde_json::from_value::<PerformOutputResponse>(actual).unwrap() {
            PerformOutputResponse::Ok => (),
            PerformOutputResponse::Err { .. } => unreachable!(),
        }
    }
}
