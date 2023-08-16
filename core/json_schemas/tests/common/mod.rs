macro_rules! json_schema {
    ($file:expr) => {{
        let yaml_str = include_str!($file);
        let yaml: serde_yaml::Value = serde_yaml::from_str(yaml_str).expect("Valid YAML");
        let json = serde_json::to_value(&yaml).expect("Valid JSON");
        jsonschema::JSONSchema::compile(&json).expect("Valid JSON Schema")
    }};
}
