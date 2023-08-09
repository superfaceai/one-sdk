use std::str::Chars;

use super::{LexerToken, LexerTokenData};

#[derive(Clone)]
pub struct Tokenizer<'a> {
    chars: Chars<'a>,
    offset_begin: usize,
    offset: usize,
}
impl<'a> Tokenizer<'a> {
    fn next(&mut self) -> Option<char> {
        match self.chars.next() {
            None => None,
            Some(c) => {
                self.offset += 1;
                Some(c)
            }
        }
    }

    #[inline]
    fn advance(&mut self, count: usize) {
        for _ in 0..count {
            self.next();
        }
    }

    /// Consumes chars that pass the filter function and returns their count.
    fn advance_if<'i>(&mut self, f: impl Fn(char) -> bool) -> usize {
        let count = self.chars.clone().take_while(|&c| f(c)).count();
        self.advance(count);

        count
    }

    fn token(&mut self, data: LexerTokenData) -> LexerToken {
        let token = LexerToken {
            data,
            offset: self.offset_begin,
            len: self.offset - self.offset_begin,
        };
        self.offset_begin = self.offset;

        token
    }

    /// Peeks N tokens ahead without consuming them.
    fn peek<const N: usize>(&mut self) -> [Option<char>; N] {
        let mut chars = self.chars.clone();
        [(); N].map(move |_| chars.next())
    }

    fn next_token_number(&mut self, first_char: char) -> LexerToken {
        let radix = match (first_char, self.peek::<1>()) {
            ('0', [Some('b')]) => {
                self.advance(1);
                2
            }
            ('0', [Some('o')]) => {
                self.advance(1);
                8
            }
            ('0', [Some('x')]) => {
                self.advance(1);
                16
            }
            _ => 10,
        };

        self.advance_if(|c| c.is_digit(radix));
        if radix == 10 && matches!(self.peek::<1>(), [Some('.')]) {
            self.advance(1);
            self.advance_if(|c| c.is_ascii_digit());
            self.token(LexerTokenData::FloatNumber)
        } else {
            self.token(LexerTokenData::IntNumber)
        }
    }

    fn next_token_inner(&mut self) -> LexerToken {
        // always consume at least one char
        let first_char = match self.next() {
            None => return self.token(LexerTokenData::EndOfFile),
            Some(c) => c,
        };

        match first_char {
            '\n' => self.token(LexerTokenData::Newline),
            '(' => self.token(LexerTokenData::ParenLeft),
            ')' => self.token(LexerTokenData::ParenRight),
            '[' => self.token(LexerTokenData::BracketLeft),
            ']' => self.token(LexerTokenData::BracketRight),
            '{' => self.token(LexerTokenData::BraceLeft),
            '}' => self.token(LexerTokenData::BraceRight),
            '!' => self.token(LexerTokenData::Bang),
            '|' => self.token(LexerTokenData::Pipe),
            ',' => self.token(LexerTokenData::Comma),
            '.' => self.token(LexerTokenData::Dot),
            '=' => self.token(LexerTokenData::Equals),
            // whitespace (but not newline)
            a if a.is_whitespace() => {
                self.advance_if(|c| c.is_whitespace() && c != '\n');
                self.token(LexerTokenData::Whitespace)
            }
            // identifier
            a @ '_' | a if a.is_alphabetic() => {
                self.advance_if(|c| c.is_alphanumeric() || c == '_' || c == '-');
                self.token(LexerTokenData::Identifier)
            }
            // number
            '+' | '-' => match self.peek::<1>() {
                [Some(a)] if a.is_numeric() => {
                    self.advance(1);
                    self.next_token_number(a)
                }
                _ => self.token(LexerTokenData::Error),
            },
            a if a.is_numeric() => self.next_token_number(first_char),
            '/' => match self.peek::<1>() {
                [Some('/')] => {
                    self.advance(1);
                    self.advance_if(|c| c != '\n');
                    self.token(LexerTokenData::LineComment)
                }
                _ => self.token(LexerTokenData::Error),
            },
            q @ ('"' | '\'') => match self.peek::<2>() {
                [Some(a), Some(b)] if a == q && b == q => {
                    // start of a triple quote string
                    self.advance(2);
                    loop {
                        self.advance_if(|c| c != q);
                        match self.peek::<3>() {
                            [Some(a), Some(b), Some(c)] if a == q && b == q && c == q => {
                                self.advance(3);
                                break self.token(LexerTokenData::String);
                            }
                            [None, _, _] => break self.token(LexerTokenData::Error),
                            _ => {
                                self.advance(1);
                            }
                        }
                    }
                }
                [Some(a), _] if a == q => {
                    // empty single quote string
                    self.advance(1);
                    self.token(LexerTokenData::String)
                }
                [_, _] => {
                    // start of a single quote string
                    loop {
                        self.advance_if(|c| c != q && c != '\\');
                        match self.peek::<2>() {
                            [Some(a), _] if a == q => {
                                self.advance(1);
                                break self.token(LexerTokenData::String);
                            }
                            [Some('\\'), None] | [None, _] => {
                                self.advance(1);
                                break self.token(LexerTokenData::Error);
                            }
                            [Some('\\'), Some(_)] => {
                                self.advance(2);
                            }
                            _ => unreachable!(),
                        }
                    }
                }
            },
            _ => self.token(LexerTokenData::Error),
        }
    }

    pub fn next_token(&mut self) -> LexerToken {
        let token = self.next_token_inner();

        match token {
            LexerToken {
                data: LexerTokenData::Error,
                len: mut err_len,
                offset,
            } => {
                // error length detection attempts to find the next char where a token can be successfully detected
                // and merge all errors between here and there
                // so we clone the tokenizer to not advance past that potential valid token
                while let LexerToken {
                    data: LexerTokenData::Error,
                    len,
                    ..
                } = self.clone().next_token()
                {
                    self.advance(len);
                    err_len += len;
                }

                LexerToken {
                    data: LexerTokenData::Error,
                    len: err_len,
                    offset,
                }
            }
            t => t,
        }
    }
}

pub struct TokenizerIter<'a> {
    inner: Tokenizer<'a>,
    was_eof: bool,
}
impl<'a> TokenizerIter<'a> {
    pub fn new(source: &'a str) -> Self {
        Self {
            inner: Tokenizer {
                chars: source.chars(),
                offset_begin: 0,
                offset: 0,
            },
            was_eof: false,
        }
    }
}
impl<'a> Iterator for TokenizerIter<'a> {
    type Item = LexerToken;

    fn next(&mut self) -> Option<Self::Item> {
        match self.inner.next_token() {
            t @ LexerToken {
                data: LexerTokenData::EndOfFile,
                ..
            } => {
                if self.was_eof {
                    None
                } else {
                    self.was_eof = true;
                    Some(t)
                }
            }
            t => Some(t),
        }
    }
}
