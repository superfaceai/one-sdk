use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum ApiKeyPlacement {
    Header,
    Body,
    Path,
    Query,
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
    },
    Http(HttpSecurity),
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "scheme", rename_all = "lowercase")]
pub enum HttpSecurity {
    Basic {
        user: String,
        password: String,
    },
    Bearer {
        #[serde(rename = "bearerFormat")]
        bearer_format: String,
        token: String,
    },
    Digest {
        #[serde(rename = "statusCode")]
        status_code: u16,
        #[serde(rename = "challengeHeader")]
        challenge_header: String,
        #[serde(rename = "authorizationHeader")]
        authorization_header: String,
        user: String,
        password: String,
    },
}

#[cfg(test)]
mod test {
    use super::{HttpSecurity, Security};

    #[test]
    fn basic_security() {
        let security: Security = serde_json::from_str(
            r#"
        {
            "type": "http",
            "scheme": "basic",
            "user": "$USER",
            "password": "$PASSWORD"
        }
        "#,
        )
        .unwrap();

        assert!(matches!(
            security,
            Security::Http(HttpSecurity::Basic { user, password })
            if user == "$USER" && password == "$PASSWORD"
        ));
    }

    #[test]
    fn digest_security() {
        let security: Security = serde_json::from_str(
            r#"
        {
            "type": "http",
            "scheme": "digest",
            "statusCode": 401,
            "challengeHeader": "www-authenticate",
            "authorizationHeader": "Authorization",
            "user": "$USER",
            "password": "$PASSWORD"
        }
        "#,
        )
        .unwrap();

        assert!(matches!(
            security,
            Security::Http(HttpSecurity::Digest { authorization_header: _, challenge_header: _, status_code: _, user, password })
            if user == "$USER" && password == "$PASSWORD"
        ));
    }

    #[test]
    fn bearer_security() {
        let security: Security = serde_json::from_str(
            r#"
        {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "jwt",
            "token": "$TOKEN"
        }
        "#,
        )
        .unwrap();

        assert!(matches!(
            security,
            Security::Http(HttpSecurity::Bearer { bearer_format: _, token })
            if token == "$TOKEN"
        ));
    }

    #[test]
    fn apikey_security() {
        let security: Security = serde_json::from_str(
            r#"
        {
            "type": "apikey",
            "in": "header",
            "name": "X-API-KEY",
            "apikey": "$API_KEY"
        }
        "#,
        )
        .unwrap();

        assert!(matches!(
            security,
            Security::ApiKey { r#in: _, name: _, apikey }
            if apikey == "$API_KEY"
        ));
    }
}
