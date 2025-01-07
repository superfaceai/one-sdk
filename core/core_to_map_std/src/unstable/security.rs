use std::{collections::HashMap, fmt::Write};

use base64::Engine;

use sf_std::{
    unstable::{
        exception::{PerformException, PerformExceptionErrorCode},
        provider::ProviderJson,
        HostValue,
    },
    HeaderName,
};

use super::{HttpCallError, HttpRequest, HttpRequestSecurity, MapValue, MapValueObject};

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
        username: String,
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

pub type SecurityMapKey = String;
pub enum SecurityMapValue {
    Security(Security),
    Error(SecurityMisconfiguredError),
}
pub type SecurityMap = HashMap<SecurityMapKey, SecurityMapValue>;

pub enum SecurityValue {
    ApiKey { apikey: String },
    Basic { username: String, password: String },
    Bearer { token: String },
}
pub type SecurityValuesMap = HashMap<String, SecurityValue>;

#[derive(Debug, thiserror::Error)]
pub enum PrepareSecurityMapError {
    #[error("Security is misconfigured:\n{}", SecurityMisconfiguredError::format_errors(.0.as_slice()))]
    SecurityMisconfigured(Vec<SecurityMisconfiguredError>),
}
impl From<PrepareSecurityMapError> for PerformException {
    fn from(value: PrepareSecurityMapError) -> Self {
        PerformException {
            error_code: PerformExceptionErrorCode::PrepareSecurityMapError,
            message: value.to_string(),
        }
    }
}

#[derive(Debug)]
pub struct SecurityMisconfiguredError {
    pub id: String,
    pub expected: String,
}
impl SecurityMisconfiguredError {
    pub fn format_errors(errors: &[Self]) -> String {
        let mut res = String::new();

        for err in errors {
            writeln!(
                &mut res,
                "Value for {} is misconfigured. Expected {}",
                err.id, err.expected
            )
            .unwrap();
        }

        res
    }
}

