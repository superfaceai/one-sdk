use crate::parser::{
    lexer::{tokenize, LexerToken, LexerTokenData},
    syntax::{SyntaxKind, SyntaxKindSet},
};

use super::{CstNode, CstToken, TreeParser};

#[derive(Debug)]
pub struct ParserError {
    pub message: String,
    pub offset: usize,
}

struct ParserToken {
    pub kind: SyntaxKind,
    pub offset: usize,
    pub len: usize,
}
#[derive(Debug)]
enum ParserEvent {
    FrameStart {
        position: usize,
    },
    NodeStart {
        kind: SyntaxKind,
    },
    NodeEnd,
    /// Token is a tree leaf and comes directly from the lexed tokens.
    Token {
        kind: SyntaxKind,
    },
    /// Special case of `Token` which represents an error with a message.
    Error {
        message: String,
    },
}

/// Struct representing parser state, passed into rule functions during parsing.
pub struct Parser<'a> {
    source: &'a str,
    /// Tokens from `source` but without trvia tokens.
    ///
    /// Trivia tokens are added back again while the resulting tree is built.
    tokens: Vec<ParserToken>,
    /// Events represent start, token and end events as will be called on syntax tree builder.
    ///
    /// However, the kind of a start node is sometimes only known after it has been started, so
    /// these events are first collected and only then recorded into the builder.
    events: Vec<ParserEvent>,
    /// Current position in `tokens`.
    position: usize,
    /// Stack of position of active `NodeStart` events
    active_stack: Vec<usize>,
}
impl<'a> Parser<'a> {
    const TRIVIA_TOKENS: SyntaxKindSet = SyntaxKindSet::trivia_tokens();

    pub fn new(source: &'a str) -> Self {
        let tokens: Vec<_> = tokenize(source)
            .filter_map(|t| {
                let t = Self::map_token(t);
                if Self::TRIVIA_TOKENS.contains(t.kind) {
                    None
                } else {
                    Some(t)
                }
            })
            .collect();
        assert!(!tokens.is_empty());

        Self {
            source,
            tokens,
            events: Vec::new(),
            position: 0,
            active_stack: Vec::new(),
        }
    }

    fn map_token(lexer_token: LexerToken) -> ParserToken {
        let kind = match lexer_token.data {
            LexerTokenData::Error => SyntaxKind::Error,
            LexerTokenData::Newline => SyntaxKind::Newline,
            LexerTokenData::ParenLeft => SyntaxKind::ParenLeft,
            LexerTokenData::ParenRight => SyntaxKind::ParenRight,
            LexerTokenData::BracketLeft => SyntaxKind::BracketLeft,
            LexerTokenData::BracketRight => SyntaxKind::BracketRight,
            LexerTokenData::BraceLeft => SyntaxKind::BraceLeft,
            LexerTokenData::BraceRight => SyntaxKind::BraceRight,
            LexerTokenData::Bang => SyntaxKind::Bang,
            LexerTokenData::Pipe => SyntaxKind::Pipe,
            LexerTokenData::Comma => SyntaxKind::Comma,
            LexerTokenData::Dot => SyntaxKind::Dot,
            LexerTokenData::Equals => SyntaxKind::Equals,
            LexerTokenData::Whitespace => SyntaxKind::Whitespace,
            LexerTokenData::Identifier => SyntaxKind::Identifier,
            LexerTokenData::IntNumber => SyntaxKind::IntNumber,
            LexerTokenData::FloatNumber => SyntaxKind::FloatNumber,
            LexerTokenData::String => SyntaxKind::String,
            LexerTokenData::LineComment => SyntaxKind::LineComment,
            LexerTokenData::EndOfFile => SyntaxKind::EndOfFile,
        };

        ParserToken {
            kind,
            offset: lexer_token.offset,
            len: lexer_token.len,
        }
    }

    /// Returns the text of the next token.
    fn peek_text(&self) -> &str {
        let token = &self.tokens[self.position];

        &self.source[token.offset..][..token.len]
    }

    /// Advance current token position by up to `count` tokens.
    #[inline]
    fn advance(&mut self, count: usize) {
        self.position = (self.position + count).min(self.tokens.len() - 1);
    }

