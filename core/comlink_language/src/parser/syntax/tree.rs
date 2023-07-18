use crate::parser::{
    lexer::{tokenize, LexerToken, LexerTokenData},
    syntax::{SyntaxKind, SyntaxNode, SyntaxToken, SyntaxElement},
};

pub mod nodes;
pub mod tokens;

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
    NodeStart {
        kind: Option<SyntaxKind>,
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
/// Set of tokens which in case of an unexpected token are not consumend as part of the error.
///
/// These are usually block terminators and similar.
pub(self) struct TokenRecoverySet {
    tokens: std::borrow::Cow<'static, [SyntaxKind]>,
}
impl TokenRecoverySet {
    pub const fn empty() -> Self {
        Self::from_static_slice(&[])
    }

    pub const fn from_static_slice(tokens: &'static [SyntaxKind]) -> Self {
        Self {
            tokens: std::borrow::Cow::Borrowed(tokens),
        }
    }

    pub fn contains(&self, kind: SyntaxKind) -> bool {
        self.tokens.as_ref().contains(&kind)
    }
}

/// Struct representing parser state, passed into rule functions during parsing.
pub struct Parser<'a> {
    source: &'a str,
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
    pub fn new(source: &'a str) -> Self {
        let tokens: Vec<_> = tokenize(source).map(Self::map_token).collect();
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

    /// Advance current token position by up to `count` tokens.
    #[inline]
    fn advance(&mut self, count: usize) {
        self.position = (self.position + count).min(self.tokens.len() - 1);
    }

    fn skip_trivia(&mut self) {
        loop {
            match self.peek() {
                kind@(SyntaxKind::Whitespace | SyntaxKind::LineComment) => {
                    self.events.push(ParserEvent::Token { kind });
                    self.advance(1);
                }
                _ => break
            }
        }
    }

    pub fn build_tree(self) -> (rowan::GreenNode, Vec<ParserError>) {
        assert_eq!(self.active_stack.len(), 0);

        let mut builder = rowan::GreenNodeBuilder::new();
        let mut errors = Vec::new();
        let mut tokens = self.tokens.into_iter();
        let mut error_offset = 0;

        for event in self.events {
            match event {
                ParserEvent::NodeStart { kind: Some(kind) } => builder.start_node(kind.into()),
                ParserEvent::NodeStart { kind: None } => unreachable!(),
                ParserEvent::NodeEnd => builder.finish_node(),
                ParserEvent::Token { kind } => {
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

        (builder.finish(), errors)
    }
}
// pub(self) functions which are available to rule definitions.
impl Parser<'_> {
    /// Start recording a node. The kind of the node is specified when [`Self::finish_node`] is called.
    pub(self) fn start_node(&mut self) {
        self.active_stack.push(self.events.len());
        self.events.push(ParserEvent::NodeStart { kind: None });
    }

    /// Finish recording the latest node.
    pub(self) fn finish_node(&mut self, final_kind: SyntaxKind) {
        let start_index = self.active_stack.pop().unwrap();
        match self.events[start_index] {
            ParserEvent::NodeStart { ref mut kind } => {
                *kind = Some(final_kind);
            }
            _ => unreachable!(),
        }
        self.events.push(ParserEvent::NodeEnd);
    }

    /// Record one raw token and assing it given `kind`.
    pub(self) fn token<T: AstToken>(&mut self) {
        self.events.push(ParserEvent::Token { kind: T::KIND });
        self.advance(1);
        self.skip_trivia();
    }

    /// Record an error event.
    ///
    /// Advances by one token unless the next token is in `recovery_set`.
    pub(self) fn error<M>(&mut self, message: M, recovery_set: TokenRecoverySet)
    where
        String: From<M>,
    {
        self.events.push(ParserEvent::Error {
            message: String::from(message),
        });
        if !recovery_set.contains(self.peek()) {
            self.advance(1);
            self.skip_trivia();
        }
    }

    /// Returns the kind of the next token.
    #[inline]
    pub(self) fn peek(&self) -> SyntaxKind {
        self.tokens[self.position].kind
    }

    /// Returns the text of the next token.
    fn peek_text(&self) -> &str {
        let token = &self.tokens[self.position];

        &self.source[token.offset..][..token.len]
    }

    /// Like [`Self::peek`] but transforms valid identifiers into keywords.
    pub(self) fn peek_keyword(&self) -> SyntaxKind {
        let kind = self.peek();
        if kind != SyntaxKind::Identifier {
            return kind;
        }

        match self.peek_text() {
            "true" => SyntaxKind::KeywordTrue,
            "false" => SyntaxKind::KeywordFalse,
            "none" => SyntaxKind::KeywordNone,
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
            _ => kind
        }
    }

    pub(self) fn skip<T: AstToken>(&mut self) -> usize {
        let mut count = 0;
        while self.peek() == T::RAW_KIND {
            self.events.push(ParserEvent::Token { kind: T::KIND });
            self.advance(1);
            count += 1;

            self.skip_trivia();
        }

        count
    }

    /// Convenience function for consuming the next token if it is of `kind`, otherwise records an error.
    ///
    /// See [`Self::error`] for more info about `recovery_set`.
    pub(self) fn expect<T: AstToken>(
        &mut self,
        recovery_set: TokenRecoverySet,
    ) {
        if self.peek() != T::RAW_KIND {
            self.error(T::EXPECT_MESSAGE, recovery_set);
        } else {
            self.token::<T>();
        }
    }

    /// Same as [`Self::expect`] but uses [`Self::peek_keyword`] instead of [`Self::peek`].
    pub(self) fn expect_keyword<T: AstToken>(
        &mut self,
        recovery_set: TokenRecoverySet
    ) {
        if self.peek_keyword() != T::RAW_KIND {
            self.error(T::EXPECT_MESSAGE, recovery_set);
        } else {
            self.token::<T>();
        }
    }

    pub(self) fn opt<T: AstToken>(&mut self) -> bool {
        if self.peek() == T::RAW_KIND {
            self.token::<T>();
            true
        } else {
            false
        }
    }
}
impl std::fmt::Debug for Parser<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let current_tokens = {
            let t = &self.tokens[self.position ..];
            &t[.. t.len().min(5)]
        };
        let before_tokens = {
            let before_len = self.position - self.position.saturating_sub(2);
            &self.tokens[self.position - before_len ..][.. before_len]
        };

        for token in before_tokens {
            write!(f, "{:?}:{:?}@{}..{} ", &self.source[token.offset ..][.. token.len], token.kind, token.offset, token.offset + token.len)?;
        }
        write!(f, "| ")?;
        for token in current_tokens {
            write!(f, "{:?}:{:?}@{}..{} ", &self.source[token.offset ..][.. token.len], token.kind, token.offset, token.offset + token.len)?;
        }

        Ok(())
    }
}

/// An ast node.
pub trait AstNode: Sized + AsRef<SyntaxNode> {
    const KIND: SyntaxKind;

    /// Parse this node from the given parser.
    ///
    /// The parsed node and the error are stored in the parser.
    fn parse(parser: &mut Parser);

    /// Parses this node directly from a string.
    ///
    /// This is a convenience method implemented using [`Self::parse`].
    fn parse_root(source: &str) -> (Self, Vec<ParserError>) {
        let mut parser = Parser::new(source);

        Self::parse(&mut parser);

        let (node, errors) = parser.build_tree();
        (Self::cast(SyntaxNode::new_root(node)).unwrap(), errors)
    }

    /// Attempts to cast `node` into `Self`.
    ///
    /// If node is of a different kind than `Self::KIND` then this returns `None`.
    fn cast(node: SyntaxNode) -> Option<Self>;
}
pub trait AstToken: Sized + AsRef<SyntaxToken> {
    const RAW_KIND: SyntaxKind;
    const KIND: SyntaxKind;
    const EXPECT_MESSAGE: &'static str;

    /// Attempts to cast `token` into `Self`.
    ///
    /// If token is of a different kind than `Self::KIND` then this returns `None`.
    fn cast(token: SyntaxToken) -> Option<Self>;
}

#[cfg(test)]
mod test {
    use std::borrow::Borrow;

    use crate::parser::{AstNode, syntax::ObjectDefinitionNode, testing::syntax_tree_print};

    #[test]
    fn test_me() {
        let source: &str = "{ 'field doc' \n field! string \n '''f2 doc''' f2 number, f3 boolean, f4! }";

        let (node, errors) = ObjectDefinitionNode::parse_root(source);

        assert_eq!(
            syntax_tree_print(&node.as_ref().green().borrow()),
            "ObjectDefinition[73]:
  BraceLeft[1]
  Whitespace[1]
  FieldDefinition[28]:
    StringDoc[11]
    Whitespace[1]
    Newline[1]
    Whitespace[1]
    Identifier[5]
    Bang[1]
    Whitespace[1]
    TypeDefinition[7]:
      PrimitiveTypeName[7]:
        KeywordString[6]
        Whitespace[1]
  Newline[1]
  Whitespace[1]
  FieldDefinition[22]:
    StringDoc[12]
    Whitespace[1]
    Identifier[2]
    Whitespace[1]
    TypeDefinition[6]:
      PrimitiveTypeName[6]:
        KeywordNumber[6]
  Comma[1]
  Whitespace[1]
  FieldDefinition[10]:
    Identifier[2]
    Whitespace[1]
    TypeDefinition[7]:
      PrimitiveTypeName[7]:
        KeywordBoolean[7]
  Comma[1]
  Whitespace[1]
  FieldDefinition[4]:
    Identifier[2]
    Bang[1]
    Whitespace[1]
  BraceRight[1]
"
        );
        assert!(errors.is_empty());
    }
}
