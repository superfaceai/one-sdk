use serde::Serialize;

use crate::json::{JsonSchema, JsonValue};

#[derive(Debug, Default, Serialize)]
pub struct Documentation {
    pub title: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Default, Serialize)]
pub struct Profile {
    /// Scope part of `scope/name`.
    pub scope: Option<String>,
    /// Name part of `scope/name`.
    pub name: String,
    /// Documentation of the profile.
    pub documentation: Documentation,
    /// List of usecases.
    pub usecases: Vec<UseCase>,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum UseCaseSafety {
    Safe,
    Idempotent,
    #[default]
    Unsafe,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum UseCaseExample {
    Success {
        #[serde(skip_serializing_if = "Option::is_none")]
        name: Option<String>,
        input: JsonValue,
        result: JsonValue,
    },
    Failure {
        #[serde(skip_serializing_if = "Option::is_none")]
        name: Option<String>,
        input: JsonValue,
        error: JsonValue,
    },
}
impl Default for UseCaseExample {
    fn default() -> Self {
        Self::Success {
            name: Default::default(),
            input: Default::default(),
            result: Default::default(),
        }
    }
}

#[derive(Debug, Default, Serialize)]
pub struct UseCase {
    /// Name of the usecase as specified in the type alias.
    pub name: String,
    /// Safety of the usecase.
    pub safety: UseCaseSafety,
    /// Documentation attached directly to the usecase.
    pub documentation: Documentation,
    /// Input value schema.
    pub input: JsonSchema,
    /// Result value schema.
    pub result: JsonSchema,
    /// Error value schema.
    pub error: JsonSchema,
    /// Examples of the usecase.
    pub examples: Vec<UseCaseExample>,
}
