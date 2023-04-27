use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct ProviderJson {
    pub name: String,
    pub services: Vec<ProviderService>,
    #[serde(rename = "securitySchemes", default)]
    pub security_schemes: Option<Vec<SecurityScheme>>,
    pub parameters: Option<Vec<IntegrationParameter>>,
    #[serde(rename = "defaultService", default)]
    pub default_service: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ProviderService {
    pub id: String,
    #[serde(rename = "baseUrl")]
    pub base_url: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct IntegrationParameter {
    pub name: String,
    pub description: Option<String>,
    pub default: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum ApiKeyPlacement {
    /// Example:
    /// {
    ///   "id": "apikey_header",
    ///   "type": "apikey",
    ///   "in": "header",
    ///   "name": "X-API-KEY",
    ///   "apikey": "api_key_value"
    /// }
    Header,
    /// Example:
    /// {
    ///   "id": "apikey_body",
    ///   "type": "apikey",
    ///   "in": "body",
    ///   "name": "/json/path",
    ///   "bodyType": "json",
    ///   "apikey": "api_key_value"
    /// }
    Body,
    /// URL: https://example.com/{path_secret}
    /// Example:
    /// {
    ///   "id": "apikey_path",
    ///   "type": "apikey",
    ///   "in": "path",
    ///   "name": "path_secret",
    ///   "apikey": "api_key_value"
    /// }
    Path,
    /// Example:
    /// {
    ///   "id": "apikey_query",
    ///   "type": "apikey",
    ///   "in": "query",
    ///   "name": "query_param",
    ///   "apikey": "api_key_value"
    /// }
    Query,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum ApiKeyBodyType {
    Json,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum HttpScheme {
    Basic,
    Bearer,
    Digest,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "scheme", rename_all = "lowercase")]
pub enum HttpSecurity {
    /// Example:
    /// {
    ///   "id": "basic_auth",
    ///   "type": "http",
    ///   "scheme": "basic",
    /// }
    Basic { id: String },
    /// Example:
    /// {
    ///   "id": "bearer_auth",
    ///   "type": "http",
    ///   "scheme": "bearer",
    ///   "bearerFormat": "JWT",
    /// }
    Bearer {
        id: String,
        #[serde(rename = "bearerFormat", default)]
        bearer_format: Option<String>,
    },
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum SecurityScheme {
    ApiKey {
        id: String,
        r#in: ApiKeyPlacement,
        name: String,
        #[serde(rename = "bodyType", default)]
        body_type: Option<ApiKeyBodyType>,
    },
    Http(HttpSecurity),
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_provider() {
        let provider_json: ProviderJson = serde_json::from_value(serde_json::json!(
        {
            "name": "example",
            "services": [
              {
                "id": "localhost",
                "baseUrl": "http://localhost/{PARAM_ONE}"
              },
              {
                "id": "example",
                "baseUrl": "https://example.org"
              }
            ],
            "defaultService": "localhost",
            "parameters": [
              {
                "name": "PARAM_ONE",
                "description": "First integrations parameters",
                "default": "param_one_value"
              },
              {
                "name": "PARAM_TWO",
              }
            ],
            "securitySchemes": [
              {
                "id": "apikey_header",
                "type": "apikey",
                "in": "header",
                "name": "X-API-KEY",
                "apikey": "api_key_value"
              },
              {
                "id": "apikey_body",
                "type": "apikey",
                "in": "body",
                "name": "/json/path",
                "bodyType": "json",
                "apikey": "api_key_value"
              },
              {
                "id": "apikey_path",
                "type": "apikey",
                "in": "path",
                "name": "path_secret",
                "apikey": "api_key_value"
              },
              {
                "id": "apikey_query",
                "type": "apikey",
                "in": "query",
                "name": "query_param",
                "apikey": "api_key_value"
              },
              {
                "id": "basic_auth",
                "type": "http",
                "scheme": "basic",
              },
              {
                "id": "bearer_auth",
                "type": "http",
                "scheme": "bearer",
                "bearerForm": "JWT",
              }
            ]
        }))
        .unwrap();

        assert_eq!(provider_json.name, "example");
        assert_eq!(provider_json.services.len(), 2);
        assert_eq!(provider_json.default_service, Some("localhost".to_string()));
        assert_eq!(provider_json.parameters.unwrap().len(), 2);
        assert_eq!(provider_json.security_schemes.as_ref().unwrap().len(), 6);
        for scheme in provider_json.security_schemes.unwrap() {
            match scheme {
                SecurityScheme::ApiKey { id, r#in, .. } => match r#in {
                    ApiKeyPlacement::Body => assert_eq!(id, "apikey_body"),
                    ApiKeyPlacement::Header => assert_eq!(id, "apikey_header"),
                    ApiKeyPlacement::Path => assert_eq!(id, "apikey_path"),
                    ApiKeyPlacement::Query => assert_eq!(id, "apikey_query"),
                },
                SecurityScheme::Http(HttpSecurity::Basic { id }) => {
                    assert_eq!(id, "basic_auth")
                }
                SecurityScheme::Http(HttpSecurity::Bearer { id, .. }) => {
                    assert_eq!(id, "bearer_auth")
                }
            }
        }
    }
}
