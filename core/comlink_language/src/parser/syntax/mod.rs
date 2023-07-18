mod tree;

pub use tree::{nodes::*, tokens::*, AstNode, AstToken, Parser, ParserError};

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
    /// `=`
    Equals,
    /// ` `
    Whitespace,
    /// `abcd123`
    Identifier,
    // /// `true`
    // Boolean,
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
    // --- other --- //
    StringDoc,
    StringLiteral,
    // ------- nodes ------- //
    // --- literals --- //
    Literal,
    ArrayLiteral,
    ObjectLiteral,
    ObjectLiteralField,
    // --- types --- //
    TypeDefinition,
    PrimitiveTypeName,
    ModelTypeName,
    EnumDefinition,
    ObjectDefinition,
    FieldDefinition,
    ListDefinition,
    // ------- items ------- //
    UseCaseDefinition,
    ProfileName,
    ProfileVersion,
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
