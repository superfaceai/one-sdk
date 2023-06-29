use url::{ParseError, Url};

#[derive(Debug)]
pub struct UrlParts {
    pub protocol: String,
    pub host: String,
    pub hostname: String,
    pub port: Option<String>,
    pub pathname: String,
    pub origin: String,
    pub search: Option<String>,
    pub hash: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
}

impl UrlParts {
    pub fn parse(url: &str, base: Option<&str>) -> Result<UrlParts, ParseError> {
        let parsed_url: Url;
        if let Some(base) = base {
            let parsed_base = Url::parse(base)?;
            parsed_url = parsed_base.join(url)?;
        } else {
            parsed_url = Url::parse(url)?
        }

        let protocol = parsed_url.scheme().to_string();
        let hostname = parsed_url.host().unwrap().to_string();
        let mut host = parsed_url.host().unwrap().to_string();
        let mut port: Option<String> = None;
        let pathname = parsed_url.path().to_string();
        let origin = parsed_url.origin().ascii_serialization();
        let username = match parsed_url.username() {
            "" => None,
            _ => Some(parsed_url.username().to_string()),
        };
        let password = parsed_url.password().map(|p| p.to_string());
        let search = parsed_url.query().map(|q| q.to_string());
        let hash = parsed_url.fragment().map(|f| f.to_string());

        if let Some(p) = parsed_url.port() {
            port = Some(p.to_string());
            host = format!("{}:{}", host, p);
        }

        Ok(UrlParts {
            hostname,
            host,
            port,
            origin,
            protocol,
            username,
            pathname,
            password,
            hash,
            search,
        })
    }

    pub fn format(&self) -> String {
        "".to_string()
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_parsing() {
        let parts = UrlParts::parse(
            "schema://user:pass@domain.tld:666/path1/path2?foo=1&bar=baz&bar=woo#hash",
            None,
        )
        .unwrap();

        assert_eq!(parts.protocol, "schema".to_string());
        assert_eq!(parts.hostname, "domain.tld".to_string());
        assert_eq!(parts.host, "domain.tld:666".to_string());
    }
}
