use std::string::String as StdString;

use serde::{Deserialize, Serialize};

use super::{
    tokens::*, AstNode, CstNode, CstToken, SyntaxKind, SyntaxKind::*, SyntaxKindSet, SyntaxNode,
    TreeParser,
};

use super::tokens::ProfileVersion as ProfileVersionRepr;

macro_rules! node {
    (
        $vis: vis struct $name: ident = $syntax_kind: expr;
        parse($parser_name: ident) {
            $($parse_rules: tt)*
        }
    ) => {
        #[repr(transparent)]
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
        $(#[$attr: meta])*
        $vis: vis enum $name: ident {
            $(
                $syntax_kind: ident($cst_node: ty)
            ),+ $(,)?
        }
        parse($parser_name: ident) {
            $($parse_rules: tt)*
        }
    ) => {
        $(#[$attr])*
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

mod examples;
mod types;
pub use self::{examples::*, types::*};

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
        k => k,
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AstMetadata {
    pub ast_version: ProfileVersionRepr,
    pub parser_version: ProfileVersionRepr,
    pub source_checksum: StdString,
}
node! {
    pub struct ProfileDocumentNode = ProfileDocument;
    parse(p) {
        p.skip::<NewlineToken>();
        ProfileHeaderNode::parse(p);

        loop {
            p.skip::<NewlineToken>();

            match peek_keyword_after_string_doc(p) {
                EndOfFile => break,
                _ => ProfileDocumentDefinitionNode::parse(p)
            }
        }

        p.skip::<NewlineToken>();
        p.expect::<EndOfFileToken>(SyntaxKindSet::empty());
    }
}
impl ProfileDocumentNode {
    fn source_checksum(&self) -> StdString {
        use hex::ToHex;
        use sha2::{Digest, Sha256};

        let mut hasher = Sha256::new();
        self.as_ref()
            .text()
            .for_each_chunk(|chunk| hasher.update(chunk));
        hasher.finalize().as_slice().encode_hex::<StdString>()
    }

    pub fn metadata(&self) -> AstMetadata {
        AstMetadata {
            ast_version: ProfileVersionRepr {
                major: 1,
                minor: 3,
                patch: 0,
                label: None,
            }, // TODO
            parser_version: ProfileVersionRepr {
                major: env!("CARGO_PKG_VERSION_MAJOR").parse::<usize>().unwrap(),
                minor: env!("CARGO_PKG_VERSION_MINOR").parse::<usize>().unwrap(),
                patch: env!("CARGO_PKG_VERSION_PATCH").parse::<usize>().unwrap(),
                label: None,
            },
            source_checksum: self.source_checksum(),
        }
    }

    pub fn header(&self) -> Option<ProfileHeaderNode> {
        self.find_node()
    }

    pub fn definitions(&self) -> impl Iterator<Item = ProfileDocumentDefinitionNode> {
        self.as_ref()
            .children()
            .filter_map(ProfileDocumentDefinitionNode::cast)
    }
}

const PROFILE_HEADER_RECOVERY: SyntaxKindSet =
    SyntaxKindSet::from_static_slice(&[Equals, String, Newline]);
node! {
    pub struct ProfileHeaderNode = ProfileHeader;
    parse(p) {
        opt_string_doc(p);

        p.expect_keyword::<KeywordNameToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<EqualsToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<ProfileNameToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<NewlineToken>(SyntaxKindSet::empty());

        p.skip::<NewlineToken>();

        p.expect_keyword::<KeywordVersionToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<EqualsToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<ProfileVersionToken>(PROFILE_HEADER_RECOVERY);
        p.expect::<NewlineToken>(SyntaxKindSet::empty());
    }
}
impl ProfileHeaderNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn name(&self) -> Option<ProfileNameToken> {
        self.find_token()
    }
    pub fn version(&self) -> Option<ProfileVersionToken> {
        self.find_token()
    }
}
node! {
    #[derive(Serialize, Deserialize)]
    #[serde(untagged)]
    pub enum ProfileDocumentDefinitionNode {
        UseCaseDefinition(UseCaseDefinitionNode),
        NamedModelDefinition(NamedModelDefinitionNode),
        NamedFieldDefinition(NamedFieldDefinitionNode)
    }
    parse(p) {
        const RECOVERY: SyntaxKindSet = SyntaxKindSet::empty();

        match peek_keyword_after_string_doc(p) {
            KeywordUsecase => UseCaseDefinitionNode::parse(p),
            KeywordModel => NamedModelDefinitionNode::parse(p),
            KeywordField => NamedFieldDefinitionNode::parse(p),
            _ => p.error("expected document definition", RECOVERY)
        }
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
        p.opt_keyword::<UseCaseSafetyToken>();
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
impl UseCaseDefinitionNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn name(&self) -> Option<IdentifierToken> {
        self.find_token()
    }
    pub fn safety(&self) -> Option<UseCaseSafetyToken> {
        self.find_token()
    }
    pub fn input(&self) -> Option<UseCaseDefinitionInputNode> {
        self.find_node()
    }
    pub fn result(&self) -> Option<UseCaseDefinitionResultNode> {
        self.find_node()
    }
    pub fn async_result(&self) -> Option<UseCaseDefinitionAsyncResultNode> {
        self.find_node()
    }
    pub fn error(&self) -> Option<UseCaseDefinitionErrorNode> {
        self.find_node()
    }
    pub fn examples(&self) -> impl Iterator<Item = UseCaseDefinitionExampleNode> {
        self.filter_nodes()
    }
}

const USECASE_SLOT_RECOVERY: SyntaxKindSet =
    SyntaxKindSet::from_static_slice(&[Newline, BraceRight]);
node! {
    pub struct UseCaseDefinitionInputNode = UseCaseDefinitionInput;
    parse(p) {
        opt_string_doc(p);
        p.expect_keyword::<KeywordInputToken>(USECASE_SLOT_RECOVERY);
        ObjectTypeNode::parse(p);
    }
}
impl UseCaseDefinitionInputNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn ty(&self) -> Option<ObjectTypeNode> {
        self.find_node()
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
impl UseCaseDefinitionResultNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn ty(&self) -> Option<TypeNode> {
        self.find_node()
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
impl UseCaseDefinitionAsyncResultNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn ty(&self) -> Option<TypeNode> {
        self.find_node()
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
impl UseCaseDefinitionErrorNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn ty(&self) -> Option<TypeNode> {
        self.find_node()
    }
}
node! {
    pub struct NamedModelDefinitionNode = NamedModelDefinition;
    parse(p) {
        const RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[
            BraceLeft, BraceRight
        ]);

        opt_string_doc(p);
        p.expect_keyword::<KeywordModelToken>(RECOVERY);
        p.expect::<IdentifierToken>(RECOVERY);
        match p.peek() {
            Newline | EndOfFile => (),
            _ => TypeNode::parse(p)
        }
    }
}
impl NamedModelDefinitionNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn ty(&self) -> Option<TypeNode> {
        self.find_node()
    }
    pub fn name(&self) -> Option<IdentifierToken> {
        self.find_token()
    }
}
node! {
    pub struct NamedFieldDefinitionNode = NamedFieldDefinition;
    parse(p) {
        const RECOVERY: SyntaxKindSet = SyntaxKindSet::from_static_slice(&[
            BraceLeft, BraceRight
        ]);

        opt_string_doc(p);
        p.expect_keyword::<KeywordFieldToken>(RECOVERY);
        p.expect::<IdentifierToken>(RECOVERY);
        match p.peek() {
            Newline | EndOfFile => (),
            _ => TypeNode::parse(p)
        }
    }
}
impl NamedFieldDefinitionNode {
    pub fn doc(&self) -> Option<StringDocToken> {
        self.find_token()
    }
    pub fn ty(&self) -> Option<TypeNode> {
        self.find_node()
    }
    pub fn name(&self) -> Option<IdentifierToken> {
        self.find_token()
    }
}
