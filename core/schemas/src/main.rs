use schemars::schema_for;

use crate::security_values::SecurityValues;

mod security_values;

fn main() {
    let schema = schema_for!(SecurityValues);
    println!("{}", serde_json::to_string_pretty(&schema).unwrap());
}
