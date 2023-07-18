use jsonschema::JSONSchema;
use serde_json::Value;
use sf_std::unstable::HostValue;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum JsonSchemaValidatorError {
    #[error("Invalid JSON Schema {kind:?}: {path:?})")]
    SchemaError { kind: String, path: String },

    #[error("")]
    ValidationError {
        kind: String,
        value: String,
        path: String,
    },
}

pub struct JsonSchemaValidator {
    compiled: JSONSchema,
}
impl JsonSchemaValidator {
    pub fn new(schema: &Value) -> Result<Self, JsonSchemaValidatorError> {
        match JSONSchema::compile(&schema) {
            Err(error) => Err(JsonSchemaValidatorError::SchemaError {
                kind: format!("{:?}", error.kind),
                path: error.schema_path.to_string(),
            }),
            Ok(compiled) => Ok(Self { compiled }),
        }
    }

    pub fn validate(&self, instance: &HostValue) -> Result<(), JsonSchemaValidatorError> {
        let instance = serde_json::to_value(instance).unwrap();
        let result = self.compiled.validate(&instance);

        if let Err(errors) = result {
            for error in errors {
                return Err(JsonSchemaValidatorError::ValidationError {
                    kind: format!("{:?}", error.kind), // TODO: string or keep original?
                    value: format!("{:?}", error.instance), // TODO: Serde::Value to HostValue?
                    path: error.instance_path.to_string(),
                });
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use std::str::FromStr;

    use super::*;
    use serde::Deserialize;
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

        let result = validator.validate(
            &HostValue::deserialize(json!({
                "foo": 1,
                "bar": "one",
                "baz": true,
                "waf": null
            }))
            .unwrap(),
        );
        assert!(result.is_ok());

        let result = validator.validate(
            &HostValue::deserialize(&json!({
                "foo": "1",
                "bar": null,
                "baz": "true",
                "waf": "null"
            }))
            .unwrap(),
        );
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

    #[test]
    fn test_security_values_validator() {
        const SECURITY_VALUES_SCHEMA: &str =
            include_str!("../../assets/schemas/security_values.schema.json"); // read higher

        let security_validator = JsonSchemaValidator::new(
            &serde_json::Value::from_str(&SECURITY_VALUES_SCHEMA).unwrap(),
        )
        .unwrap();

        let result = security_validator.validate(
            &HostValue::deserialize(&json!({
                "my_basic": {
                    "username": "username",
                    "password": "password"
                },
                "my_token": {
                    "token": "token"
                },
                "my_api_key": {
                    "apikey": "api key"
                }
            }))
            .unwrap(),
        );
        assert!(result.is_ok());

        let result = security_validator.validate(
            &HostValue::deserialize(&json!({
                "security_config": {
                    "unknown": "so invalid"
                }
            }))
            .unwrap(),
        );
        assert!(result.is_err());
    }
}