pub fn prepare_security_map(
    provider_json: &ProviderJson,
    map_security: &HostValue,
) -> Result<SecurityMap, PrepareSecurityMapError> {
    let security_schemes = match &provider_json.security_schemes {
        Some(security_schemes) => security_schemes,
        None => return Ok(SecurityMap::new()),
    };

    let security_values = match &map_security {
        HostValue::Object(obj) => {
            let mut result = SecurityValuesMap::new();

            for (id, config) in obj.iter() {
                if let HostValue::Object(obj) = config {
                    let security_value: SecurityValue;

                    if obj.contains_key("apikey") {
                        security_value = SecurityValue::ApiKey {
                            apikey: match obj.get("apikey") {
                                Some(HostValue::String(str)) => str.to_owned(),
                                _ => {
                                    unreachable!(
                                        "Schema validation should ensure there is String value for apikey field."
                                    );
                                }
                            },
                        }
                    } else if obj.contains_key("username") {
                        security_value = SecurityValue::Basic {
                            username: match obj.get("username") {
                                Some(HostValue::String(str)) => str.to_owned(),
                                _ => {
                                    unreachable!(
                                        "Schema validation ensures there is String value for username field."
                                    );
                                }
                            },
                            password: match obj.get("password") {
                                Some(HostValue::String(str)) => str.to_owned(),
                                _ => {
                                    unreachable!(
                                        "Schema validation ensures there is String value for password field."
                                    );
                                }
                            },
                        }
                    } else if obj.contains_key("token") {
                        security_value = SecurityValue::Bearer {
                            token: match obj.get("token") {
                                Some(HostValue::String(str)) => str.to_owned(),
                                _ => {
                                    unreachable!(
                                        "Schema validation ensures there is String value for token field."
                                    );
                                }
                            },
                        }
                    } else {
                        unreachable!("Schema validation ensures value is one of the types above.");
                    }

                    result.insert(id.to_owned(), security_value);
                } else {
                    unreachable!("JSON Schema validation ensures it is Object.");
                }
            }

            result
        }
        _ => HashMap::new(),
    };

    let mut security_map = SecurityMap::new();
    let mut errors: Vec<SecurityMisconfiguredError> = Vec::new();

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
                    Some(_) => {
                        errors.push(SecurityMisconfiguredError {
                            id: id.to_owned(),
                            expected: "{ apikey: String }".to_string(),
                        });
                        continue;
                    }
                    None => {
                        security_map.insert(
                            id.to_owned(),
                            SecurityMapValue::Error(SecurityMisconfiguredError {
                                id: id.to_owned(),
                                expected: "not empty value".to_string(),
                            }),
                        );
                        continue;
                    }
                };

                security_map.insert(
                    id.to_owned(),
                    SecurityMapValue::Security(Security::ApiKey {
                        name: name.to_owned(),
                        apikey: apikey.to_owned(),
                        r#in: ApiKeyPlacement::from(*r#in),
                        body_type: body_type.map(ApiKeyBodyType::from),
                    }),
                );
            }
            sf_std::unstable::provider::SecurityScheme::Http(
                sf_std::unstable::provider::HttpSecurity::Basic { id },
            ) => {
                let (user, password) = match security_values.get(id) {
                    Some(SecurityValue::Basic { username, password }) => (username, password),
                    Some(_) => {
                        errors.push(SecurityMisconfiguredError {
                            id: id.to_owned(),
                            expected: "{ username: String, password: String }".to_string(),
                        });
                        continue;
                    }
                    None => {
                        security_map.insert(
                            id.to_owned(),
                            SecurityMapValue::Error(SecurityMisconfiguredError {
                                id: id.to_owned(),
                                expected: "not empty value".to_string(),
                            }),
                        );
                        continue;
                    }
                };

                security_map.insert(
                    id.to_owned(),
                    SecurityMapValue::Security(Security::Http(HttpSecurity::Basic {
                        username: user.to_owned(),
                        password: password.to_owned(),
                    })),
                );
            }
            sf_std::unstable::provider::SecurityScheme::Http(
                sf_std::unstable::provider::HttpSecurity::Bearer { id, bearer_format },
            ) => {
                let token = match security_values.get(id) {
                    Some(SecurityValue::Bearer { token }) => token,
                    Some(_) => {
                        errors.push(SecurityMisconfiguredError {
                            id: id.to_owned(),
                            expected: "{ token: String }".to_string(),
                        });
                        continue;
                    }
                    None => {
                        security_map.insert(
                            id.to_owned(),
                            SecurityMapValue::Error(SecurityMisconfiguredError {
                                id: id.to_owned(),
                                expected: "not None".to_string(),
                            }),
                        );
                        continue;
                    }
                };

                security_map.insert(
                    id.to_string(),
                    SecurityMapValue::Security(Security::Http(HttpSecurity::Bearer {
                        token: token.to_string(),
                        bearer_format: bearer_format.to_owned(),
                    })),
                );
            }
        }
    }

    if !errors.is_empty() {
        return Err(PrepareSecurityMapError::SecurityMisconfigured(errors));
    }

    Ok(security_map)
}

