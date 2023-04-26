use std::collections::HashMap;
pub enum ApiKeyPlacement {
    Header,
    Body,
    Path,
    Query,
}
impl From<sf_std::unstable::provider::ApiKeyPlacement> for ApiKeyPlacement {
    fn from(value: sf_std::unstable::provider::ApiKeyPlacement) -> Self {
        match value {
            sf_std::unstable::provider::ApiKeyPlacement::Header => ApiKeyPlacement::Header,
            sf_std::unstable::provider::ApiKeyPlacement::Body => ApiKeyPlacement::Body,
            sf_std::unstable::provider::ApiKeyPlacement::Path => ApiKeyPlacement::Path,
            sf_std::unstable::provider::ApiKeyPlacement::Query => ApiKeyPlacement::Query,
        }
    }
}

pub enum ApiKeyBodyType {
    Json,
}
impl From<sf_std::unstable::provider::ApiKeyBodyType> for ApiKeyBodyType {
    fn from(value: sf_std::unstable::provider::ApiKeyBodyType) -> Self {
        match value {
            sf_std::unstable::provider::ApiKeyBodyType::Json => ApiKeyBodyType::Json,
        }
    }
}

pub enum HttpScheme {
    Basic,
    Bearer,
    Digest,
}
impl From<sf_std::unstable::provider::HttpScheme> for HttpScheme {
    fn from(value: sf_std::unstable::provider::HttpScheme) -> Self {
        match value {
            sf_std::unstable::provider::HttpScheme::Basic => HttpScheme::Basic,
            sf_std::unstable::provider::HttpScheme::Bearer => HttpScheme::Bearer,
            sf_std::unstable::provider::HttpScheme::Digest => HttpScheme::Digest,
        }
    }
}

pub enum HttpSecurity {
    Basic {
        user: String,
        password: String,
    },
    Bearer {
        bearer_format: Option<String>,
        token: String,
    },
}

pub enum Security {
    ApiKey {
        r#in: ApiKeyPlacement,
        name: String,
        apikey: String,
        body_type: Option<ApiKeyBodyType>,
    },
    Http(HttpSecurity),
}

pub type SecurityMap = HashMap<String, Security>;
