mod tokenizer;

#[cfg_attr(test, derive(PartialEq, Eq))]
#[derive(Debug)]
pub enum LexerTokenData {
    Error,
    Newline,
    ParenLeft,
    ParenRight,
    BracketLeft,
    BracketRight,
    BraceLeft,
    BraceRight,
    Bang,
    Pipe,
    Comma,
    Equals,
    Whitespace,
    Identifier,
    IntNumber,
    FloatNumber,
    String,
    LineComment,
    EndOfFile,
}

#[cfg_attr(test, derive(PartialEq, Eq))]
#[derive(Debug)]
pub struct LexerToken {
    pub data: LexerTokenData,
    pub offset: usize,
    pub len: usize,
}

pub fn tokenize<'a>(source: &'a str) -> impl Iterator<Item = LexerToken> + 'a {
    tokenizer::TokenizerIter::new(source)
}

pub struct LexedString<'a> {
    source: &'a str,
    tokens: Vec<LexerToken>,
}
impl<'a> LexedString<'a> {
    pub fn new(source: &'a str) -> Self {
        let tokens = tokenize(source).collect();

        Self { source, tokens }
    }

    pub fn token(&self, index: usize) -> Option<&LexerToken> {
        self.tokens.get(index)
    }

    pub fn token_text(&self, index: usize) -> Option<&'a str> {
        match self.token(index) {
            None => None,
            Some(LexerToken { offset, len, .. }) => Some(&self.source[*offset..][..*len]),
        }
    }
}

#[cfg(test)]
mod test {
    use super::{LexerToken, LexerTokenData};

    #[test]
    fn test_lexer() {
        let source = "() []  {} \n!|,=// abc\ntrue 1a a1 1.23 'ab\n' \"ab\n\" '''ab\n''' \"\"\"ab\n\"\"\" //last comment";

        let tokens: Vec<_> = super::tokenize(source).collect();
        let expected = vec![
            // `() `
            LexerToken {
                data: LexerTokenData::ParenLeft,
                len: 1,
                offset: 0,
            },
            LexerToken {
                data: LexerTokenData::ParenRight,
                len: 1,
                offset: 1,
            },
            LexerToken {
                data: LexerTokenData::Whitespace,
                len: 1,
                offset: 2,
            },
            // `[] `
            LexerToken {
                data: LexerTokenData::BracketLeft,
                len: 1,
                offset: 3,
            },
            LexerToken {
                data: LexerTokenData::BracketRight,
                len: 1,
                offset: 4,
            },
            LexerToken {
                data: LexerTokenData::Whitespace,
                len: 2,
                offset: 5,
            },
            // `{} `
            LexerToken {
                data: LexerTokenData::BraceLeft,
                len: 1,
                offset: 7,
            },
            LexerToken {
                data: LexerTokenData::BraceRight,
                len: 1,
                offset: 8,
            },
            LexerToken {
                data: LexerTokenData::Whitespace,
                len: 1,
                offset: 9,
            },
            // `\n!|,=`
            LexerToken {
                data: LexerTokenData::Newline,
                len: 1,
                offset: 10,
            },
            LexerToken {
                data: LexerTokenData::Bang,
                len: 1,
                offset: 11,
            },
            LexerToken {
                data: LexerTokenData::Pipe,
                len: 1,
                offset: 12,
            },
            LexerToken {
                data: LexerTokenData::Comma,
                len: 1,
                offset: 13,
            },
            LexerToken {
                data: LexerTokenData::Equals,
                len: 1,
                offset: 14,
            },
            // `// abc\n`
            LexerToken {
                data: LexerTokenData::LineComment,
                len: 6,
                offset: 15,
            },
            LexerToken {
                data: LexerTokenData::Newline,
                len: 1,
                offset: 21,
            },
            // `abc `
            LexerToken {
                data: LexerTokenData::Identifier,
                len: 4,
                offset: 22,
            },
            LexerToken {
                data: LexerTokenData::Whitespace,
                len: 1,
                offset: 26,
            },
            // `1a `
            LexerToken {
                data: LexerTokenData::IntNumber,
                len: 1,
                offset: 27,
            },
            LexerToken {
                data: LexerTokenData::Identifier,
                len: 1,
                offset: 28,
            },
            LexerToken {
                data: LexerTokenData::Whitespace,
                len: 1,
                offset: 29,
            },
            // `a1 `
            LexerToken {
                data: LexerTokenData::Identifier,
                len: 2,
                offset: 30,
            },
            LexerToken {
                data: LexerTokenData::Whitespace,
                len: 1,
                offset: 32,
            },
            // `1.23 `
            LexerToken {
                data: LexerTokenData::FloatNumber,
                len: 4,
                offset: 33,
            },
            LexerToken {
                data: LexerTokenData::Whitespace,
                len: 1,
                offset: 37,
            },
            // `'ab\n' `
            LexerToken {
                data: LexerTokenData::String,
                len: 5,
                offset: 38,
            },
            LexerToken {
                data: LexerTokenData::Whitespace,
                len: 1,
                offset: 43,
            },
            // `"ab\n" `
            LexerToken {
                data: LexerTokenData::String,
                len: 5,
                offset: 44,
            },
            LexerToken {
                data: LexerTokenData::Whitespace,
                len: 1,
                offset: 49,
            },
            // `'''ab\n''' `
            LexerToken {
                data: LexerTokenData::String,
                len: 9,
                offset: 50,
            },
            LexerToken {
                data: LexerTokenData::Whitespace,
                len: 1,
                offset: 59,
            },
            // `"""ab\n""" `
            LexerToken {
                data: LexerTokenData::String,
                len: 9,
                offset: 60,
            },
            LexerToken {
                data: LexerTokenData::Whitespace,
                len: 1,
                offset: 69,
            },
            // `//last comment`
            LexerToken {
                data: LexerTokenData::LineComment,
                len: 14,
                offset: 70,
            },
            LexerToken {
                data: LexerTokenData::EndOfFile,
                len: 0,
                offset: 84,
            },
        ];

        for i in 0..expected.len().max(tokens.len()) {
            assert_eq!(tokens[i], expected[i], "token {} doesn't match", i);
        }
    }

