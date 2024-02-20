//! Parser for TypeScript profiles.

mod const_eval;
mod diagnostic;
mod model;
mod parser;

pub use diagnostic::{Diagnostic, DiagnosticSeverity, DiagnosticCode};
pub use model::{Documentation, Profile, UseCase, UseCaseExample, UseCaseSafety, ProfileSpans};

use crate::json::{JsonValue, JsonSchema};

use self::model::{TextSpan, ProfileId};

pub fn parse_profile_id_from_path(path: &str) -> Option<ProfileId> {
    // file must end with either .profile or .profile.ts
    let path = path.strip_suffix(".profile.ts").or_else(
        || path.strip_suffix(".profile")
    )?;
    let path = std::path::Path::new(path);
    let mut ancestors = path.ancestors().filter_map(|p| p.file_name()?.to_str());

    // we already stripped the suffix, so file_name will contain the base_name
    let base_name = ancestors.next()?;

    let (base_name, version) = match base_name.split_once('@') {
        Some((b, v)) => (b, Some(v)),
        None => (base_name, None),
    };
    let version = version.unwrap_or("0.0.0").to_string();

    // if file_name is `profile[@1.2.3].profile` or `profile[@1.2.3].profile.ts` we attempt to take the name from directory structure
    if base_name == "profile" {
        let name = ancestors.next()?.to_string();
        let scope = ancestors.next().map(|s| s.to_string());

        Some(ProfileId { scope, name, version })
    } else {
        let (scope, name) = match base_name.split_once('.') {
            Some((s, n)) => (Some(s.to_string()), n),
            None => (None, base_name)
        };
        Some(ProfileId { scope, name: name.to_string(), version })
    }
}

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
                    check_profile_examples_schemas(&usecase.input, usecase_spans.input, input, example_spans.input, &mut diagnostics);
                    check_profile_examples_schemas(&usecase.result, usecase_spans.result, result, example_spans.output, &mut diagnostics);
                }
                UseCaseExample::Failure { input, error, .. } => {
                    check_profile_examples_schemas(&usecase.input, usecase_spans.input, input, example_spans.input, &mut diagnostics);
                    check_profile_examples_schemas(&usecase.error, usecase_spans.error, error, example_spans.output, &mut diagnostics);
                }
            }
        }
    }
    if profile.usecases.len() == 0 {
        diagnostics.push(Diagnostic {
            severity: DiagnosticSeverity::Error,
            code: DiagnosticCode::ProfileInvalid as u16,
            message: format!("{}: Profile must contain at least one Use case", DiagnosticCode::ProfileInvalid.description()),
            span: spans.entire
        });
    }

    (profile, spans, diagnostics)
}

fn check_profile_examples_schemas(schema: &JsonSchema, schema_span: TextSpan, value: &JsonValue, value_span: TextSpan, diag: &mut Vec<Diagnostic>) {
    let schema = JsonValue::Object(schema.clone());
    let validator = match super::json_schema_validator::JsonSchemaValidator::new(&schema) {
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

#[cfg(test)]
mod test {
    use super::{parse_profile_id_from_path, ProfileId};

    #[test]
    fn test_parse_profile_id_from_path() {
        let cases = [
            ("foo/bar/wasm-sdk.example.profile.ts", Some(ProfileId { scope: Some("wasm-sdk".to_string()), name: "example".to_string(), version: "0.0.0".to_string() })),
            ("foo/bar/wasm-sdk.example.profile", Some(ProfileId { scope: Some("wasm-sdk".to_string()), name: "example".to_string(), version: "0.0.0".to_string() })),
            ("foo/bar/wasm-sdk.example@1.2.3.profile.ts", Some(ProfileId { scope: Some("wasm-sdk".to_string()), name: "example".to_string(), version: "1.2.3".to_string() })),
            ("foo/bar/example.profile.ts", Some(ProfileId { scope: None, name: "example".to_string(), version: "0.0.0".to_string() })),
            ("foo/bar/example@4.5.67.profile", Some(ProfileId { scope: None, name: "example".to_string(), version: "4.5.67".to_string() })),
            ("foo/bar/profile.profile.ts", Some(ProfileId { scope: Some("foo".to_string()), name: "bar".to_string(), version: "0.0.0".to_string() })),
            ("foo/bar/profile.profile", Some(ProfileId { scope: Some("foo".to_string()), name: "bar".to_string(), version: "0.0.0".to_string() })),
            ("foo/bar/profile@32.1.0.profile", Some(ProfileId { scope: Some("foo".to_string()), name: "bar".to_string(), version: "32.1.0".to_string() })),
            ("bar/profile@32.1.0.profile.ts", Some(ProfileId { scope: None, name: "bar".to_string(), version: "32.1.0".to_string() })),
        ];

        for (input, expected) in cases.into_iter() {
            let actual = parse_profile_id_from_path(input);
            assert_eq!(actual, expected);
        }
    }
}