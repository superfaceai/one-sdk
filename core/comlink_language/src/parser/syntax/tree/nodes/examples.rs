use std::borrow::Cow;

use super::*;

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
// be mindful of the enum order - serde(untagged) dependso on it
pub enum LiteralValue<'a> {
    None,
    String(Cow<'a, str>),
    Bool(bool),
    FloatNumber(f64),
    IntNumber(isize),
}
impl LiteralValue<'_> {
    pub fn to_owned(self) -> LiteralValue<'static> {
        match self {
            Self::String(c) => LiteralValue::String(Cow::Owned(c.to_string())),
            Self::None => LiteralValue::None,
            Self::Bool(v) => LiteralValue::Bool(v),
            Self::FloatNumber(v) => LiteralValue::FloatNumber(v),
            Self::IntNumber(v) => LiteralValue::IntNumber(v),
        }
    }
}
impl<'a> From<&'a str> for LiteralValue<'a> {
    fn from(value: &'a str) -> Self {
        Self::String(value.into())
    }
}
impl<'a> From<bool> for LiteralValue<'a> {
    fn from(value: bool) -> Self {
        Self::Bool(value)
    }
}
impl<'a> From<f64> for LiteralValue<'a> {
    fn from(value: f64) -> Self {
        Self::FloatNumber(value)
    }
}
impl<'a> From<isize> for LiteralValue<'a> {
    fn from(value: isize) -> Self {
        Self::IntNumber(value)
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
impl UseCaseDefinitionExampleNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn name(&self) -> Option<IdentifierToken> {
        self.find_token()
    }
    pub fn input(&self) -> Option<UseCaseDefinitionExampleInputNode> {
        self.find_node()
    }
    pub fn result(&self) -> Option<UseCaseDefinitionExampleResultNode> {
        self.find_node()
    }
    pub fn async_result(&self) -> Option<UseCaseDefinitionExampleAsyncResultNode> {
        self.find_node()
    }
    pub fn error(&self) -> Option<UseCaseDefinitionExampleErrorNode> {
        self.find_node()
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
impl UseCaseDefinitionExampleInputNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn literal(&self) -> Option<ObjectLiteralNode> {
        self.find_node()
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
impl UseCaseDefinitionExampleResultNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn literal(&self) -> Option<LiteralNode> {
        self.find_node()
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
impl UseCaseDefinitionExampleAsyncResultNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn literal(&self) -> Option<LiteralNode> {
        self.find_node()
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
impl UseCaseDefinitionExampleErrorNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn literal(&self) -> Option<LiteralNode> {
        self.find_node()
    }
}

node! {
    #[derive(Serialize, Deserialize)]
    #[serde(untagged)]
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
impl PrimitiveLiteralNode {
    pub fn value(&self) -> Option<LiteralValue<'_>> {
        let t = self.as_ref().first_token()?;
        let r = match t.kind() {
            KeywordNone => LiteralValue::None,
            KeywordTrue => LiteralValue::Bool(true),
            KeywordFalse => LiteralValue::Bool(false),
            StringLiteral => LiteralValue::String(
                StringLiteralToken::cast(t)
                    .unwrap()
                    .value()?
                    .into_owned()
                    .into(), // TODO: don't clone
            ),
            IntNumber => LiteralValue::IntNumber(IntNumberToken::cast(t).unwrap().value()?),
            FloatNumber => LiteralValue::FloatNumber(FloatNumberToken::cast(t).unwrap().value()?),
            _ => return None,
        };

        Some(r)
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
impl ListLiteralNode {
    pub fn elements(&self) -> impl Iterator<Item = LiteralNode> {
        self.filter_nodes()
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
    }
}
impl ObjectLiteralNode {
    pub fn fields(&self) -> impl Iterator<Item = ObjectLiteralFieldNode> {
        self.filter_nodes()
    }
}
node! {
    pub struct ObjectLiteralFieldNode = ObjectLiteralField;
    parse(p) {
        const RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[BraceRight, Newline, Comma, Dot, Bang]);

        opt_string_doc(p);
        p.expect::<FieldNameToken>(RECOVERY);
        loop {
            if !p.opt::<DotToken>() {
                break;
            }

            p.expect::<FieldNameToken>(RECOVERY);
        }
        p.expect::<EqualsToken>(RECOVERY);
        LiteralNode::parse(p);
    }
}
impl ObjectLiteralFieldNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn key(&self) -> impl Iterator<Item = FieldNameToken> {
        self.filter_tokens()
    }
    pub fn literal(&self) -> Option<LiteralNode> {
        self.find_node()
    }
}
