use super::{tokens::*, AstNode, CstNode, CstToken, TreeParser, SyntaxKind, SyntaxKind::*, SyntaxNode, SyntaxElement, SyntaxKindSet};

fn opt_string_doc(p: &mut impl TreeParser) {
    if p.opt::<StringDocToken>() {
        p.skip::<NewlineToken>();
    }
}

fn peek_keyword_after_string_doc(p: &mut impl TreeParser) -> SyntaxKind {
    match p.peek_keyword() {
        String => {
            p.start_frame();
            opt_string_doc(p);
            let k = p.peek_keyword();
            p.cancel_frame();

            k
        }
        k => k
    }
}

macro_rules! node {
    (
        $vis: vis struct $name: ident = $syntax_kind: expr;
        parse($parser_name: ident) {
            $($parse_rules: tt)*
        }
    ) => {
        $vis struct $name(SyntaxNode);
        impl AsRef<SyntaxNode> for $name {
            fn as_ref(&self) -> &SyntaxNode {
                &self.0
            }
        }
        impl CstNode for $name {
            const KIND: SyntaxKind = $syntax_kind;

            fn parse($parser_name: &mut impl TreeParser) {
                $parser_name.start_frame();

                $($parse_rules)*

                $parser_name.finish_frame_node::<Self>();
            }
        }
        impl AstNode for $name {
            fn cast(node: SyntaxNode) -> Option<Self> {
                if node.kind() == Self::KIND {
                    Some(Self(node))
                } else {
                    None
                }
            }
        }
    };

    // branch for ast-only nodes
    (
        $vis: vis enum $name: ident {
            $(
                $syntax_kind: ident($cst_node: ty)
            ),+ $(,)?
        }
        parse($parser_name: ident) {
            $($parse_rules: tt)*
        }
    ) => {
        $vis enum $name {
            $( $syntax_kind($cst_node) ),+
        }
        impl $name {
            pub fn parse($parser_name: &mut impl TreeParser) {
                $($parse_rules)*
            }
        }
        impl AsRef<SyntaxNode> for $name {
            fn as_ref(&self) -> &SyntaxNode {
                match self {
                    $(
                        Self::$syntax_kind(n) => n.as_ref()
                    ),+
                }
            }
        }
        impl AstNode for $name {
            fn cast(node: SyntaxNode) -> Option<Self> {
                match node.kind() {
                    $(
                        SyntaxKind::$syntax_kind => Some(Self::$syntax_kind(<$cst_node>::cast(node).unwrap())),
                    )+
                    _ => None
                }
            }
        }
    };
}

node! {
    pub struct ProfileDocumentNode = ProfileDocument;
    parse(p) {
        p.skip::<NewlineToken>();
        opt_string_doc(p);
        ProfileNameNode::parse(p);
        ProfileVersionNode::parse(p);

        loop {
            p.skip::<NewlineToken>();

            match peek_keyword_after_string_doc(p) {
                KeywordUsecase => UseCaseDefinitionNode::parse(p),
                KeywordModel => todo!("model"),
                KeywordField => todo!("field"),
                _ => break
            }
        }

        p.skip::<NewlineToken>();
        p.expect::<EndOfFileToken>(SyntaxKindSet::empty());
    }
}
impl ProfileDocumentNode {
    pub fn name(&self) -> Option<ProfileNameNode> {
        self.as_ref().children().filter_map(ProfileNameNode::cast).next()
    }

    pub fn version(&self) -> Option<ProfileVersionNode> {
        self.as_ref().children().filter_map(ProfileVersionNode::cast).next()
    }
}

