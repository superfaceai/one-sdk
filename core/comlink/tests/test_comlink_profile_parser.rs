use pretty_assertions::assert_eq;

use comlink::json::JsonValue;

fn clean_json_ast(value: &mut JsonValue) {
    match value {
        JsonValue::Array(a) => a.iter_mut().for_each(clean_json_ast),
        JsonValue::Object(obj) => {
            // parser version doesn't have to match, all other fields should
            obj.remove("parserVersion");
            // locations don't match in some places
            // - original parser did not include documentation location into the main node
            // - NonNullDefinition is doesn't exist now and is emulated
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

        let (profile, errors) = comlink::comlink_parser::parse_profile(source);
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
    prepare_test!(source: "fixtures/comlink_language/p1.profile", expected: "fixtures/comlink_language/p1.json");
}

#[test]
fn test_p2() {
    prepare_test!(source: "fixtures/comlink_language/p2.profile", expected: "fixtures/comlink_language/p2.json");
}

#[test]
fn test_p3() {
    prepare_test!(source: "fixtures/comlink_language/p3.profile", expected: "fixtures/comlink_language/p3.json");
}

#[test]
fn test_p4() {
    prepare_test!(source: "fixtures/comlink_language/p4.profile", expected: "fixtures/comlink_language/p4.json");
}
