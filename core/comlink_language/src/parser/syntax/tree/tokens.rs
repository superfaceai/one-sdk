use std::{
    str::FromStr, borrow::Cow, string::String as StdString
};

use serde::{Serialize, Deserialize};

use super::{CstToken, SyntaxKind, SyntaxKind::*, SyntaxToken, SyntaxKindSet};

macro_rules! token {
    (
        $string_name: literal
        $vis: vis struct $name: ident = $raw_kind: expr $(, $raw_kind_next: expr)* $(=> $syntax_kind: expr)?;
    ) => {
        $vis struct $name(SyntaxToken);
        impl AsRef<SyntaxToken> for $name {
            fn as_ref(&self) -> &SyntaxToken {
                &self.0
            }
        }
        impl CstToken for $name {
            const RAW_KINDS: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[$raw_kind $(, $raw_kind_next)*]);
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
token! { "." pub struct DotToken = Dot; }
token! { "=" pub struct EqualsToken = Equals; }
token! { "whitespace" pub struct WhitespaceToken = Whitespace; }
token! { "identifier" pub struct IdentifierToken = Identifier; }
impl IdentifierToken {
    pub fn value(&self) -> &str {
        self.as_ref().text()
    }
}
token! { "integer" pub struct IntNumberToken = IntNumber; }
impl IntNumberToken {
    pub fn value(&self) -> Option<isize> {
        let text = self.as_ref().text();
        
        let (sign, sign_len) = match text.chars().next()? {
            '-' => (-1, 1),
            '+' => (1, 1),
            _ => (1, 0)
        };
        let (radix, radix_len) = {
            let mut it = text[sign_len..].chars();
            match (it.next()?, it.next()) {
                ('0', Some('b')) => (2, 2),
                ('0', Some('o')) => (8, 2),
                ('0', Some('x')) => (16, 2),
                (_, _) => (10, 0)
            }
        };

        let abs_value = isize::from_str_radix(&text[sign_len + radix_len..], radix).ok()?;
        Some(abs_value * sign)
    }
}
token! { "float" pub struct FloatNumberToken = FloatNumber; }
impl FloatNumberToken {
    pub fn value(&self) -> Option<f64> {
        f64::from_str(
            self.as_ref().text()
        ).ok()
    }
}
token! { "end of file" pub struct EndOfFileToken = EndOfFile; }

token! { "true keyword" pub struct KeywordTrueToken = KeywordTrue; }
token! { "false keyword" pub struct KeywordFalseToken = KeywordFalse; }
token! { "None keyword" pub struct KeywordNoneToken = KeywordNone; }

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PrimitiveTypeName {
	Boolean,
	Number,
	String
}
token! { "primitive type name" pub struct PrimitiveTypeNameToken = KeywordString, KeywordNumber, KeywordBoolean => PrimitiveTypeName; }
impl PrimitiveTypeNameToken {
    pub fn value(&self) -> PrimitiveTypeName {
        match self.as_ref().text() {
            "string" => PrimitiveTypeName::String,
            "number" => PrimitiveTypeName::Number,
            "boolean" => PrimitiveTypeName::Boolean,
            _ => unreachable!()
        }
    }
}

token! { "name keyword" pub struct KeywordNameToken = KeywordName; }
token! { "version keyword" pub struct KeywordVersionToken = KeywordVersion; }
token! { "usecase keyword" pub struct KeywordUsecaseToken = KeywordUsecase; }

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UseCaseSafety {
    Safe,
    Idempotent,
    Unsafe
}
token! { "safe, idempotent or unsafe keyword" pub struct UseCaseSafetyToken = KeywordUnsafe, KeywordIdempotent, KeywordSafe => UseCaseSafety; }
impl UseCaseSafetyToken {
    pub fn value(&self) -> UseCaseSafety {
        match self.as_ref().text() {
            "safe" => UseCaseSafety::Safe,
            "idempotent" => UseCaseSafety::Idempotent,
            "unsafe" => UseCaseSafety::Unsafe,
            _ => unreachable!()
        }
    }
}

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
    match quote_char {
        '\'' | '"' => (),
        _ => return 0
    };

    let mut current = text;
    let mut count = 0;
    while let Some(next) = current.strip_prefix(quote_char).and_then(|c| c.strip_suffix(quote_char)) {
        current = next;
        count += 1;
    }

    count
}

fn string_literal_value(raw: &str) -> Option<Cow<'_, str>> {
    let quote_count = quote_pair_count(raw);
    if quote_count != 1 && quote_count != 3 {
        return None;
    }
    // TODO: resolve escapes
    Some(
        Cow::Borrowed(&raw[quote_count .. raw.len() - quote_count])
    )
}

token! { "string literal" pub struct StringLiteralToken = String => StringLiteral; }
impl StringLiteralToken {
    pub fn value(&self) -> Option<Cow<'_, str>> { string_literal_value(self.as_ref().text()) }
}

#[derive(Serialize, Deserialize)]
pub struct Documentation {
    pub title: StdString,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<StdString>
}
token! { "doc string" pub struct StringDocToken = String => StringDoc; }
impl StringDocToken {
    pub fn value(&self) -> Option<Documentation> {
        let text = string_literal_value(self.as_ref().text())?;
        let text = text.trim();
        
        Some(match text.split_once('\n') {
            None => Documentation { title: text.to_string(), description: None },
            Some((title, description)) => Documentation {
                title: title.trim().to_string(),
                description: Some(description.trim().to_string())
            }
        })
    }
}

token! { "identifier or string field name" pub struct FieldNameToken = Identifier, String => FieldName; }
impl FieldNameToken {
    pub fn value(&self) -> Option<Cow<'_, str>> {
        let raw = self.as_ref().text();
        let quote_count = quote_pair_count(raw);
        if quote_count != 0 && quote_count != 1 && quote_count != 3 {
            return None;
        }

        Some(
            Cow::Borrowed(&raw[quote_count .. raw.len() - quote_count])
        )
    }
}

#[derive(Serialize, Deserialize)]
pub struct ProfileId {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scope: Option<StdString>,
    pub name: StdString
}
token! { "profile name" pub struct ProfileNameToken = String => ProfileName; }
impl ProfileNameToken {
    pub fn id(&self) -> Option<ProfileId> {
        let text = string_literal_value(self.as_ref().text())?;
        Some(match text.split_once('/') {
            None => ProfileId { scope: None, name: text.into_owned() },
            Some((scope, name)) => ProfileId { scope: Some(scope.to_string()), name: name.to_string() }
        })
    }
}

#[derive(Serialize, Deserialize)]
pub struct ProfileVersion {
    pub major: usize,
    pub minor: usize,
    pub patch: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<std::string::String>
}
token! { "profile version" pub struct ProfileVersionToken = String => ProfileVersion; }
impl ProfileVersionToken {
    pub fn value(&self) -> Option<ProfileVersion> {
        let value = string_literal_value(self.as_ref().text())?;
        
        let mut it = value.split('.');

        Some(ProfileVersion {
            major: it.next()?.parse::<usize>().ok()?,
            minor: it.next()?.parse::<usize>().ok()?,
            patch: it.next()?.parse::<usize>().ok()?,
            label: None
        })
    }
}

