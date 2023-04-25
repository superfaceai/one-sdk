use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
pub enum SecurityValues {
    ApiKey { apikey: String },
    BasicAuth { username: String, password: String },
    BearerToken { token: String },
}

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
pub enum SecurityValuesMap {
    None,
    Object(BTreeMap<String, SecurityValues>),
}

#[cfg(test)]
mod test {
    use super::SecurityValuesMap;

    #[test]
    fn test_all_values() {
        let security_values_map: SecurityValuesMap = serde_json::from_value(serde_json::json!({
            "apikey": {
                "apikey": "foo"
            },
            "basic": {
                "username": "foo",
                "password": "bar"
            },
            "bearer": {
                "token": "foo"
            }
        }))
        .unwrap();

        match security_values_map {
            SecurityValuesMap::None => panic!("should not be none"),
            SecurityValuesMap::Object(map) => {
                assert_eq!(map.len(), 3);
                assert!(map.contains_key("apikey"));
                assert!(map.contains_key("basic"));
                assert!(map.contains_key("bearer"));

                let api_key = map.get("apikey").unwrap();
                match api_key {
                    super::SecurityValues::ApiKey { apikey } => {
                        assert_eq!(apikey, "foo");
                    }
                    _ => panic!("should be apikey"),
                }

                let basic = map.get("basic").unwrap();
                match basic {
                    super::SecurityValues::BasicAuth { username, password } => {
                        assert_eq!(username, "foo");
                        assert_eq!(password, "bar");
                    }
                    _ => panic!("should be basic"),
                }

                let bearer = map.get("bearer").unwrap();
                match bearer {
                    super::SecurityValues::BearerToken { token } => {
                        assert_eq!(token, "foo");
                    }
                    _ => panic!("should be bearer"),
                }
            }
        }
    }
}
