use std::ops::Add;

use serde::{Deserialize, Serialize};

use rowan::SyntaxText;

/// Raw location is intended for piece-wise location computation.
///
/// The `line` and `column` fields are 0-based, as opposed to [`Location`] 1-based fields.
#[derive(Clone, Copy)]
pub struct RawLocation {
    line: usize,
    column: usize,
    char_index: usize,
}
impl RawLocation {
    pub fn empty() -> Self {
        Self {
            line: 0,
            column: 0,
            char_index: 0,
        }
    }

    /// Computes raw location for the end of the given `slice`.
    pub fn compute_end(slice: &str) -> Self {
        let (last_line_start, newline_count) =
            slice.char_indices().fold((0, 0), |acc, (index, ch)| {
                if ch == '\n' {
                    (index + 1, acc.1 + 1)
                } else {
                    acc
                }
            });

        Self {
            line: newline_count,
            column: slice.len() - last_line_start,
            char_index: slice.len(),
        }
    }

    /// Computes raw location for the end of the given `text`.
    ///
    /// Interanlly this fold over the text chunks and runs [`Self::compute_end`].
    pub fn compute_syntax_text_end(text: SyntaxText) -> Self {
        text.try_fold_chunks(
            Self::empty(),
            |acc, slice| -> Result<Self, std::convert::Infallible> {
                Ok(acc + Self::compute_end(slice))
            },
        )
        .unwrap()
    }
}
impl Add<Self> for RawLocation {
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        Self {
            line: self.line + rhs.line,
            column: if rhs.line > 0 {
                rhs.column
            } else {
                self.column + rhs.column
            },
            char_index: self.char_index + rhs.char_index,
        }
    }
}
impl From<RawLocation> for Location {
    fn from(value: RawLocation) -> Self {
        Location {
            line: value.line + 1,
            column: value.column + 1,
            char_index: value.char_index,
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct Location {
    /// Line number - starts at 1
    pub line: usize,
    /// Column number - starts at 1
    pub column: usize,
    #[serde(rename = "charIndex")]
    /// Character index within the source code - starts at 0
    pub char_index: usize,
}
#[derive(Serialize, Deserialize)]
pub struct LocationSpan {
    pub start: Location,
    pub end: Location,
}

#[cfg(test)]
mod test {
    use super::RawLocation;

    #[test]
    fn test_raw_location() {
        let source = "hello\nworld";
        let location = RawLocation::compute_end(source);

        assert_eq!(location.line, 1);
        assert_eq!(location.column, 5);
        assert_eq!(location.char_index, 11);
    }
}
