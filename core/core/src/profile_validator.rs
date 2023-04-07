use anyhow::Context;

use sf_std::unstable::fs;

use interpreter_js::{JsInterpreter, JsInterpreterError};
use map_std::unstable::MapValue;

pub struct ProfileValidator {
    interpreter: JsInterpreter,
    validator_bytecode: Vec<u8>
}
impl ProfileValidator {
    const PROFILE_VALIDATOR_JS: &str = include_str!("../assets/js/profile_validator.js");

    pub fn new(profile: String) -> Result<Self, JsInterpreterError> {
        let mut interpreter = JsInterpreter::new()?;

        let validator_bytecode = match std::env::var("SF_REPLACE_PROFILE_VALIDATOR").ok() {
            None => interpreter.compile_code("profile_validator.js", Self::PROFILE_VALIDATOR_JS),
            Some(path) => {
                let replacement =
                    fs::read_to_string(&path).context("Failed to load replacement profile_validator")?;
                interpreter.compile_code(&path, &replacement)
            }
        }?;

        let mut me = Self { interpreter, validator_bytecode };
        me.set_profile(profile)?;

        Ok(me)
    }

    fn set_profile(&mut self, profile: String) -> Result<(), JsInterpreterError> {
        tracing::trace!("ProfileValidator::set_profile: {}", profile);

        let mut val = MapValue::Object(Default::default());
        val.as_object_mut().unwrap().insert("profile".to_string(), MapValue::String(profile));
        self.interpreter.set_input(val);
        
        self.interpreter.eval_bytecode(&self.validator_bytecode)?;
        let result = self.interpreter.take_output();
        dbg!(result).unwrap();

        Ok(())
    }

    pub fn validate_input(&mut self, input: MapValue) -> Result<(), JsInterpreterError> {
        // TODO: a bit unwieldy, but we'll make it better when we make MapValue our own type instead of serde_json::Value
        let mut val = MapValue::Object(Default::default());
        val.as_object_mut().unwrap().insert("input".to_string(), input);
        self.interpreter.set_input(val);

        self.interpreter.eval_bytecode(&self.validator_bytecode)?;
        let result = self.interpreter.take_output();
        dbg!(result).unwrap();

        Ok(())
    }

    pub fn validate_output(&mut self, result: Result<MapValue, MapValue>) -> Result<(), JsInterpreterError> {
        // TODO: a bit unwieldy, but we'll make it better when we make MapValue our own type instead of serde_json::Value
        let mut val = MapValue::Object(Default::default());
        match result {
            Ok(res) => { val.as_object_mut().unwrap().insert("result".to_string(), res); }
            Err(err) => { val.as_object_mut().unwrap().insert("error".to_string(), err); }
        };
        self.interpreter.set_input(val);

        self.interpreter.eval_bytecode(&self.validator_bytecode)?;
        let result = self.interpreter.take_output();
        dbg!(result).unwrap();

        Ok(())
    }
}
