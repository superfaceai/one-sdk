use std::fmt::Display;

use url::{ParseError, Url};

#[derive(Debug)]
pub struct UrlParts {
    pub protocol: String,
    pub host: String,
    pub pathname: String,
    pub hostname: Option<String>,
    pub port: Option<String>,
    pub origin: Option<String>,
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

        let protocol = format!("{}:", parsed_url.scheme().to_string());
        let hostname = parsed_url.host().map(|h| h.to_string());
        let mut host = parsed_url.host().map_or("".to_string(), |h| h.to_string());
        let mut port: Option<String> = None;
        let pathname = parsed_url.path().to_string();
        let origin = Some(parsed_url.origin().ascii_serialization());
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
}

impl Display for UrlParts {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut url: Url;
        if self.host.is_empty() {
            url = Url::parse(&self.protocol).unwrap();
        //} else if  {
        } else {
            url = Url::parse(format!("{}//{}", self.protocol, self.host).as_str()).unwrap();
        }

        let _result = url.set_host(Some(self.host.as_str()));
        let _result =
            url.set_port(self.port.as_ref().map(|p| {
                u16::from_str_radix(p.as_str(), 10).expect("Port should be valid integer")
            }));
        url.set_path(&self.pathname);
        url.set_fragment(self.hash.as_ref().map(|f| f.as_str()));
        url.set_query(self.search.as_ref().map(|s| s.as_str()));
        if let Some(username) = self.username.as_ref() {
            let _result = url.set_username(username.as_str());
        }
        let _result = url.set_password(self.password.as_ref().map(|p| p.as_str()));

        write!(f, "{}", url.to_string())?;

        Ok(())
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

        assert_eq!(parts.protocol, "schema:".to_string());
        assert_eq!(parts.hostname, Some("domain.tld".to_string()));
        assert_eq!(parts.host, "domain.tld:666".to_string());
    }

    #[test]
    fn test_to_string() {
        let parts = UrlParts {
            protocol: "scheme:".to_string(),
            host: "domain.tld".to_string(),
            hostname: None,
            origin: None,
            port: Some("666".to_string()),
            username: Some("user".to_string()),
            password: Some("pass".to_string()),
            pathname: "/path1/path2".to_string(),
            search: Some("foo=1&bar=baz&bar=woo".to_string()),
            hash: Some("hash".to_string()),
        };

        assert_eq!(
            parts.to_string(),
            "scheme://user:pass@domain.tld:666/path1/path2?foo=1&bar=baz&bar=woo#hash".to_string()
        )
    }

    #[test]
    fn test_to_string_domain_custom_schema() {
        let parts = UrlParts {
            protocol: "foo:".to_string(),
            host: "domain.tld".to_string(),
            pathname: "".to_string(),
            hostname: None,
            origin: None,
            port: None,
            username: None,
            password: None,
            search: None,
            hash: None,
        };

        assert_eq!(parts.to_string(), "foo://domain.tld".to_string())
    }

    #[test]
    fn test_to_string_file_path() {
        let parts = UrlParts {
            protocol: "file:".to_string(),
            host: "".to_string(),
            pathname: "/path/to/file.txt".to_string(),
            hostname: None,
            origin: None,
            port: None,
            username: None,
            password: None,
            search: None,
            hash: None,
        };

        assert_eq!(parts.to_string(), "file:///path/to/file.txt".to_string())
    }
}
