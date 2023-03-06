use quickjs_wasm_rs::{Context, JSError};

use serde_json::{json, Value as JsonValue};

pub fn run(id: usize) -> usize {
    let context = Context::default();

    let global_object = context.global_object().expect("Failed to get global object");

    let handle_message_fn = context.wrap_callback(|context, _this, args| {
        let message = args.get(0).and_then(|msg| msg.as_str().ok()).ok_or(
            JSError::Type("handle_message needs one string argument".to_string())
        )?;
        let message = serde_json::from_str::<JsonValue>(message).map_err(
            |err| JSError::Type(format!("Failed to deserialize JSON message: {}", err))
        )?;

        let result = json!({
            "id": message.as_object().unwrap().get("url").unwrap().as_str().unwrap().len()
        });
        let result = serde_json::to_string(&result).map_err(
            |err| JSError::Type(format!("Faield to serialize JSON message: {}", err))
        )?;

        context.value_from_str(&result)
    }).expect("Failed to define handle_message callback");
    global_object.set_property("handle_message", handle_message_fn).expect("Failed to set property on global object");

    let script = format!(
        r#"
        let url = `https://example.com/{}`;
        let headers = {{
            foo: ["bar"],
            accept: ["application/json", "application/xml"]
        }};

        let response = handle_message(JSON.stringify({{ url, headers }}));
        JSON.parse(response).id
        "#,
        id
    );
    let result = context
        .eval_global("map.js", &script).expect("Failed to evaluate")
        .as_f64().expect("Result is not a number")
    ;
    if result.abs().floor() != result {
        panic!("Result is not a positive integer");
    }
    
    result as usize
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = run(1);
        assert_eq!(result, 21);
    }
}
