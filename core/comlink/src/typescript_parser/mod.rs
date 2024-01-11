//! Parser for TypeScript profiles.

mod const_eval;
mod diagnostic;
mod model;
mod parser;

pub use diagnostic::{Diagnostic, DiagnosticSeverity, DiagnosticCode};
pub use model::{Documentation, Profile, UseCase, UseCaseExample, UseCaseSafety, ProfileSpans};

use crate::json::{JsonValue, JsonSchema};

use self::model::TextSpan;

/// Parse a profile from source text.
///
/// Returns a best-effort Profile structure and a list of errors encountered.
/// If the list of errors is empty then the parsing was successful.
pub fn parse_profile(source: &str) -> (Profile, ProfileSpans, Vec<Diagnostic>) {
    let (profile, spans, mut diagnostics) = parser::ProfileParser::parse(source);

    for (usecase, usecase_spans) in profile.usecases.iter().zip(spans.usecases.iter()) {
        for (example, example_spans) in usecase.examples.iter().zip(usecase_spans.examples.iter()) {
            match example {
                UseCaseExample::Success { input, result, .. } => {
                    check_profile_examples_schemas( &usecase.input, usecase_spans.input, input, example_spans.input, &mut diagnostics);
                    check_profile_examples_schemas( &usecase.result, usecase_spans.result, result, example_spans.output, &mut diagnostics);
                }
                UseCaseExample::Failure { input, error, .. } => {
                    check_profile_examples_schemas( &usecase.input, usecase_spans.input, input, example_spans.input, &mut diagnostics);
                    check_profile_examples_schemas( &usecase.error, usecase_spans.error, error, example_spans.output, &mut diagnostics);
                }
            }
        }
    }

    (profile, spans, diagnostics)
}

fn check_profile_examples_schemas(schema: &JsonSchema, schema_span: TextSpan, value: &JsonValue, value_span: TextSpan, diag: &mut Vec<Diagnostic>) {
    let validator = match super::json_schema_validator::JsonSchemaValidator::new(schema) {
        Ok(v) => v,
        Err(err) => {
            diag.push(Diagnostic {
                severity: DiagnosticSeverity::Error,
                code: DiagnosticCode::UseCaseInvalid as u16,
                message: format!("{}: Generated schema is invalid: {}", DiagnosticCode::UseCaseInvalid.description(), err),
                span: schema_span
            });
            return;
        }
    };

    match validator.validate(value) {
        Ok(()) => (),
        Err(err) => {
            diag.push(Diagnostic {
                severity: DiagnosticSeverity::Error,
                code: DiagnosticCode::UseCaseExampleInvalid as u16,
                message: format!("{}: UseCase example doesn't match the schema: {}", DiagnosticCode::UseCaseExampleInvalid.description(), err),
                span: value_span
            });
        }
    }
}