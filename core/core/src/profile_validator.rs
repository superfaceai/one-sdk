// use std::collections::BTreeMap;

use interpreter_js::{JsInterpreter, JsInterpreterError};
use map_std::unstable::MapValue;

pub struct ProfileValidator {
    interpreter: JsInterpreter,
    profile: String,
}
impl ProfileValidator {
    const PROFILE_VALIDATOR_JS: &str = include_str!("../assets/js/profile_validator.js");

    pub fn new(profile: String) -> Result<Self, JsInterpreterError> {
        let interpreter = JsInterpreter::new()?;

        Ok(Self {
            interpreter,
            profile,
        })
    }

    pub fn validate_input(&mut self, input: MapValue) -> Result<(), JsInterpreterError> {
        // TODO: a bit unwieldy, but we'll make it better when we make MapValue our own type instead of serde_json::Value
        let mut val = MapValue::Object(Default::default());
        val.as_object_mut().unwrap().extend(
            [
                (
                    "profile".to_string(),
                    MapValue::String(self.profile.clone()),
                ), // TODO: send up-front
                ("input".to_string(), input),
            ]
            .into_iter(),
        );
        self.interpreter.set_input(val);

        self.interpreter
            .eval_code("profile_validator.js", Self::PROFILE_VALIDATOR_JS)?; // TODO: compile to bytecode?

        let result = self.interpreter.take_output();
        dbg!(result);

        Ok(())
    }

    pub fn validate_output(&mut self, result: MapValue) -> Result<(), JsInterpreterError> {
        let mut val = MapValue::Object(Default::default());
        val.as_object_mut().unwrap().extend(
            [
                (
                    "profile".to_string(),
                    MapValue::String(self.profile.clone()),
                ), // TODO: send up-front
                ("result".to_string(), result),
            ]
            .into_iter(),
        );
        self.interpreter.set_input(val);

        self.interpreter
            .eval_code("profile_validator.js", Self::PROFILE_VALIDATOR_JS)?; // TODO: compile to bytecode?

        let result = self.interpreter.take_output();
        dbg!(result);

        Ok(())
    }
}