    #[test]
    fn test_lexer_strings() {
        let source = r#"
        "1"
        "1\"4"
        """123"""
        """1"3"""
        '1'
        '1\'4'
        '''123'''
        '''1'3'''
        "#;

        let tokens: Vec<_> = super::tokenize(source)
            .filter(|t| !matches!(t.data, LexerTokenData::Whitespace | LexerTokenData::Newline))
            .collect();
        let expected = vec![
            LexerToken {
                data: LexerTokenData::String,
                len: 3,
                offset: 9,
            },
            LexerToken {
                data: LexerTokenData::String,
                len: 6,
                offset: 21,
            },
            LexerToken {
                data: LexerTokenData::String,
                len: 9,
                offset: 36,
            },
            LexerToken {
                data: LexerTokenData::String,
                len: 9,
                offset: 54,
            },
            LexerToken {
                data: LexerTokenData::String,
                len: 3,
                offset: 72,
            },
            LexerToken {
                data: LexerTokenData::String,
                len: 6,
                offset: 84,
            },
            LexerToken {
                data: LexerTokenData::String,
                len: 9,
                offset: 99,
            },
            LexerToken {
                data: LexerTokenData::String,
                len: 9,
                offset: 117,
            },
            LexerToken {
                data: LexerTokenData::EndOfFile,
                len: 0,
                offset: 135,
            },
        ];

        for i in 0..expected.len().max(tokens.len()) {
            assert_eq!(tokens[i], expected[i], "token {} doesn't match", i + 1);
        }
    }

    #[test]
    fn test_lexer_numbers() {
        let source = r#"
        1234567890
        123.9870
        0b10
        0o01234567
        0xabcdef1234567890ABCDEF
        -1
        -1.23
        +1
        +1.23
        -0b01
        +0b10
        -0o1
        -0xaB
        "#;

        let tokens: Vec<_> = super::tokenize(source)
            .filter(|t| !matches!(t.data, LexerTokenData::Whitespace | LexerTokenData::Newline))
            .collect();
        let expected = vec![
            LexerToken {
                data: LexerTokenData::IntNumber,
                len: 10,
                offset: 9,
            },
            LexerToken {
                data: LexerTokenData::FloatNumber,
                len: 8,
                offset: 28,
            },
            LexerToken {
                data: LexerTokenData::IntNumber,
                len: 4,
                offset: 45,
            },
            LexerToken {
                data: LexerTokenData::IntNumber,
                len: 10,
                offset: 58,
            },
            LexerToken {
                data: LexerTokenData::IntNumber,
                len: 24,
                offset: 77,
            },
            LexerToken {
                data: LexerTokenData::IntNumber,
                len: 2,
                offset: 110,
            },
            LexerToken {
                data: LexerTokenData::FloatNumber,
                len: 5,
                offset: 121,
            },
            LexerToken {
                data: LexerTokenData::IntNumber,
                len: 2,
                offset: 135,
            },
            LexerToken {
                data: LexerTokenData::FloatNumber,
                len: 5,
                offset: 146,
            },
            LexerToken {
                data: LexerTokenData::IntNumber,
                len: 5,
                offset: 160,
            },
            LexerToken {
                data: LexerTokenData::IntNumber,
                len: 5,
                offset: 174,
            },
            LexerToken {
                data: LexerTokenData::IntNumber,
                len: 4,
                offset: 188,
            },
            LexerToken {
                data: LexerTokenData::IntNumber,
                len: 5,
                offset: 201,
            },
            LexerToken {
                data: LexerTokenData::EndOfFile,
                len: 0,
                offset: 215,
            },
        ];

        for i in 0..expected.len().max(tokens.len()) {
            assert_eq!(tokens[i], expected[i], "token {} doesn't match", i + 1);
        }
    }
}
