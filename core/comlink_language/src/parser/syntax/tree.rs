use std::iter::FilterMap;

use crate::parser::{
    syntax::{SyntaxKind, SyntaxKindSet, SyntaxNode, SyntaxToken},
};

use super::SyntaxElement;

pub mod nodes;
pub mod serde;
pub mod tokens;
mod parser;

pub use parser::{Parser, ParserError};

/// Trait for methods which are available to the rule definitions.
pub trait TreeParser {
    /// Start a frame.
    ///
    /// The frame can be later resolved into a node using [`Self::finish_frame_node`] or cancelled using [`Self::cancel_frame`].
    fn start_frame(&mut self);
    /// Finish the latest frame as a node and assign it `N::KIND`.
    fn finish_frame_node<N: CstNode>(&mut self);
    /// Cancel latest frame and restore the state of the parser as it was before the frame was started.
    ///
    /// This can be used to peek infinitely into the future and then restore the state.
    fn cancel_frame(&mut self);
    /// Record one raw token and assing it `T::KIND`.
    fn token<T: CstToken>(&mut self);
    /// Record an error event.
    ///
    /// Advances by one token unless the next token is in `recovery_set`.
    fn error<M>(&mut self, message: M, recovery_set: SyntaxKindSet)
    where
        String: From<M>;
    /// Returns the kind of the next token.
    fn peek(&self) -> SyntaxKind;
    /// Like [`Self::peek`] but transforms valid identifiers into keywords.
    fn peek_keyword(&self) -> SyntaxKind;
    /// Skip any number of tokens `T` and return how many were skipped.
    ///
    /// Tokens are always recorded into the tree.
    fn skip<T: CstToken>(&mut self) -> usize;
    /// Convenience function for consuming the next token if it is of `kind`, otherwise records an error.
    ///
    /// See [`Self::error`] for more info about `recovery_set`.
    fn expect<T: CstToken>(&mut self, recovery_set: SyntaxKindSet) {
        if !T::RAW_KINDS.contains(self.peek()) {
            self.error(T::EXPECT_MESSAGE, recovery_set);
        } else {
            self.token::<T>();
        }
    }
    /// Same as [`Self::expect`] but uses [`Self::peek_keyword`] instead of [`Self::peek`].
    fn expect_keyword<T: CstToken>(&mut self, recovery_set: SyntaxKindSet) {
        if !T::RAW_KINDS.contains(self.peek_keyword()) {
            self.error(T::EXPECT_MESSAGE, recovery_set);
        } else {
            self.token::<T>();
        }
    }
    /// Optionally consumes token `T` and returns whether it was consumed.
    fn opt<T: CstToken>(&mut self) -> bool {
        if T::RAW_KINDS.contains(self.peek()) {
            self.token::<T>();
            true
        } else {
            false
        }
    }
    /// Same as [`Self::opt_keyword`] but uses [`Self::peek_keyword`] instead of [`Self::peek`].
    fn opt_keyword<T: CstToken>(&mut self) -> bool {
        if T::RAW_KINDS.contains(self.peek_keyword()) {
            self.token::<T>();
            true
        } else {
            false
        }
    }
}

/// A concrete syntax tree node.
///
/// A CstNode is physically present in the green tree and can be directly parsed out of the source.
pub trait CstNode: AstNode {
    const KIND: SyntaxKind;
    /// Parse this node from the given parser.
    ///
    /// The parsed node and the error are stored in the parser.
    fn parse(parser: &mut impl TreeParser);

    /// Parses this node directly from a string.
    ///
    /// This is a convenience method implemented using [`Self::parse`].
    fn parse_root(source: &str) -> (Self, Vec<ParserError>) {
        let mut parser = Parser::new(source);

        Self::parse(&mut parser);

        let (node, errors) = parser.build_tree();
        (Self::cast(SyntaxNode::new_root(node)).unwrap(), errors)
    }
}
pub trait CstToken: Sized + AsRef<SyntaxToken> {
    const RAW_KINDS: SyntaxKindSet;
    const KIND: SyntaxKind;
    const EXPECT_MESSAGE: &'static str;

    /// Attempts to cast `token` into `Self`.
    ///
    /// If token is of a different kind than `Self::KIND` then this returns `None`.
    fn cast(token: SyntaxToken) -> Option<Self>;
}

// These are newtypes because the inner FilterMap types are too verbose
pub struct FilterTokensIter<C: CstToken> {
    inner: FilterMap<
        rowan::SyntaxElementChildren<super::ComlinkLanguage>,
        fn(SyntaxElement) -> Option<C>,
    >,
}
impl<C: CstToken> Iterator for FilterTokensIter<C> {
    type Item = C;

    fn next(&mut self) -> Option<Self::Item> {
        self.inner.next()
    }
}
pub struct FilterNodesIter<C: AstNode> {
    inner:
        FilterMap<rowan::SyntaxNodeChildren<super::ComlinkLanguage>, fn(SyntaxNode) -> Option<C>>,
}
impl<C: AstNode> Iterator for FilterNodesIter<C> {
    type Item = C;

    fn next(&mut self) -> Option<Self::Item> {
        self.inner.next()
    }
}

/// An abstract syntax tree node.
///
/// An AstdNode may not be physically presend in the green tree and might just be an abstraction over a set of CstNodes.
pub trait AstNode: Sized + AsRef<SyntaxNode> {
    /// Attempts to cast `node` into `Self`.
    ///
    /// If node is of a different kind than `Self::KIND` then this returns `None`.
    fn cast(node: SyntaxNode) -> Option<Self>;

    fn find_token<Ch: CstToken>(&self) -> Option<Ch> {
        self.as_ref()
            .children_with_tokens()
            .find_map(|ch| ch.into_token().and_then(Ch::cast))
    }

    fn filter_tokens<Ch: CstToken>(&self) -> FilterTokensIter<Ch> {
        FilterTokensIter {
            inner: self
                .as_ref()
                .children_with_tokens()
                .filter_map(|ch| ch.into_token().and_then(Ch::cast)),
        }
    }

    fn find_node<Ch: AstNode>(&self) -> Option<Ch> {
        self.as_ref().children().find_map(Ch::cast)
    }

    fn filter_nodes<Ch: AstNode>(&self) -> FilterNodesIter<Ch> {
        FilterNodesIter {
            inner: self.as_ref().children().filter_map(Ch::cast),
        }
    }
}