pub fn resolve_security(
    security_map: &SecurityMap,
    params: &mut HttpRequest,
    security: &HttpRequestSecurity
) -> Result<(), HttpCallError> {
    match security {
        HttpRequestSecurity::FirstValid(ref ids) => {
            let mut first_error = None;
            for id in ids {
                match try_resolve_security(security_map, params, id) {
                    Ok(()) => return Ok(()),
                    Err(err) => {
                        if first_error.is_none() {
                            first_error = Some(err);
                        }
                    }
                }
            }
            
            match first_error {
                None => Ok(()),
                Some(err) => return Err(HttpCallError::InvalidSecurityConfiguration(
                    err
                ))
            }
        }
        HttpRequestSecurity::All(ref ids) => {
            let mut all_errors = Vec::new();
            for id in ids {
                match try_resolve_security(security_map, params, id) {
                    Ok(()) => (),
                    Err(err) => all_errors.push(err.to_string())
                }
            }

            if all_errors.len() > 0 {
                return Err(HttpCallError::InvalidSecurityConfiguration(
                    all_errors.join("\n")
                ))
            }
            Ok(())
        }
    }
}
fn try_resolve_security(
    security_map: &SecurityMap,
    params: &mut HttpRequest,
    security: &str
) -> Result<(), String> {
    let security_config = security_map.get(security);

    match security_config {
        None => {
            return Err(format!(
                "Security configuration for {} is missing",
                security
            ));
        }
        Some(SecurityMapValue::Error(err)) => {
            return Err(
                SecurityMisconfiguredError::format_errors(std::slice::from_ref(err)),
            );
        }
        Some(SecurityMapValue::Security(Security::Http(HttpSecurity::Basic {
            username,
            password,
        }))) => {
            let encoded_crendentials = base64::engine::general_purpose::STANDARD
                .encode(format!("{}:{}", username, password).as_bytes());
            let basic_auth = vec![format!("Basic {}", encoded_crendentials)];

            params
                .headers
                .insert(HeaderName::from("Authorization"), basic_auth);
        }
        Some(SecurityMapValue::Security(Security::Http(HttpSecurity::Bearer {
            bearer_format: _,
            token,
        }))) => {
            let digest_auth = vec![format!("Bearer {}", token)];

            params
                .headers
                .insert(HeaderName::from("Authorization"), digest_auth);
        }
        Some(SecurityMapValue::Security(Security::ApiKey {
            r#in,
            name,
            apikey,
            body_type,
        })) => match (r#in, body_type) {
            (ApiKeyPlacement::Header, _) => {
                params
                    .headers
                    .insert(HeaderName::from(name.as_str()), vec![apikey.to_string()]);
            }
            (ApiKeyPlacement::Path, _) => {
                params.url = params.url.replace(&format!("{{{}}}", name), apikey);
            }
            (ApiKeyPlacement::Query, _) => {
                params
                    .query
                    .insert(name.to_string(), vec![apikey.to_string()]);
            }
            (ApiKeyPlacement::Body, Some(ApiKeyBodyType::Json)) => {
                if let Some(body) = &params.body {
                    let mut body =
                        serde_json::from_slice::<serde_json::Value>(body).map_err(|e| {
                            format!(
                                "Failed to parse body: {}",
                                e
                            )
                        })?;

                    let keys = if name.starts_with('/') {
                        name.split('/').filter(|p| !p.is_empty()).collect()
                    } else {
                        vec![name.as_str()]
                    };

                    if keys.is_empty() {
                        return Err(format!(
                            "Invalid field name '{}'",
                            name
                        ));
                    }

                    let mut nested = &mut body;
                    for (key_idx, key) in keys.iter().enumerate() {
                        if nested.is_array() {
                            let key_number = match key.parse::<usize>() {
                                Ok(n) => n,
                                Err(_) => return Err(format!(
                                    "Field value on path '/{}' is an array but provided key cannot be parsed as a number",
                                    &keys[0..=key_idx].join("/")
                                ))
                            };
                            nested = &mut nested[key_number];
                        } else if nested.is_object() {
                            nested = &mut nested[key];
                        } else {
                            return Err(format!(
                                "Field value on path '/{}' must be an object or an array",
                                &keys[0..=key_idx].join("/")
                            ));
                        }
                    }
                    *nested = serde_json::Value::from(apikey.to_string());

                    params.body = Some(serde_json::to_vec(&body).map_err(|e| {
                        format!(
                            "Failed to serialize body: {}",
                            e
                        )
                    })?);
                } else {
                    return Err(
                        "Api key placement is set to body but the body is empty".to_string(),
                    );
                }
            }
            (ApiKeyPlacement::Body, None) => {
                return Err(
                    "Missing body type".to_string(),
                );
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
            MapValueObject::from_iter(params.iter().filter(|p| p.default.is_some()).map(|i| {
                match &i.default {
                    Some(default) => (i.name.to_owned(), MapValue::String(default.to_owned())),
                    None => panic!("None is filtered out"),
                }
            }))
        });
}