const PROFILE_HEADER_RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[
    Equals,
    String,
    Newline
]);
node! {
    pub struct ProfileNameNode = ProfileName;
    parse(p) {
        p.expect_keyword::<KeywordNameToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<EqualsToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<StringLiteralToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<NewlineToken>(SyntaxKindSet::empty());
    }
}
impl ProfileNameNode {
    pub fn value(&self) -> Option<StringLiteralToken> {
        self.as_ref()
            .children_with_tokens()
            .find_map(
                |ch| SyntaxElement::into_token(ch).and_then(StringLiteralToken::cast)
            )
    }
}
node! {
    pub struct ProfileVersionNode = ProfileVersion;
    parse(p) {
        p.expect_keyword::<KeywordVersionToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<EqualsToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<StringLiteralToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<NewlineToken>(SyntaxKindSet::empty());
    }
}
impl ProfileVersionNode {
    pub fn value(&self) -> Option<StringLiteralToken> {
        self.as_ref()
            .children_with_tokens()
            .find_map(
                |ch| SyntaxElement::into_token(ch).and_then(StringLiteralToken::cast)
            )
    }
}

node! {
    pub struct UseCaseDefinitionNode = UseCaseDefinition;
    parse(p) {
        const RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[
            BraceLeft, BraceRight
        ]);

        opt_string_doc(p);

        p.expect_keyword::<KeywordUsecaseToken>(RECOVERY);
        p.expect::<IdentifierToken>(RECOVERY);
        match p.peek_keyword() {
            KeywordSafe => p.token::<KeywordSafeToken>(),
            KeywordIdempotent => p.token::<KeywordIdempotentToken>(),
            KeywordUnsafe => p.token::<KeywordUnsafeToken>(),
            _ => ()
        }
        p.expect::<BraceLeftToken>(RECOVERY);
        p.skip::<NewlineToken>();

        if peek_keyword_after_string_doc(p) == KeywordInput {
            UseCaseDefinitionInputNode::parse(p);
            p.skip::<NewlineToken>();
        }
        if peek_keyword_after_string_doc(p) == KeywordResult {
            UseCaseDefinitionResultNode::parse(p);
            p.skip::<NewlineToken>();
        }
        if peek_keyword_after_string_doc(p) == KeywordAsync {
            UseCaseDefinitionAsyncResultNode::parse(p);
            p.skip::<NewlineToken>();
        }
        if peek_keyword_after_string_doc(p) == KeywordError {
            UseCaseDefinitionErrorNode::parse(p);
            p.skip::<NewlineToken>();
        }

        loop {
            p.skip::<NewlineToken>();
            if p.peek() == BraceRight {
                break;
            }
            UseCaseDefinitionExampleNode::parse(p);
        }

        p.expect::<BraceRightToken>(RECOVERY);
    }
}
const USECASE_SLOT_RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[
    Newline, BraceRight
]);
node! {
    pub struct UseCaseDefinitionInputNode = UseCaseDefinitionInput;
    parse(p) {
        opt_string_doc(p);
        p.expect_keyword::<KeywordInputToken>(USECASE_SLOT_RECOVERY);
        ObjectTypeNode::parse(p);
    }
}
node! {
    pub struct UseCaseDefinitionResultNode = UseCaseDefinitionResult;
    parse(p) {
        opt_string_doc(p);
        p.expect_keyword::<KeywordResultToken>(USECASE_SLOT_RECOVERY);
        TypeNode::parse(p);
    }
}
node! {
    pub struct UseCaseDefinitionAsyncResultNode = UseCaseDefinitionAsyncResult;
    parse(p) {
        opt_string_doc(p);
        p.expect_keyword::<KeywordAsyncToken>(USECASE_SLOT_RECOVERY);
        p.expect_keyword::<KeywordResultToken>(USECASE_SLOT_RECOVERY);
        TypeNode::parse(p);
    }
}
node! {
    pub struct UseCaseDefinitionErrorNode = UseCaseDefinitionError;
    parse(p) {
        opt_string_doc(p);
        p.expect_keyword::<KeywordErrorToken>(USECASE_SLOT_RECOVERY);
        TypeNode::parse(p);
    }
}
node! {
    pub struct UseCaseDefinitionExampleNode = UseCaseDefinitionExample;
    parse(p) {
        opt_string_doc(p);
        p.expect_keyword::<KeywordExampleToken>(USECASE_SLOT_RECOVERY);
        p.opt::<IdentifierToken>();
        p.expect::<BraceLeftToken>(USECASE_SLOT_RECOVERY);
        p.skip::<NewlineToken>();

        if peek_keyword_after_string_doc(p) == KeywordInput {
            UseCaseDefinitionExampleInputNode::parse(p);
            p.skip::<NewlineToken>();
        }
        if peek_keyword_after_string_doc(p) == KeywordResult {
            UseCaseDefinitionExampleResultNode::parse(p);
            p.skip::<NewlineToken>();
        }
        if peek_keyword_after_string_doc(p) == KeywordAsync {
            UseCaseDefinitionExampleAsyncResultNode::parse(p);
            p.skip::<NewlineToken>();
        }
        if peek_keyword_after_string_doc(p) == KeywordError {
            UseCaseDefinitionExampleErrorNode::parse(p);
            p.skip::<NewlineToken>();
        }

        p.skip::<NewlineToken>();
        p.expect::<BraceRightToken>(USECASE_SLOT_RECOVERY);
    }
}
node! {
    pub struct UseCaseDefinitionExampleInputNode = UseCaseDefinitionExampleInput;
    parse(p) {
        opt_string_doc(p);
        p.expect_keyword::<KeywordInputToken>(USECASE_SLOT_RECOVERY);
        ObjectLiteralNode::parse(p);
    }
}
node! {
    pub struct UseCaseDefinitionExampleResultNode = UseCaseDefinitionExampleResult;
    parse(p) {
        opt_string_doc(p);
        p.expect_keyword::<KeywordResultToken>(USECASE_SLOT_RECOVERY);
        LiteralNode::parse(p);
    }
}
node! {
    pub struct UseCaseDefinitionExampleAsyncResultNode = UseCaseDefinitionExampleAsyncResult;
    parse(p) {
        opt_string_doc(p);
        p.expect_keyword::<KeywordAsyncToken>(USECASE_SLOT_RECOVERY);
        p.expect_keyword::<KeywordResultToken>(USECASE_SLOT_RECOVERY);
        LiteralNode::parse(p);
    }
}
node! {
    pub struct UseCaseDefinitionExampleErrorNode = UseCaseDefinitionExampleError;
    parse(p) {
        opt_string_doc(p);
        p.expect_keyword::<KeywordErrorToken>(USECASE_SLOT_RECOVERY);
        LiteralNode::parse(p);
    }
}

