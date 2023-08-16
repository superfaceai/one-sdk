use serde_json::json;

#[macro_use]
mod common;

#[test]
fn test_security_values() {
    let schema = json_schema!("../src/schemas/security_values.yaml");

    let instance = json!({
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
    });
    let result = schema.validate(&instance);
    assert!(result.is_ok());

    let instance = json!({
        "security_config": {
            "unknown": "so invalid"
        }
    });
    let result = schema.validate(&instance);
    assert!(result.is_err());

    let instance = json!({
        "partial_basic": {
            "username": "username"
        }
    });
    let result = schema.validate(&instance);
    assert!(result.is_err());

    let instance = json!({
        "empty": {}
    });
    let result = schema.validate(&instance);
    assert!(result.is_err());
}
