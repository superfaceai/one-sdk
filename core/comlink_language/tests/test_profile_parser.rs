use pretty_assertions::assert_eq;

use serde_json::Value as JsonValue;

fn clean_json_ast(value: &mut JsonValue) {
    match value {
        JsonValue::Array(a) => a.iter_mut().for_each(clean_json_ast),
        JsonValue::Object(obj) => {
            // TODO: match these as well
            obj.remove("astMetadata");
            obj.remove("location");
            for child in obj.values_mut() {
                clean_json_ast(child);
            }
        }
        _ => (),
    }
}

macro_rules! prepare_test {
    (
		source: $source: literal,
		expected: $expected: literal
	) => {
        let source = include_str!($source);
        let mut expected: JsonValue = serde_json::from_str(include_str!($expected)).unwrap();
        clean_json_ast(&mut expected);

        let (profile, errors) = comlink_language::parser::parse_profile(source);
        if !errors.is_empty() {
            eprintln!("errors:{:#?}", errors);
        }
        assert!(errors.is_empty());

        let mut actual = serde_json::to_value(&profile).unwrap();
        clean_json_ast(&mut actual);
        assert_eq!(actual, expected);
    };
}

#[test]
fn test_p1() {
    prepare_test!(source: "fixtures/p1.profile", expected: "fixtures/p1.json");
}

#[test]
fn test_p2() {
    prepare_test!(source: "fixtures/p2.profile", expected: "fixtures/p2.json");
}

#[test]
fn test_p3() {
    prepare_test!(source: "fixtures/p3.profile", expected: "fixtures/p3.json");
}

#[test]
fn test_p4() {
    prepare_test!(source: "fixtures/p4.profile", expected: "fixtures/p4.json");
}