const TYPE_RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[Newline, Comma, BracketRight, BraceRight, Bang, Pipe]);
node! {
    pub enum TypeNode {
        PrimitiveType(PrimitiveTypeNode),
        NamedType(NamedTypeNode),
        EnumType(EnumTypeNode),
        ListType(ListTypeNode),
        ObjectType(ObjectTypeNode),
        UnionType(UnionTypeNode)
    }
    parse(p) {
        // IDEA: we can optimize this lookup by implementing `UnionTypeNode::parse_open` and `TreeParser::frame_abandon`
        let peek = {
            p.start_frame();
            NonUnionTypeNode::parse(p);
            p.skip::<NewlineToken>();
            let k = p.peek();
            p.cancel_frame();

            k
        };

        if peek == Pipe {
            UnionTypeNode::parse(p);
        } else {
            NonUnionTypeNode::parse(p);
        }
    }
}
node! {
    pub enum NonUnionTypeNode {
        PrimitiveType(PrimitiveTypeNode),
        NamedType(NamedTypeNode),
        EnumType(EnumTypeNode),
        ListType(ListTypeNode),
        ObjectType(ObjectTypeNode)
    }
    parse(p) {
        match p.peek_keyword() {
            BraceLeft => ObjectTypeNode::parse(p),
            BracketLeft => ListTypeNode::parse(p),
            KeywordString | KeywordNumber | KeywordBoolean => PrimitiveTypeNode::parse(p),
            KeywordEnum => EnumTypeNode::parse(p),
            Identifier =>  NamedTypeNode::parse(p),
            _ => p.error("expected type", TYPE_RECOVERY),
        }
    }
}
node! {
    pub struct UnionTypeNode = UnionType;
    parse(p) {
        NonUnionTypeNode::parse(p);
        loop {
            p.skip::<NewlineToken>();
            p.expect::<PipeToken>(TYPE_RECOVERY);
            TypeNode::parse(p);
            if Self::peek_after_newline(p) != Pipe {
                break;
            }
        }
    }
}
impl UnionTypeNode {
    fn peek_after_newline(p: &mut impl TreeParser) -> SyntaxKind {
        p.start_frame();
        p.skip::<NewlineToken>();
        let k = p.peek();
        p.cancel_frame();

        k
    }

