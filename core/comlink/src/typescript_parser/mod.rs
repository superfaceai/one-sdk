//! Parser for TypeScript profiles.

mod const_eval;
mod diagnostic;
mod model;
mod parser;

pub use diagnostic::{Diagnostic, DiagnosticSeverity};
pub use model::{Documentation, Profile, UseCase, UseCaseExample, UseCaseSafety};

/// Parse a profile from source text.
///
/// Returns a best-effort Profile structure and a list of errors encountered.
/// If the list of errors is empty then the parsing was successful.
pub fn parse_profile(source: &str) -> (Profile, Vec<Diagnostic>) {
    let (profile, diagnostics) = parser::ProfileParser::parse(source);

    // TODO: check examples against input, result and error schemas
    // TODO: any other checks?

    (profile, diagnostics)
}
