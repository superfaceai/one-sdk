pub type JsonValue = serde_json::Value;
pub type JsonNumber = serde_json::Number;
pub type JsonMap = serde_json::Map<String, JsonValue>;
pub type JsonSchema = JsonValue;

macro_rules! json_map {
    (
        {
            $($toks: tt)*
        }
    ) => {
        {
            let o = serde_json::json!({ $($toks)* });
            match o {
                serde_json::Value::Object(o) => o,
                _ => unreachable!()
            }
        }
    };
}
pub(crate) use json_map;
pub(crate) use serde_json::json;