    pub fn build_tree(self) -> (rowan::GreenNode, Vec<ParserError>) {
        assert_eq!(self.active_stack.len(), 0);

        let mut builder = rowan::GreenNodeBuilder::new();
        let mut errors = Vec::new();
        let mut error_offset = 0;

        // the parser internally stores tokens without trivia, so here we replay all the events
        // and output trivia tokens in-between as appropriate - this ensures that nodes never start nor end with trivia - it's always pushed to the outermost node
        let mut tokens = tokenize(self.source).map(Self::map_token).peekable();
        macro_rules! skip_trivia {
            () => {
                #[allow(unused_assignments)]
                while tokens
                    .peek()
                    .map(|t| Self::TRIVIA_TOKENS.contains(t.kind))
                    .unwrap_or(false)
                {
                    let token = tokens.next().unwrap();

                    builder.token(token.kind.into(), &self.source[token.offset..][..token.len]);
                    error_offset = token.offset + token.len;
                }
            };
        }

        for event in self.events {
            match event {
                // this means there is an unclosed frame - this is a bug
                ParserEvent::FrameStart { .. } => unreachable!(),
                // skip trivia before node start so that nodes never start with trivia
                ParserEvent::NodeStart { kind } => {
                    skip_trivia!();

                    builder.start_node(kind.into());
                }
                ParserEvent::NodeEnd => builder.finish_node(),
                // skip trivia before each token
                ParserEvent::Token { kind } => {
                    skip_trivia!();

                    let token = tokens.next().unwrap();
                    builder.token(kind.into(), &self.source[token.offset..][..token.len]);
                    error_offset = token.offset + token.len;
                }
                ParserEvent::Error { message } => {
                    errors.push(ParserError {
                        message,
                        offset: error_offset,
                    });
                }
            }
        }
        // skip trivia so that final trivia is included
        skip_trivia!();
        debug_assert!(tokens.next().is_none());

        (builder.finish(), errors)
    }
}
impl TreeParser for Parser<'_> {
    fn start_frame(&mut self) {
        self.active_stack.push(self.events.len());
        self.events.push(ParserEvent::FrameStart {
            position: self.position,
        });
    }

    fn finish_frame_node<N: CstNode>(&mut self) {
        let start_index = self.active_stack.pop().unwrap();
        debug_assert!(matches!(
            self.events[start_index],
            ParserEvent::FrameStart { .. }
        ));

        self.events[start_index] = ParserEvent::NodeStart { kind: N::KIND };
        self.events.push(ParserEvent::NodeEnd);
    }

    fn cancel_frame(&mut self) {
        let start_index = self.active_stack.pop().unwrap();
        let old_position = match self.events[start_index] {
            ParserEvent::FrameStart { position } => position,
            _ => unreachable!(),
        };

        self.position = old_position;
        self.events.truncate(start_index);
    }

    fn token<T: CstToken>(&mut self) {
        self.events.push(ParserEvent::Token { kind: T::KIND });
        self.advance(1);
    }

    fn error<M>(&mut self, message: M, recovery_set: SyntaxKindSet)
    where
        String: From<M>,
    {
        self.events.push(ParserEvent::Error {
            message: String::from(message),
        });
        let next = self.peek();
        if !recovery_set.contains(next) {
            self.events.push(ParserEvent::Token { kind: next });
            self.advance(1);
        }
    }

    #[inline]
    fn peek(&self) -> SyntaxKind {
        self.tokens[self.position].kind
    }

    fn peek_keyword(&self) -> SyntaxKind {
        let kind = self.peek();
        if kind != SyntaxKind::Identifier {
            return kind;
        }

        match self.peek_text() {
            "true" => SyntaxKind::KeywordTrue,
            "false" => SyntaxKind::KeywordFalse,
            "None" => SyntaxKind::KeywordNone,
            "string" => SyntaxKind::KeywordString,
            "number" => SyntaxKind::KeywordNumber,
            "boolean" => SyntaxKind::KeywordBoolean,
            "name" => SyntaxKind::KeywordName,
            "version" => SyntaxKind::KeywordVersion,
            "usecase" => SyntaxKind::KeywordUsecase,
            "safe" => SyntaxKind::KeywordSafe,
            "idempotent" => SyntaxKind::KeywordIdempotent,
            "unsafe" => SyntaxKind::KeywordUnsafe,
            "input" => SyntaxKind::KeywordInput,
            "result" => SyntaxKind::KeywordResult,
            "async" => SyntaxKind::KeywordAsync,
            "error" => SyntaxKind::KeywordError,
            "example" => SyntaxKind::KeywordExample,
            "model" => SyntaxKind::KeywordModel,
            "field" => SyntaxKind::KeywordField,
            "enum" => SyntaxKind::KeywordEnum,
            _ => kind,
        }
    }

    fn skip<T: CstToken>(&mut self) -> usize {
        let mut count = 0;
        while T::RAW_KINDS.contains(self.peek()) {
            self.token::<T>();
            count += 1;
        }

        count
    }
}
impl std::fmt::Debug for Parser<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let current_tokens = {
            let t = &self.tokens[self.position..];
            &t[..t.len().min(5)]
        };
        let before_tokens = {
            let before_len = self.position - self.position.saturating_sub(2);
            &self.tokens[self.position - before_len..][..before_len]
        };

        for token in before_tokens {
            write!(
                f,
                "{:?}:{:?}@{}..{} ",
                &self.source[token.offset..][..token.len],
                token.kind,
                token.offset,
                token.offset + token.len
            )?;
        }
        write!(f, "| ")?;
        for token in current_tokens {
            write!(
                f,
                "{:?}:{:?}@{}..{} ",
                &self.source[token.offset..][..token.len],
                token.kind,
                token.offset,
                token.offset + token.len
            )?;
        }

        Ok(())
    }
}