    pub fn types(&self) -> impl Iterator<Item = NonUnionTypeNode> {
        self.as_ref().children().filter_map(NonUnionTypeNode::cast)
    }
}
node! {
    pub struct ObjectTypeNode = ObjectType;
    parse(p) {
        p.expect::<BraceLeftToken>(TYPE_RECOVERY);
        loop {
            p.skip::<NewlineToken>();
            match p.peek() {
                BraceRight => break,
                _ => ObjectTypeFieldNode::parse(p)
            }
            // require a newline or a comma
            match p.peek() {
                Newline => p.token::<NewlineToken>(),
                Comma => p.token::<CommaToken>(),
                BraceRight => break,
                _ => {
                    p.error(
                        "field definitions must be newline or comma terminated",
                        TYPE_RECOVERY,
                    );
                    break;
                }
            }
        }
        p.skip::<NewlineToken>();
        p.expect::<BraceRightToken>(TYPE_RECOVERY);
        p.opt::<BangToken>();
    }
}
node! {
    pub struct ObjectTypeFieldNode = ObjectTypeField;
    parse(p) {
        opt_string_doc(p);
        FieldNameNode::parse(p);
        p.opt::<BangToken>();

        match p.peek() {
            Comma | Newline | BraceRight => (),
            _ => TypeNode::parse(p)
        }
    }
}
node! {
    pub struct ListTypeNode = ListType;
    parse(p) {
        p.expect::<BracketLeftToken>(TYPE_RECOVERY);
        TypeNode::parse(p);
        p.expect::<BracketRightToken>(TYPE_RECOVERY);
        p.opt::<BangToken>();
    }
}
node! {
    pub struct EnumTypeNode = EnumType;
    parse(p) {
        p.expect_keyword::<KeywordEnumToken>(TYPE_RECOVERY);
        p.expect::<BraceLeftToken>(TYPE_RECOVERY);
        loop {
            p.skip::<NewlineToken>();
            match p.peek() {
                BraceRight => break,
                _ => EnumTypeVariantNode::parse(p)
            }
            // require a newline or a comma
            match p.peek() {
                Newline => p.token::<NewlineToken>(),
                Comma => p.token::<CommaToken>(),
                BraceRight => break,
                _ => {
                    p.error(
                        "field definitions must be newline or comma terminated",
                        TYPE_RECOVERY,
                    );
                    break;
                }
            }
        }
        p.expect::<BraceRightToken>(TYPE_RECOVERY);
        p.opt::<BangToken>();
    }
}
node! {
    pub struct EnumTypeVariantNode = EnumTypeVariant;
    parse(p) {
        const RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[
            Newline,
            Comma,
            BraceRight,
            Equals
        ]);

        p.expect::<IdentifierToken>(RECOVERY);
        if p.opt::<EqualsToken>() {
            PrimitiveLiteralNode::parse(p);
        }
    }
}
node! {
    pub struct PrimitiveTypeNode = PrimitiveType;
    parse(p) {
        match p.peek_keyword() {
            KeywordString => p.token::<KeywordStringToken>(),
            KeywordNumber => p.token::<KeywordNumberToken>(),
            KeywordBoolean => p.token::<KeywordBooleanToken>(),
            _ => p.error("expected string, number or boolean", TYPE_RECOVERY)
        }
        p.opt::<BangToken>();
    }
}
node! {
    pub struct NamedTypeNode = NamedType;
    parse(p) {
        p.expect::<IdentifierToken>(TYPE_RECOVERY);
        p.opt::<BangToken>();
    }
}

