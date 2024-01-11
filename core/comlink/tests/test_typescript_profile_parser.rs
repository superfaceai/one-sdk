use pretty_assertions::assert_eq;

use comlink::json::JsonValue;

macro_rules! prepare_test {
    (
		source: $source: literal,
		expected: $expected: literal
	) => {
        let source = include_str!($source);
        let expected: JsonValue = serde_json::from_str(include_str!($expected)).unwrap();

        let (profile, _spans, errors) = comlink::typescript_parser::parse_profile(source);
        if !errors.is_empty() {
            eprintln!("errors:{:#?}", errors);
        }
        assert!(errors.is_empty());

        let actual = serde_json::to_value(&profile).unwrap();
        assert_eq!(expected, actual);
    };
}

#[test]
fn test_p1() {
    prepare_test!(source: "fixtures/typescript_profile/p1.profile.ts", expected: "fixtures/typescript_profile/p1.profile.json");
}
