mod tree;

pub use tree::{nodes::*, tokens::*, AstNode, CstNode, CstToken, Parser, ParserError};

/// All syntax token kinds that this parser can produce.
///
/// This contains both atomic tokens (tree leaves) and composite tokens (tree nodes).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
#[repr(u16)]
pub enum SyntaxKind {
    /// Explicit error token
    Error,
    // ------- low-level tokens ------- //
    /// `\n`
    Newline,
    /// `(`
    ParenLeft,
    /// `)`
    ParenRight,
    /// `[`
    BracketLeft,
    /// `]`
    BracketRight,
    /// `{`
    BraceLeft,
    /// `}`
    BraceRight,
    /// `!`
    Bang,
    /// `|`
    Pipe,
    /// `,`
    Comma,
    /// `.`
    Dot,
    /// `=`
    Equals,
    /// ` `
    Whitespace,
    /// `abcd123`
    Identifier,
    /// `123`
    IntNumber,
    /// `123.4`
    FloatNumber,
    /// `"value"`
    String,
    /// `// comment text`
    LineComment,
    // ------- tokens ------- //
    // --- keywords --- //
    KeywordTrue,
    KeywordFalse,
    KeywordNone,
    KeywordString,
    KeywordNumber,
    KeywordBoolean,
    KeywordName,
    KeywordVersion,
    KeywordUsecase,
    KeywordSafe,
    KeywordIdempotent,
    KeywordUnsafe,
    KeywordInput,
    KeywordResult,
    KeywordAsync,
    KeywordError,
    KeywordExample,
    KeywordModel,
    KeywordField,
    KeywordEnum,
    // --- specialization tokens --- //
    UseCaseSafety,
    StringDoc,
    StringLiteral,
    ProfileName,
    ProfileVersion,
    PrimitiveTypeName,
    FieldName,
    // ------- nodes ------- //
    // --- literals --- //
    PrimitiveLiteral,
    ListLiteral,
    ObjectLiteral,
    ObjectLiteralField,
    // --- types --- //
    PrimitiveType,
    NamedType,
    EnumType,
    EnumTypeVariant,
    ListType,
    ObjectType,
    ObjectTypeField,
    UnionType,
    // --- items --- //
    ProfileHeader,
    UseCaseDefinition,
    UseCaseDefinitionSafety,
    UseCaseDefinitionInput,
    UseCaseDefinitionResult,
    UseCaseDefinitionAsyncResult,
    UseCaseDefinitionError,
    UseCaseDefinitionExample,
    UseCaseDefinitionExampleInput,
    UseCaseDefinitionExampleResult,
    UseCaseDefinitionExampleAsyncResult,
    UseCaseDefinitionExampleError,
    NamedModelDefinition,
    NamedFieldDefinition,
    /// The entire source file
    ProfileDocument,
    /// End of file marker.
    EndOfFile,
}
impl From<SyntaxKind> for rowan::SyntaxKind {
    fn from(value: SyntaxKind) -> Self {
        Self(value as u16)
    }
}
impl From<rowan::SyntaxKind> for SyntaxKind {
    fn from(value: rowan::SyntaxKind) -> Self {
        assert!(value.0 <= SyntaxKind::EndOfFile as u16);
        unsafe { std::mem::transmute::<u16, SyntaxKind>(value.0) }
    }
}

/// Set of syntax kinds which can be queried.
///
/// Mostly used for recovery tokens.
pub struct SyntaxKindSet {
    // TODO: should be a bit set like they do in <https://github.com/rust-lang/rust-analyzer/blob/master/crates/parser/src/token_set.rs>
    tokens: std::borrow::Cow<'static, [SyntaxKind]>,
}
impl SyntaxKindSet {
    pub const fn empty() -> Self {
        Self::from_static_slice(&[])
    }

    pub const fn trivia_tokens() -> Self {
        Self::from_static_slice(&[SyntaxKind::Whitespace, SyntaxKind::LineComment])
    }

    pub(self) const fn from_static_slice(tokens: &'static [SyntaxKind]) -> Self {
        Self {
            tokens: std::borrow::Cow::Borrowed(tokens),
        }
    }

    pub fn contains(&self, kind: SyntaxKind) -> bool {
        self.tokens.as_ref().contains(&kind)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum ComlinkLanguage {}
impl rowan::Language for ComlinkLanguage {
    type Kind = SyntaxKind;

    fn kind_from_raw(raw: rowan::SyntaxKind) -> Self::Kind {
        raw.into()
    }

    fn kind_to_raw(kind: Self::Kind) -> rowan::SyntaxKind {
        kind.into()
    }
}

pub type SyntaxNode = rowan::SyntaxNode<ComlinkLanguage>;
pub type SyntaxToken = rowan::SyntaxToken<ComlinkLanguage>;
pub type SyntaxElement = rowan::SyntaxElement<ComlinkLanguage>;
