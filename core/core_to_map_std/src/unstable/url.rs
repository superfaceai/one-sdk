use url::{ParseError, Url};

pub fn parse(url: &str, base: Option<&str>) -> Result<Url, ParseError> {
    if let Some(base) = base {
        let parsed_base = Url::parse(base)?;
        return parsed_base.join(url);
    }

    Url::parse(url)
}
