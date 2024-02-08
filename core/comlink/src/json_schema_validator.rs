use std::fmt::Display;

use jsonschema::JSONSchema;
use thiserror::Error;

use super::json::JsonValue;

#[derive(Debug)]
pub enum JsonSchemaValidatorError {
    SchemaError { kind: String, path: String },
    ValidationErrors(Vec<ValidationError>),
}
impl Display for JsonSchemaValidatorError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::SchemaError { kind, path } => {
                write!(f, "Invalid JSON Schema {:?}: {:?})", kind, path)
            }
            Self::ValidationErrors(errors) => {
                writeln!(f, "following validation errors occured")?;

                for error in errors {
                    writeln!(
                        f,
                        "  {} on path: {}, value: {}",
                        error.kind, error.path, error.value
                    )?;
                }

                Ok(())
            }
        }
    }
}
impl std::error::Error for JsonSchemaValidatorError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        None
    }
}

#[derive(Debug, Error)]
#[error("Validation error {kind:?}: {path:?} ({value:?})")]
pub struct ValidationError {
    kind: String,
    value: String,
    path: String,
}

#[derive(Debug)]
pub struct JsonSchemaValidator {
    compiled: JSONSchema,
}
impl JsonSchemaValidator {
    pub fn new(schema: &JsonValue) -> Result<Self, JsonSchemaValidatorError> {
        match JSONSchema::compile(schema) {
            Err(error) => Err(JsonSchemaValidatorError::SchemaError {
                kind: format!("{:?}", error.kind),
                path: error.schema_path.to_string(),
            }),
            Ok(compiled) => Ok(Self { compiled }),
        }
    }

    pub fn validate(&self, instance: &JsonValue) -> Result<(), JsonSchemaValidatorError> {
        let result = self.compiled.validate(&instance);

        if let Err(errors) = result {
            return Err(JsonSchemaValidatorError::ValidationErrors(
                errors
                    .map(|error| ValidationError {
                        kind: format!("{:?}", error.kind), // TODO: string or keep original?
                        value: format!("{:?}", error.instance), // TODO: Serde::Value to HostValue?
                        path: error.instance_path.to_string(),
                    })
                    .collect(),
            ));
        }

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_basic() {
        let validator = JsonSchemaValidator::new(&json!(
        {
            "type": "object",
            "properties": {
                "foo": {
                    "type": "integer"
                },
                "bar": {
                    "type": "string"
                },
                "baz": {
                    "type": "boolean"
                },
                "waf": {
                    "type": "null"
                }
            }
        }))
        .unwrap();

        let result = validator.validate(&json!({
            "foo": 1,
            "bar": "one",
            "baz": true,
            "waf": null
        }));
        assert!(result.is_ok());

        let result = validator.validate(&json!({
            "foo": "1",
            "bar": null,
            "baz": "true",
            "waf": "null"
        }));
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_schema() {
        let validator = JsonSchemaValidator::new(&json!({
            "type": "unknown"
        }));

        assert!(validator.is_err());
        assert!(matches!(
            validator.err().unwrap(),
            JsonSchemaValidatorError::SchemaError { .. }
        ));
    }
}
