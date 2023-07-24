// https://github.com/GREsau/schemars/issues/124

/*
{
  "type": "object",
  "patternProperties": {
    "^[a-z][_\\-a-z]*$": {
      "type": "object",
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "username": {
              "type": "string"
            },
            "password": {
              "type": "string"
            }
          },
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "token": {
              "type": "string"
            }
          },
          "additionalProperties": false
        },
        {
          "type": "object",
          "properties": {
            "apikey": {
              "type": "string"
            }
          },
          "additionalProperties": false
        }
      ]
    }
  }
}
*/

use core::fmt;
use std::collections::BTreeMap;

use schemars::{
    schema::{InstanceType, ObjectValidation, Schema, SchemaObject, StringValidation},
    schema_for, JsonSchema,
};

#[derive(Debug, Eq, Ord)]
pub struct Id {
    value: String,
}
impl From<&str> for Id {
    fn from(s: &str) -> Id {
        Id {
            value: s.to_owned(),
        }
    }
}
impl Into<Id> for String {
    fn into(self) -> Id {
        Id { value: self }
    }
}
impl fmt::Display for Id {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.value.fmt(f)
    }
}
impl PartialEq for Id {
    fn eq(&self, other: &Self) -> bool {
        self.value == other.value
    }
}
impl PartialOrd for Id {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        self.value.partial_cmp(&other.value)
    }
}

impl JsonSchema for Id {
    fn schema_name() -> String {
        "Id".to_owned()
    }

    fn json_schema(_gen: &mut schemars::gen::SchemaGenerator) -> schemars::schema::Schema {
        SchemaObject {
            instance_type: Some(InstanceType::String.into()),
            string: Some(Box::new(StringValidation {
                pattern: Some(r"^[a-z][_\-a-z]*$".to_owned()),
                ..Default::default()
            })),
            ..Default::default()
        }
        .into()
    }
}

#[derive(JsonSchema)]
pub enum SecurityValue {
    Apikey { apikey: String },
    Token { token: String },
    Basic { username: String, password: String },
}

pub struct SecurityValues {
    map: BTreeMap<Id, SecurityValue>,
}
impl SecurityValues {
    pub fn new() -> Self {
        Self {
            map: BTreeMap::new(),
        }
    }

    pub fn insert(&mut self, key: Id, value: SecurityValue) {
        self.map.insert(key, value);
    }
}
impl JsonSchema for SecurityValues {
    fn schema_name() -> String {
        "SecurityValues".to_owned()
    }

    fn json_schema(_gen: &mut schemars::gen::SchemaGenerator) -> schemars::schema::Schema {
        let mut pattern_properties = BTreeMap::new();
        pattern_properties.insert(
            schema_for!(Id).schema.string.unwrap().pattern.unwrap(),
            Schema::Object(schema_for!(SecurityValue).schema),
        );

        SchemaObject {
            instance_type: Some(InstanceType::Object.into()),
            object: Some(Box::new(ObjectValidation {
                pattern_properties,
                ..Default::default()
            })),
            ..Default::default()
        }
        .into()
    }
}

#[cfg(test)]
mod test {
    use schemars::schema_for;

    use super::{Id, SecurityValue, SecurityValues};

    #[test]
    fn basics() {
        let mut sec_vals = SecurityValues::new();
        sec_vals.insert(
            "example_api_key".into(),
            SecurityValue::Apikey {
                apikey: "my api key".to_owned(),
            },
        );

        let schema = schema_for!(SecurityValues);
        println!("{}", serde_json::to_string_pretty(&schema).unwrap());
    }
}
