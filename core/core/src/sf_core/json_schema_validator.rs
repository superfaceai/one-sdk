use anyhow::{anyhow, Result};
use jsonschema::JSONSchema;
use serde_json::Value;
use sf_std::unstable::HostValue;

pub struct JsonSchemaValidator {
    schema: Value,
    compiled: JSONSchema,
}
impl JsonSchemaValidator {
    pub fn new(schema: &Value) -> Result<Self> {
        let compiled = JSONSchema::compile(&schema);

        if let Err(e) = compiled {
            return Err(anyhow!("Invalid JSON Schema")); // TODO: do better
        }

        let compiled = compiled.unwrap();

        Ok(Self {
            schema: schema.to_owned(),
            compiled,
        })
    }

    pub fn validate(&self, instance: &HostValue) -> Result<()> {
        let instance = serde_json::to_value(instance).unwrap();
        let result = self.compiled.validate(&instance);

        if let Err(errors) = result {
            for error in errors {
                println!("Validation error: {}", error);
                println!("Instance path: {}", error.instance_path);

                // TODO: feed and return ValidationError
                return Err(anyhow!("Validation didn't pass, yep this is useless"));
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod test {
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
}
