use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum ApiKeyPlacement {
    /// Example:
    /// {
    ///   "type": "apikey",
    ///   "in": "header",
    ///   "name": "X-API-KEY",
    ///   "apikey": "$SECRET_NAME"
    /// }
    Header,
    /// Example:
    /// {
    ///   "type": "apikey",
    ///   "in": "body",
    ///   "name": "/json/path",
    ///   "bodyType": "json",
    ///   "apikey": "$SECRET_NAME"
    /// }
    Body,
    /// URL: https://example.com/{path_secret}
    /// Example:
    /// {
    ///   "type": "apikey",
    ///   "in": "path",
    ///   "name": "path_secret",
    ///   "apikey": "$SECRET_NAME"
    /// }
    Path,
    /// Example:
    /// {
    ///   "type": "apikey",
    ///   "in": "query",
    ///   "name": "query_param",
    ///   "apikey": "$SECRET_NAME"
    /// }
    Query,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum ApiKeyBodyType {
    Json,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum HttpScheme {
    Basic,
    Bearer,
    Digest,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Security {
    ApiKey {
        r#in: ApiKeyPlacement,
        name: String,
        apikey: String,
        #[serde(rename = "bodyType", default)]
        body_type: Option<ApiKeyBodyType>,
    },
    Http(HttpSecurity),
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "scheme", rename_all = "lowercase")]
pub enum HttpSecurity {
    /// Example:
    /// {
    ///   "type": "http",
    ///   "scheme": "basic",
    ///   "user": "$USER",
    ///   "password": "$PASSWORD"
    /// }
    Basic { user: String, password: String },
    /// Example:
    /// {
    ///   "type": "http",
    ///   "scheme": "bearer",
    ///   "bearerForm": "JWT",
    ///   "token": "$TOKEN"
    /// }
    Bearer {
        #[serde(rename = "bearerFormat")]
        bearer_format: String,
        token: String,
    },
}

#[cfg(test)]
mod test {
    use super::{HttpSecurity, Security};

    #[test]
    fn basic_security() {
        let security: Security = serde_json::from_value(serde_json::json!({
            "type": "http",
            "scheme": "basic",
            "user": "$USER",
            "password": "$PASSWORD"
        }))
        .unwrap();

        assert!(matches!(
            security,
            Security::Http(HttpSecurity::Basic { user, password })
            if user == "$USER" && password == "$PASSWORD"
        ));
    }

    #[test]
    fn bearer_security() {
        let security: Security = serde_json::from_value(serde_json::json!({
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "jwt",
            "token": "$TOKEN"
        }))
        .unwrap();

        assert!(matches!(
            security,
            Security::Http(HttpSecurity::Bearer { token, .. })
            if token == "$TOKEN"
        ));
    }

    #[test]
    fn apikey_security() {
        let security: Security = serde_json::from_value(serde_json::json!(
        {
            "type": "apikey",
            "in": "header",
            "name": "X-API-KEY",
            "apikey": "$API_KEY"
        }))
        .unwrap();

        assert!(matches!(
            security,
            Security::ApiKey { r#in: _, name: _, apikey, body_type: None }
            if apikey == "$API_KEY"
        ));
    }
}