node! {
    pub enum LiteralNode {
        PrimitiveLiteral(PrimitiveLiteralNode),
        ListLiteral(ListLiteralNode),
        ObjectLiteral(ObjectLiteralNode)
    }
    parse(p) {
        const RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[
            Newline,
            Comma,
            BraceRight,
            Bang,
        ]);

        match p.peek_keyword() {
            BraceLeft => ObjectLiteralNode::parse(p),
            BracketLeft => ListLiteralNode::parse(p),
            KeywordNone | KeywordTrue | KeywordFalse | String | IntNumber | FloatNumber => PrimitiveLiteralNode::parse(p),
            _ => p.error("expected literal", RECOVERY),
        }
    }
}
node! {
    pub struct PrimitiveLiteralNode = PrimitiveLiteral;
    parse(p) {
        const RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[
            Newline, Comma
        ]);

        match p.peek_keyword() {
            KeywordNone => p.token::<KeywordNoneToken>(),
            KeywordTrue => p.token::<KeywordTrueToken>(),
            KeywordFalse => p.token::<KeywordFalseToken>(),
            String => p.token::<StringLiteralToken>(),
            IntNumber => p.token::<IntNumberToken>(),
            FloatNumber => p.token::<FloatNumberToken>(),
            _ => p.error("expected literal value", RECOVERY)
        }
    }
}
node! {
    pub struct ListLiteralNode = ListLiteral;
    parse(p) {
        const RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[
            Comma, BracketRight, BraceRight, Newline
        ]);
        p.expect::<BracketLeftToken>(RECOVERY);
        loop {
            p.skip::<NewlineToken>();
            match p.peek() {
                BracketRight => break,
                _ => LiteralNode::parse(p)
            }
            // require a newline or a comma
            match p.peek() {
                Newline => p.token::<NewlineToken>(),
                Comma => p.token::<CommaToken>(),
                BracketRight => break,
                _ => {
                    p.error(
                        "list elements must be newline or comma delimited",
                        RECOVERY,
                    );
                    break;
                }
            }
        }
        p.expect::<BracketRightToken>(RECOVERY);
    }
}
node! {
    pub struct ObjectLiteralNode = ObjectLiteral;
    parse(p) {
        const RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[BraceRight, Newline]);

        p.expect::<BraceLeftToken>(RECOVERY);
        loop {
            p.skip::<NewlineToken>();
            match p.peek() {
                BraceRight => break,
                _ => ObjectLiteralFieldNode::parse(p)
            }
            // require a newline or a comma
            match p.peek() {
                Newline => p.token::<NewlineToken>(),
                Comma => p.token::<CommaToken>(),
                BraceRight => break,
                _ => {
                    p.error(
                        "field definitions must be newline or comma terminated",
                        RECOVERY,
                    );
                    break;
                }
            }
        }
        p.skip::<NewlineToken>();
        p.expect::<BraceRightToken>(RECOVERY);
        p.opt::<BangToken>();
    }
}
node! {
    pub struct ObjectLiteralFieldNode = ObjectLiteralField;
    parse(p) {
        const RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[BraceRight, Newline, Dot]);

        opt_string_doc(p);
        FieldNameNode::parse(p);
        loop {
            if !p.opt::<DotToken>() {
                break;
            }

            FieldNameNode::parse(p);
        }
        p.expect::<EqualsToken>(RECOVERY);
        LiteralNode::parse(p);
    }
}

node! {
    pub struct FieldNameNode = FieldName;
    parse(p) {
        const RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[BraceRight, Newline, Comma, Dot, Bang]);

        match p.peek() {
            Identifier => p.token::<IdentifierToken>(),
            String => p.token::<StringLiteralToken>(),
            _ => p.error("expected identifier or string", RECOVERY)
        }
    }
}
impl FieldNameNode {
    pub fn name(&self) -> std::string::String {
        self.as_ref().first_token().unwrap().text().to_string()
    }
}
