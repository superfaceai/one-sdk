use std::borrow::Cow;

use super::{AstToken, SyntaxKind, SyntaxKind::*, SyntaxToken};

macro_rules! token {
    (
        $string_name: literal
        $vis: vis struct $name: ident = $raw_kind: expr $(=> $syntax_kind: expr)?;
    ) => {
        $vis struct $name(SyntaxToken);
        impl AsRef<SyntaxToken> for $name {
            fn as_ref(&self) -> &SyntaxToken {
                &self.0
            }
        }
        impl AstToken for $name {
            const RAW_KIND: SyntaxKind = $raw_kind;
            #[allow(path_statements)]
            const KIND: SyntaxKind = { $raw_kind $(; $syntax_kind)? };
            const EXPECT_MESSAGE: &'static str = concat!("expected ", $string_name);

            fn cast(node: SyntaxToken) -> Option<Self> {
                if node.kind() == Self::KIND {
                    Some(Self(node))
                } else {
                    None
                }
            }
        }
    }
}

token! { "newline" pub struct NewlineToken = Newline; }
token! { "(" pub struct ParenLeftToken = ParenLeft; }
token! { ")" pub struct ParenRightToken = ParenRight; }
token! { "[" pub struct BracketLeftToken = BracketLeft; }
token! { "]" pub struct BracketRightToken = BracketRight; }
token! { "{" pub struct BraceLeftToken = BraceLeft; }
token! { "}" pub struct BraceRightToken = BraceRight; }
token! { "!" pub struct BangToken = Bang; }
token! { "|" pub struct PipeToken = Pipe; }
token! { "," pub struct CommaToken = Comma; }
token! { "=" pub struct EqualsToken = Equals; }
token! { "whitespace" pub struct WhitespaceToken = Whitespace; }
token! { "identifier" pub struct IdentifierToken = Identifier; }
token! { "integer" pub struct IntNumberToken = IntNumber; }
token! { "float" pub struct FloatNumberToken = FloatNumber; }
token! { "end of file" pub struct EndOfFileToken = EndOfFile; }

token! { "true keyword" pub struct KeywordTrueToken = KeywordTrue; }
token! { "false keyword" pub struct KeywordFalseToken = KeywordFalse; }
token! { "none keyword" pub struct KeywordNoneToken = KeywordNone; }
token! { "string keyword" pub struct KeywordStringToken = KeywordString; }
token! { "number keyword" pub struct KeywordNumberToken = KeywordNumber; }
token! { "boolean keyword" pub struct KeywordBooleanToken = KeywordBoolean; }
token! { "name keyword" pub struct KeywordNameToken = KeywordName; }
token! { "version keyword" pub struct KeywordVersionToken = KeywordVersion; }
token! { "usecase keyword" pub struct KeywordUsecaseToken = KeywordUsecase; }
token! { "safe keyword" pub struct KeywordSafeToken = KeywordSafe; }
token! { "idempotent keyword" pub struct KeywordIdempotentToken = KeywordIdempotent; }
token! { "unsafe keyword" pub struct KeywordUnsafeToken = KeywordUnsafe; }
token! { "input keyword" pub struct KeywordInputToken = KeywordInput; }
token! { "result keyword" pub struct KeywordResultToken = KeywordResult; }
token! { "async keyword" pub struct KeywordAsyncToken = KeywordAsync; }
token! { "error keyword" pub struct KeywordErrorToken = KeywordError; }
token! { "example keyword" pub struct KeywordExampleToken = KeywordExample; }
token! { "model keyword" pub struct KeywordModelToken = KeywordModel; }
token! { "field keyword" pub struct KeywordFieldToken = KeywordField; }
token! { "enum keyword" pub struct KeywordEnumToken = KeywordEnum; }

/// Returns the number of paired quote characters around the `text`.
fn quote_pair_count(text: &str) -> usize {
    let quote_char = text.chars().next().unwrap();

    let mut current = text;
    let mut count = 0;
    while let Some(next) = current.strip_prefix(quote_char).and_then(|c| c.strip_suffix(quote_char)) {
        current = next;
        count += 1;
    }

    count
}

token! {
    "string literal"
    pub struct StringLiteralToken = String => StringLiteral;
}
impl StringLiteralToken {
    pub fn text(&self) -> Option<Cow<'_, str>> {
        let text = self.as_ref().text();
        let quote_count = quote_pair_count(text);
        if quote_count != 1 && quote_count != 3 {
            return None;
        }
        // TODO: resolve escapes
        Some(Cow::Borrowed(
            &text[quote_count .. text.len() - quote_count]
        ))
    }
}

token! {
    "doc string"
    pub struct StringDocToken = String => StringDoc;
}
