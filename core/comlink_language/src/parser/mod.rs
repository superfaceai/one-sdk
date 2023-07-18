mod lexer;
mod syntax;

pub use syntax::{AstNode, AstToken, ParserError, ProfileDocumentNode};

pub fn parse_profile(source: &str) -> (ProfileDocumentNode, Vec<ParserError>) {
    ProfileDocumentNode::parse_root(source)
}

#[cfg(test)]
mod test {
    use std::borrow::Borrow;

    use super::testing::syntax_tree_print;

    #[test]
    fn test_parse_profile() {
        let source = r#"
        name = "scope/example"
        version = "1.2.3"

        // comment
        """
        Foo usecase
        """
        usecase Foo safe {
          // input {
          //   f! string!
          //   fn string
          // }
          // result number
          // error enum {
          //   FORBIDDEN_WORD
          // }
    
          // "success example"
          // example success_example {
          //   input {
          //     "hello has 5 letters"
          //     f = "hello"
          //     fn = None
          //   }
          //   result 5
          //   // TODO: do we want this? async result undefined
          // }
    
          // example error_example {
          //   input {
          //     f = "evil"
          //   }
          //   error "FORBIDDEN_WORD"
          // }
    
          // example {
          //   result [0, 1, 2]
          // }
        }
        "#;

        let (profile, errors) = super::parse_profile(source);
        eprintln!("tree:\n{}", syntax_tree_print(&profile.as_ref().green().borrow()));
        eprintln!("errors: {:?}", errors);

        assert!(errors.is_empty());
        assert_eq!(profile.name().unwrap().value().unwrap().text().unwrap(), "scope/example");
        assert_eq!(profile.version().unwrap().value().unwrap().text().unwrap(), "1.2.3");
    }
}

#[cfg(test)]
pub mod testing {
    use std::fmt::Write;

    use rowan::{GreenNodeData, GreenTokenData, NodeOrToken};

    use super::syntax::SyntaxKind;

    fn syntax_tree_print_inner(
        out: &mut impl Write,
        node: NodeOrToken<&GreenNodeData, &GreenTokenData>,
        depth: usize,
    ) {
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
                    syntax_tree_print_inner(out, child, depth + 1);
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

    pub fn syntax_tree_print(node: &GreenNodeData) -> String {
        let mut string = String::new();
        syntax_tree_print_inner(&mut string, NodeOrToken::Node(node), 0);

        string
    }
}
