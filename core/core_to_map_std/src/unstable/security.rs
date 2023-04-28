use std::collections::HashMap;

use base64::Engine;

use sf_std::unstable::{provider::ProviderJson, SecurityValue, SecurityValuesMap};

use super::{HttpCallError, HttpRequest, MapValue, MapValueObject};

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
    provider_json: &ProviderJson,
    security_values: &SecurityValuesMap,
) -> SecurityMap {
    let security_schemes = match &provider_json.security_schemes {
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
                let apikey = match security_values.get(id) {
                    Some(SecurityValue::ApiKey { apikey }) => apikey,
                    Some(_) => continue, // TODO Error wrong value type
                    None => continue, // TODO sentinel type to return error later in resolve_security
                };

                security_map.insert(
                    id.to_owned(),
                    Security::ApiKey {
                        name: name.to_owned(),
                        apikey: apikey.to_owned(),
                        r#in: ApiKeyPlacement::from(*r#in),
                        body_type: body_type.map(|bt| ApiKeyBodyType::from(bt)),
                    },
                );
            }
            sf_std::unstable::provider::SecurityScheme::Http(
                sf_std::unstable::provider::HttpSecurity::Basic { id },
            ) => {
                let (user, password) = match security_values.get(id) {
                    Some(SecurityValue::Basic { user, password }) => (user, password),
                    Some(_) => continue, // TODO
                    None => continue,    // TODO
                };

                security_map.insert(
                    id.to_owned(),
                    Security::Http(HttpSecurity::Basic {
                        user: user.to_owned(),
                        password: password.to_owned(),
                    }),
                );
            }
            sf_std::unstable::provider::SecurityScheme::Http(
                sf_std::unstable::provider::HttpSecurity::Bearer { id, bearer_format },
            ) => {
                let token = match security_values.get(id) {
                    Some(SecurityValue::Bearer { token }) => token,
                    Some(_) => continue, // TODO
                    None => continue,    // TODO
                };

                security_map.insert(
                    id.to_string(),
                    Security::Http(HttpSecurity::Bearer {
                        token: token.to_string(),
                        bearer_format: bearer_format.to_owned(),
                    }),
                );
            }
        }
    }

    security_map
}

pub fn resolve_security(
    security_map: &SecurityMap,
    params: &mut HttpRequest,
) -> Result<(), HttpCallError> {
    let security = match params.security {
        None => return Ok(()),
        Some(ref security) => security,
    };

    let security_config = security_map.get(security.as_str());

    match security_config {
        None => {
            return Err(HttpCallError::InvalidSecurityConfiguration(format!(
                "Security configuration '{}' is missing",
                security
            )));
        }
        Some(Security::Http(HttpSecurity::Basic { user, password })) => {
            let encoded_crendentials = base64::engine::general_purpose::STANDARD
                .encode(format!("{}:{}", user, password).as_bytes());
            let basic_auth = vec![format!("Basic {}", encoded_crendentials)];

            params
                .headers
                .insert("Authorization".to_string(), basic_auth);
        }
        Some(Security::Http(HttpSecurity::Bearer {
            bearer_format: _,
            token,
        })) => {
            let digest_auth = vec![format!("Bearer {}", token)];

            params
                .headers
                .insert("Authorization".to_string(), digest_auth);
        }
        Some(Security::ApiKey {
            r#in,
            name,
            apikey,
            body_type,
        }) => match (r#in, body_type) {
            (ApiKeyPlacement::Header, _) => {
                params
                    .headers
                    .insert(name.to_string(), vec![apikey.to_string()]);
            }
            (ApiKeyPlacement::Path, _) => {
                params.url = params.url.replace(&format!("{{{}}}", name), &apikey);
            }
            (ApiKeyPlacement::Query, _) => {
                params
                    .query
                    .insert(name.to_string(), vec![apikey.to_string()]);
            }
            (ApiKeyPlacement::Body, Some(ApiKeyBodyType::Json)) => {
                if let Some(body) = &params.body {
                    let mut body =
                        serde_json::from_slice::<serde_json::Value>(&body).map_err(|e| {
                            HttpCallError::InvalidSecurityConfiguration(format!(
                                "Failed to parse body: {}",
                                e
                            ))
                        })?;

                    let keys = if name.starts_with('/') {
                        name.split('/').filter(|p| !p.is_empty()).collect()
                    } else {
                        vec![name.as_str()]
                    };

                    if keys.len() == 0 {
                        return Err(HttpCallError::InvalidSecurityConfiguration(format!(
                            "Invalid field name '{}'",
                            name
                        )));
                    }

                    let mut key_idx: usize = 0;
                    let mut nested = &mut body;

                    while key_idx < keys.len() - 1 {
                        nested = &mut nested[keys[key_idx]];

                        if !nested.is_object() {
                            return Err(HttpCallError::InvalidSecurityConfiguration(format!(
                                "Field values on path '/{}' isn't object",
                                &keys[0..key_idx + 1].join("/")
                            )));
                        }

                        key_idx += 1;
                    }

                    nested[keys[key_idx]] = serde_json::Value::from(apikey.to_string());

                    params.body = Some(serde_json::to_vec(&body).map_err(|e| {
                        HttpCallError::InvalidSecurityConfiguration(format!(
                            "Failed to serialize body: {}",
                            e
                        ))
                    })?);
                } else {
                    return Err(HttpCallError::Failed("Body is empty".to_string()));
                }
            }
            (ApiKeyPlacement::Body, None) => {
                return Err(HttpCallError::InvalidSecurityConfiguration(
                    "Missing body type".to_string(),
                ));
            }
        },
    }

    Ok(())
}

pub fn prepare_provider_parameters(provider_json: &ProviderJson) -> MapValueObject {
    return provider_json
        .parameters
        .as_ref()
        .map_or(MapValueObject::new(), |params| {
            MapValueObject::from_iter(params.into_iter().filter(|p| p.default.is_some()).map(|i| {
                match &i.default {
                    Some(default) => (i.name.to_owned(), MapValue::String(default.to_owned())),
                    None => panic!("None is filtered out"),
                }
            }))
        });
}
