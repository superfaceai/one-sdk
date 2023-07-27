use super::*;

const TYPE_RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[Newline, Comma, BracketRight, BraceRight, Bang, Pipe]);
node! {
    #[derive(Serialize, Deserialize)]
    #[serde(untagged)]
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
    #[derive(Serialize, Deserialize)]
    #[serde(untagged)]
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
            NonUnionTypeNode::parse(p);
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
impl ObjectTypeNode {
    pub fn fields(&self) -> impl Iterator<Item = ObjectTypeFieldNode> { self.filter_nodes() }
    pub fn required(&self) -> bool { self.find_token::<BangToken>().is_some() }
}
node! {
    pub struct ObjectTypeFieldNode = ObjectTypeField;
    parse(p) {
        const RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[BraceRight, Newline, Comma, Dot, Bang]);
        
        opt_string_doc(p);
        p.expect::<FieldNameToken>(RECOVERY);
        p.opt::<BangToken>();

        match p.peek() {
            Comma | Newline | BraceRight => (),
            _ => TypeNode::parse(p)
        }
    }
}
impl ObjectTypeFieldNode {
    pub fn doc(&self) -> Option<StringDocToken> { self.find_token() }
    pub fn name(&self) -> Option<FieldNameToken> { self.find_token() }
    pub fn required(&self) -> bool { self.find_token::<BangToken>().is_some() }
    pub fn ty(&self) -> Option<TypeNode> { self.find_node() }
}
node! {
    pub struct ListTypeNode = ListType;
    parse(p) {
        p.expect::<BracketLeftToken>(TYPE_RECOVERY);
        p.skip::<NewlineToken>();
        TypeNode::parse(p);
        p.skip::<NewlineToken>();
        p.expect::<BracketRightToken>(TYPE_RECOVERY);
        p.opt::<BangToken>();
    }
}
impl ListTypeNode {
    pub fn ty(&self) -> Option<TypeNode> { self.find_node() }
    pub fn required(&self) -> bool { self.find_token::<BangToken>().is_some() }
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
impl EnumTypeNode {
    pub fn variants(&self) -> impl Iterator<Item = EnumTypeVariantNode> { self.filter_nodes() }
    pub fn required(&self) -> bool { self.find_token::<BangToken>().is_some() }
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

        opt_string_doc(p);
        p.skip::<NewlineToken>();

        p.expect::<IdentifierToken>(RECOVERY);
        if p.opt::<EqualsToken>() {
            PrimitiveLiteralNode::parse(p);
        }
    }
}
impl EnumTypeVariantNode {
    pub fn doc(&self) -> Option<StringDocToken> { self.find_token() }
    pub fn name(&self) -> Option<IdentifierToken> { self.find_token() }
    pub fn value(&self) -> Option<LiteralValue<'_>> {        
        // TODO: return a reference
        match self.find_node::<PrimitiveLiteralNode>() {
            Some(n) => n.value().map(|v| v.to_owned()),
            None => Some(LiteralValue::String(self.name()?.value().into()).to_owned())
        }
    }
}
node! {
    pub struct PrimitiveTypeNode = PrimitiveType;
    parse(p) {
        p.expect_keyword::<PrimitiveTypeNameToken>(TYPE_RECOVERY);
        p.opt::<BangToken>();
    }
}
impl PrimitiveTypeNode {
    pub fn name(&self) -> Option<PrimitiveTypeNameToken> { self.find_token() }
    pub fn required(&self) -> bool { self.find_token::<BangToken>().is_some() }
}
node! {
    pub struct NamedTypeNode = NamedType;
    parse(p) {
        p.expect::<IdentifierToken>(TYPE_RECOVERY);
        p.opt::<BangToken>();
    }
}
impl NamedTypeNode {
    pub fn name(&self) -> Option<IdentifierToken> { self.find_token() }
    pub fn required(&self) -> bool { self.find_token::<BangToken>().is_some() }
}
