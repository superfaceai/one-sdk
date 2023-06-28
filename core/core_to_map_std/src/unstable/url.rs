use url::{ParseError, Url};

pub fn parse(value: &str) -> Result<Url, ParseError> {
    Url::parse(value)
}
