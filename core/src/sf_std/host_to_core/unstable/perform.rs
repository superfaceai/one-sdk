use serde::{Deserialize, Serialize};

use super::{IoStream, EXCHANGE_MESSAGE};

define_exchange! {
    struct InPerformInput {
        kind: "perform-input"
    } -> enum OutPerformInput {
        Ok {
            map_name: String,
            map_input: StructuredData
        }
    }
}

define_exchange! {
    struct InPerformOutput {
        kind: "perform-output",
        map_result: StructuredData
    } -> enum OutPerformOutput {
        Ok
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "__type")]
pub enum CustomStructuredData {
    #[serde(rename = "iostream")]
    Stream {
        #[serde(with = "super::serde_iostream")]
        handle: IoStream,
    },
}
/// Wrapper around [serde_json::Value] that recognizes our custom types.
#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum StructuredData {
    // TODO: this needs to be recursive - so probably totally custom structured data type
    Custom(CustomStructuredData),
    Value(serde_json::Value),
}

pub struct PerformInput {
    pub map_name: String,
    pub map_input: StructuredData,
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
            map_input,
        },
    }
}

pub struct PerformOutput {
    pub map_result: StructuredData,
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
