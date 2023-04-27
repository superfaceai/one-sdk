use std::collections::HashMap;

use sf_std::unstable::{provider::ProviderJson, SecurityValue, SecurityValuesMap};
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

pub fn prepare_security_map(
    provider_json: ProviderJson,
    security_values: SecurityValuesMap,
) -> SecurityMap {
    let security_schemes = match provider_json.security_schemes {
        Some(security_schemes) => security_schemes,
        None => return SecurityMap::new(),
    };

    let mut security_map = SecurityMap::new();

    for security_scheme in security_schemes {
        match security_scheme {
            sf_std::unstable::provider::SecurityScheme::ApiKey {
                id,
                r#in,
                name,
                body_type,
            } => {
                let apikey = match security_values.get(&id) {
                    Some(SecurityValue::ApiKey { apikey }) => apikey,
                    Some(_) => continue, // TODO Error wrong value type
                    None => continue, // TODO sentinel type to return error later in resolve_security
                };

                security_map.insert(
                    id,
                    Security::ApiKey {
                        name,
                        apikey: apikey.to_string(),
                        r#in: ApiKeyPlacement::from(r#in),
                        body_type: body_type.map(|bt| ApiKeyBodyType::from(bt)),
                    },
                );
            }
            sf_std::unstable::provider::SecurityScheme::Http(
                sf_std::unstable::provider::HttpSecurity::Basic { id },
            ) => {
                let (user, password) = match security_values.get(&id) {
                    Some(SecurityValue::Basic { user, password }) => (user, password),
                    Some(_) => continue, // TODO
                    None => continue,    // TODO
                };

                security_map.insert(
                    id,
                    Security::Http(HttpSecurity::Basic {
                        user: user.to_string(),
                        password: password.to_string(),
                    }),
                );
            }
            sf_std::unstable::provider::SecurityScheme::Http(
                sf_std::unstable::provider::HttpSecurity::Bearer { id, bearer_format },
            ) => {
                let token = match security_values.get(&id) {
                    Some(SecurityValue::Bearer { token }) => token,
                    Some(_) => continue, // TODO
                    None => continue,    // TODO
                };

                security_map.insert(
                    id,
                    Security::Http(HttpSecurity::Bearer {
                        token: token.to_string(),
                        bearer_format: bearer_format,
                    }),
                );
            }
        }
    }

    security_map
}
