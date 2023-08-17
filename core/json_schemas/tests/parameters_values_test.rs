use serde_json::json;

#[macro_use]
mod common;

#[test]
fn test_parameters_values() {
    let schema = json_schema!("../src/schemas/parameters_values.yaml");

    let instance = json!(null);
    let result = schema.validate(&instance);
    assert!(result.is_ok());

    let instance = json!({});
    let result = schema.validate(&instance);
    assert!(result.is_ok());

    let instance = json!({
      "FOO": "BAR"
    });
    let result = schema.validate(&instance);
    assert!(result.is_ok());

    let instance = json!({
      "FOO": 1,
    });
    let result = schema.validate(&instance);
    assert!(result.is_err());

    let instance = json!({
      "FOO": false,
    });
    let result = schema.validate(&instance);
    assert!(result.is_err());

    let instance = json!({
      "FOO": null,
    });
    let result = schema.validate(&instance);
    assert!(result.is_err());
}
