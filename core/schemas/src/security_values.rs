// Failed pretty fast on HashMap support: https://github.com/GREsau/schemars/issues/124

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

//use std::collections::HashMap;

//pub type SecurityValues = HashMap<String, SecurityValue>;

use schemars::JsonSchema;

#[derive(JsonSchema)]
pub struct SecurityValues {
    pub name: SecurityValue,
}

#[derive(JsonSchema)]
pub enum SecurityValue {
    Apikey { apikey: String },
    Token { token: String },
    Basic { username: String, password: String },
}
