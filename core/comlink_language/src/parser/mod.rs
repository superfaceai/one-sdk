mod lexer;
mod syntax;

pub use syntax::{AstNode, CstNode, CstToken, ParserError, ProfileDocumentNode};

pub fn parse_profile(source: &str) -> (ProfileDocumentNode, Vec<ParserError>) {
    ProfileDocumentNode::parse_root(source)
}

#[cfg(test)]
pub mod testing {
    use std::fmt::Write;

    use rowan::{GreenNodeData, GreenTokenData, NodeOrToken};

    use super::syntax::{SyntaxKind, SyntaxKindSet};

    fn syntax_tree_print_inner(
        out: &mut impl Write,
        skip: &SyntaxKindSet,
        node: NodeOrToken<&GreenNodeData, &GreenTokenData>,
        depth: usize,
    ) {
        if skip.contains(node.kind().into()) {
            return;
        }
        let ident = "  ".repeat(depth);

        match node {
            NodeOrToken::Node(node) => {
                writeln!(
                    out,
                    "{}{:?}[{}]:",
                    ident,
                    SyntaxKind::from(node.kind()),
                    u32::from(node.text_len())
                )
                .unwrap();
                for child in node.children() {
                    syntax_tree_print_inner(out, skip, child, depth + 1);
                }
            }
            NodeOrToken::Token(token) => {
                writeln!(
                    out,
                    "{}{:?}[{}]",
                    ident,
                    SyntaxKind::from(token.kind()),
                    u32::from(token.text_len())
                )
                .unwrap();
            }
        }
    }

    pub fn syntax_tree_print(node: &GreenNodeData, skip_trivia: bool) -> String {
        let skip = if skip_trivia {
            SyntaxKindSet::trivia_tokens()
        } else {
            SyntaxKindSet::empty()
        };

        let mut string = String::new();
        syntax_tree_print_inner(&mut string, &skip, NodeOrToken::Node(node), 0);

        string
    }
}
