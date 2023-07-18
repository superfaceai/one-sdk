use super::{tokens::*, AstNode, AstToken, Parser, SyntaxKind, SyntaxKind::*, SyntaxNode, SyntaxElement, TokenRecoverySet};

fn opt_string_doc(p: &mut Parser) {
    if p.opt::<StringDocToken>() {
        p.skip::<NewlineToken>();
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
        impl AstNode for $name {
            const KIND: SyntaxKind = $syntax_kind;

            fn parse($parser_name: &mut Parser) {
                $parser_name.start_node();
                
                $($parse_rules)*

                $parser_name.finish_node(Self::KIND);
            }

            fn cast(node: SyntaxNode) -> Option<Self> {
                if node.kind() == Self::KIND {
                    Some(Self(node))
                } else {
                    None
                }
            }
        }
    }
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

            match p.peek_keyword() {
                KeywordUsecase => UseCaseDefinitionNode::parse(p),
                KeywordModel => todo!("model"),
                KeywordField => todo!("field"),
                String => {
                    p.start_node();
                    opt_string_doc(p);
                    let kind = match p.peek_keyword() {
                        KeywordUsecase => { UseCaseDefinitionNode::parse_open(p); UseCaseDefinitionNode::KIND },
                        KeywordModel => todo!("model"),
                        KeywordField => todo!("field"),
                        _ => {
                            p.error("expected usecase, model or field", TokenRecoverySet::empty());
                            SyntaxKind::Error
                        }
                    };
                    p.finish_node(kind);
                }
                _ => break
            }
        }

        p.skip::<NewlineToken>();
        p.expect::<EndOfFileToken>(TokenRecoverySet::empty());
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

const PROFILE_HEADER_RECOVERY: TokenRecoverySet = TokenRecoverySet::from_static_slice(&[
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
        p.expect::<NewlineToken>(TokenRecoverySet::empty());
    }
}
impl ProfileNameNode {
    pub fn value(&self) -> Option<StringLiteralToken> {
        self.as_ref()
            .children_with_tokens()
            .filter_map(SyntaxElement::into_token)
            .filter_map(StringLiteralToken::cast)
            .next()
    }
}

node! {
    pub struct ProfileVersionNode = ProfileVersion;
    parse(p) {
        p.expect_keyword::<KeywordVersionToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<EqualsToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<StringLiteralToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<NewlineToken>(TokenRecoverySet::empty());
    }
}
impl ProfileVersionNode {
    pub fn value(&self) -> Option<StringLiteralToken> {
        self.as_ref()
            .children_with_tokens()
            .filter_map(SyntaxElement::into_token)
            .filter_map(StringLiteralToken::cast)
            .next()
    }
}

node! {
    pub struct UseCaseDefinitionNode = UseCaseDefinition;
    parse(p) {
        opt_string_doc(p);
        Self::parse_open(p);
    }
}
impl UseCaseDefinitionNode {
    /// Parses this node with the assumption that the node has already been opened and will be closed by the caller.
    /// 
    /// This allows pre-parsing StringDoc prefix when the following item is ambiguous.
    pub(self) fn parse_open(p: &mut Parser) {
        const RECOVERY: TokenRecoverySet = TokenRecoverySet::from_static_slice(&[
            BraceLeft, BraceRight
        ]);

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

        p.expect::<BraceRightToken>(RECOVERY);
    }
}

node! {
    pub struct FieldDefinitionNode = FieldDefinition;
    parse(p) {
        const RECOVERY: TokenRecoverySet = TokenRecoverySet::from_static_slice(&[
            Newline,
            Comma,
            BraceRight,
            Bang,
        ]);

        opt_string_doc(p);
        p.expect::<IdentifierToken>(RECOVERY);
        p.opt::<BangToken>();

        match p.peek() {
            Comma | Newline | BraceRight => (),
            _ => TypeDefinitionNode::parse(p)
        }
    }
}
node! {
    pub struct ObjectDefinitionNode = ObjectDefinition;
    parse(p) {
        const RECOVERY: TokenRecoverySet = TokenRecoverySet::from_static_slice(&[SyntaxKind::BraceRight]);

        p.expect::<BraceLeftToken>(RECOVERY);
        loop {
            p.skip::<NewlineToken>();
            match p.peek() {
                String | Identifier => FieldDefinitionNode::parse(p),
                _ => break, // handled by expect outside the loop
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
    }
}

node! {
    pub struct TypeDefinitionNode = TypeDefinition;
    parse(p) {
        const RECOVERY: TokenRecoverySet = TokenRecoverySet::from_static_slice(&[
            Newline,
            Comma,
            BraceRight,
            Bang,
        ]);
    
        match p.peek_keyword() {
            BraceLeft => ObjectDefinitionNode::parse(p),
            BracketLeft => todo!("array type"),
            KeywordString | KeywordNumber | KeywordBoolean => PrimitiveTypeNameNode::parse(p),
            KeywordEnum => todo!("enum"),
            Identifier =>  ModelTypeNameNode::parse(p),
            _ => p.error("expected type definition", RECOVERY),
        }
        p.opt::<BangToken>();
    }
}
node! {
    pub struct PrimitiveTypeNameNode = PrimitiveTypeName;
    parse(p) {
        match p.peek_keyword() {
            KeywordString => p.token::<KeywordStringToken>(),
            KeywordNumber => p.token::<KeywordNumberToken>(),
            KeywordBoolean => p.token::<KeywordBooleanToken>(),
            _ => p.error("expected string, number or boolean", TokenRecoverySet::empty())
        }
    }
}
node! {
    pub struct ModelTypeNameNode = ModelTypeName;
    parse(p) {
        p.expect::<IdentifierToken>(TokenRecoverySet::empty());
    }
}
