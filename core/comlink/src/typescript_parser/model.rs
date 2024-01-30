use serde::Serialize;

use crate::json::{JsonSchema, JsonValue};

#[derive(Debug, Clone, Copy, Default, Serialize)]
#[serde(transparent)]
pub struct TextSpan(pub [usize; 2]);

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
    /// Version of the profile.
    pub version: String,
    /// Documentation of the profile.
    pub documentation: Documentation,
    /// List of use cases.
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
    /// Name of the use case as specified in the type alias.
    pub name: String,
    /// Safety of the use case.
    pub safety: UseCaseSafety,
    /// Documentation attached directly to the use case.
    pub documentation: Documentation,
    /// Input value schema.
    pub input: JsonSchema,
    /// Result value schema.
    pub result: JsonSchema,
    /// Error value schema.
    pub error: JsonSchema,
    /// Examples of the use case.
    pub examples: Vec<UseCaseExample>,
}

#[derive(Debug, Default, Serialize)]
pub struct ProfileSpans {
    /// Span of the entire profile document
    pub entire: TextSpan,
    /// Spans for individual use cases, same order as [Profile::usecases] vec
    pub usecases: Vec<UseCaseSpans>
}
#[derive(Debug, Default, Serialize)]
pub struct UseCaseSpans {
    /// Span of the entire use case
    pub entire: TextSpan,
    /// Span of the name text
    pub name: TextSpan,
    /// Span of the safety value
    pub safety: TextSpan,
    /// Span of the documentation
    pub documentation: TextSpan,
    /// Span of the input schema value
    pub input: TextSpan,
    /// Span of the result schema value
    pub result: TextSpan,
    /// Span of the error schema value
    pub error: TextSpan,
    /// Spans of examples, same order as [UseCase::examples]
    pub examples: Vec<UseCaseExampleSpans>
}
#[derive(Debug, Default, Serialize)]
pub struct UseCaseExampleSpans {
    /// Span of the entire exmaple
    pub entire: TextSpan,
    /// Span of the name value
    pub name: TextSpan,
    /// Span of the input value
    pub input: TextSpan,
    /// Span of the output value
    pub output: TextSpan
}
