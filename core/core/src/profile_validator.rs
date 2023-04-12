use std::collections::BTreeMap;

use anyhow::Context;

use sf_std::unstable::fs;

use interpreter_js::{JsInterpreter, JsInterpreterError};
use map_std::unstable::MapValue;

pub struct ProfileValidator {
    interpreter: JsInterpreter,
    validator_bytecode: Vec<u8>,
    usecase: String,
}
impl ProfileValidator {
    const PROFILE_VALIDATOR_JS: &str = include_str!("../assets/js/profile_validator.js");

    pub fn new(profile: String, usecase: String) -> Result<Self, JsInterpreterError> {
        let mut interpreter = JsInterpreter::new()?;

        let validator_bytecode = match std::env::var("SF_REPLACE_PROFILE_VALIDATOR").ok() {
            None => interpreter.compile_code("profile_validator.js", Self::PROFILE_VALIDATOR_JS),
            Some(path) => {
                let replacement = fs::read_to_string(&path)
                    .context("Failed to load replacement profile_validator")?;
                interpreter.compile_code(&path, &replacement)
            }
        }?;

        let mut me = Self {
            interpreter,
            validator_bytecode,
            usecase,
        };
        me.set_profile(profile)?;

        Ok(me)
    }

    fn set_profile(&mut self, profile: String) -> Result<(), JsInterpreterError> {
        tracing::trace!("ProfileValidator::set_profile: {}", profile);
        self.interpreter
            .set_input(MapValue::Object(BTreeMap::from_iter([
                ("profile".into(), MapValue::String(profile)),
                ("usecase".into(), MapValue::String(self.usecase.clone())),
            ])));

        self.interpreter.eval_bytecode(&self.validator_bytecode)?;
        let result = self.interpreter.take_output();
        dbg!(result).unwrap();

        Ok(())
    }

    pub fn validate_input(&mut self, input: MapValue) -> Result<(), JsInterpreterError> {
        self.interpreter
            .set_input(MapValue::Object(BTreeMap::from_iter([
                ("input".into(), input),
                ("usecase".into(), MapValue::String(self.usecase.clone())),
            ])));

        self.interpreter.eval_bytecode(&self.validator_bytecode)?;
        let result = self.interpreter.take_output();
        dbg!(result).unwrap();

        Ok(())
    }

    pub fn validate_output(
        &mut self,
        result: Result<MapValue, MapValue>,
    ) -> Result<(), JsInterpreterError> {
        let val = match result {
            Ok(res) => MapValue::Object(BTreeMap::from_iter([
                ("result".into(), res),
                ("usecase".into(), MapValue::String(self.usecase.clone())),
            ])),
            Err(err) => MapValue::Object(BTreeMap::from_iter([
                ("error".into(), err),
                ("usecase".into(), MapValue::String(self.usecase.clone())),
            ])),
        };
        self.interpreter.set_input(val);

        self.interpreter.eval_bytecode(&self.validator_bytecode)?;
        let result = self.interpreter.take_output();
        dbg!(result).unwrap();

        Ok(())
    }
}
