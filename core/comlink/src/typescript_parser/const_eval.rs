use crate::json::{JsonNumber, JsonValue};

#[derive(Debug)]
pub enum UnaryOperator {
    Plus,
    Minus,
    BitwiseNot,
    LogicalNot,
}
/// Evaluates operator and value the same way as JavaScript would converted to JSON.
pub fn eval_unary(operator: UnaryOperator, value: JsonValue) -> JsonValue {
    match operator {
        UnaryOperator::Plus => coerce_number(value),
        UnaryOperator::Minus => match coerce_number(value) {
            JsonValue::Number(n) => negate_number(n),
            v => v,
        },
        UnaryOperator::BitwiseNot => match coerce_number(value) {
            JsonValue::Number(n) => bitwise_not(n),
            v => v,
        },
        UnaryOperator::LogicalNot => JsonValue::Bool(is_falsy(value)),
    }
}

fn negate_number(n: JsonNumber) -> JsonValue {
    if let Some(i) = n.as_i64() {
        return JsonNumber::from(-i).into();
    }

    if let Some(f) = n.as_f64().and_then(|f| JsonNumber::from_f64(-f)) {
        return f.into();
    }

    JsonValue::Null
}

fn bitwise_not(n: JsonNumber) -> JsonValue {
    match n.as_f64() {
        Some(f) => JsonValue::Number((f as u32).into()),
        None => JsonValue::Null,
    }
}

fn coerce_number(value: JsonValue) -> JsonValue {
    let zero = JsonValue::Number(0.into());
    let one = JsonValue::Number(1.into());
    // NaN turns into null in JSON
    let nan = JsonValue::Null;

    match value {
        JsonValue::Null | JsonValue::Bool(false) => zero,
        JsonValue::Bool(true) => one,
        n @ JsonValue::Number(_) => n,
        JsonValue::Array(a) => match a.len() {
            0 => zero,
            1 => coerce_number(a.into_iter().next().unwrap()),
            _ => nan,
        },
        JsonValue::Object(_) => nan,
        JsonValue::String(s) => match s.len() {
            0 => zero,
            // take a little shortcut - if it isn't a valid JSON number, then it would get turned into NaN/Null anyway
            _ => match serde_json::from_str::<JsonNumber>(&s) {
                Ok(n) => JsonValue::Number(n),
                _ => nan,
            },
        },
    }
}

// false, 0, -0, 0n, "", null, undefined, NaN
fn is_falsy(value: JsonValue) -> bool {
    match value {
        JsonValue::Bool(false) | JsonValue::Null => true,
        JsonValue::Number(n) => match n.as_f64() {
            Some(n) if n == 0f64 => true,
            Some(n) if n == -0f64 => true,
            Some(n) if n.is_nan() => true, // this should never happen in JSON
            _ => false,
        },
        JsonValue::String(s) if s.len() == 0 => true,
        _ => false,
    }
}

#[cfg(test)]
mod test {
    use crate::json::json;

    use super::*;

    #[test]
    fn test_unary_plus() {
        assert_eq!(eval_unary(UnaryOperator::Plus, json!(1)), json!(1));
        assert_eq!(eval_unary(UnaryOperator::Plus, json!("")), json!(0));
        assert_eq!(eval_unary(UnaryOperator::Plus, json!("1")), json!(1));
        assert_eq!(eval_unary(UnaryOperator::Plus, json!("a")), json!(null));
        assert_eq!(eval_unary(UnaryOperator::Plus, json!([2])), json!(2));
        assert_eq!(eval_unary(UnaryOperator::Plus, json!([1, 2])), json!(null));
        assert_eq!(eval_unary(UnaryOperator::Plus, json!(null)), json!(0));
        assert_eq!(eval_unary(UnaryOperator::Plus, json!({})), json!(null));
        assert_eq!(eval_unary(UnaryOperator::Plus, json!(true)), json!(1));
        assert_eq!(eval_unary(UnaryOperator::Plus, json!(false)), json!(0));
    }
}
