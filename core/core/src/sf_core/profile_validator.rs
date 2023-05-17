#![allow(dead_code)] // TODO: validator broken? always has been

use std::collections::BTreeMap;

use thiserror::Error;

use sf_std::unstable::fs;

use interpreter_js::{JsInterpreter, JsInterpreterError};
use map_std::unstable::MapValue;

#[derive(Debug, Error)]
pub enum ProfileValidatorError {
    #[error("Error interpreting validator code: {0}")]
    InterpreterFailed(#[from] JsInterpreterError),
    #[error("Internal validator error: {0}")]
    InternalError(String),
    #[error("Error parsing profile: {0}")]
    ProfileParseFailed(String),
    #[error("Input is invalid: {0}")]
    InputValidationFailed(String),
    #[error("Result is invalid: {0}")]
    ResultValidationFailed(String),
    #[error("Error is invalid: {0}")]
    ErrorValidationFailed(String),
}

pub struct ProfileValidator {
    interpreter: JsInterpreter,
    validator_bytecode: Vec<u8>,
    usecase: String,
}
impl ProfileValidator {
    const PROFILE_VALIDATOR_JS: &str = include_str!("../../assets/js/profile_validator.js");

    pub fn new(profile: String, usecase: String) -> Result<Self, ProfileValidatorError> {
        let mut interpreter = JsInterpreter::new()?;

        let validator_bytecode = match std::env::var("SF_REPLACE_PROFILE_VALIDATOR").ok() {
            None => interpreter.compile_code("profile_validator.js", Self::PROFILE_VALIDATOR_JS),
            Some(path) => {
                let replacement = fs::read_to_string(&path)
                    .expect("Failed to load replacement profile_validator");
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

    fn set_profile(&mut self, profile: String) -> Result<(), ProfileValidatorError> {
        tracing::trace!("ProfileValidator::set_profile: {}", profile);
        self.interpreter.set_context(
            MapValue::Object(BTreeMap::from_iter([
                ("profile".into(), MapValue::String(profile)),
                ("usecase".into(), MapValue::String(self.usecase.clone())),
            ])),
            None,
        );

        self.interpreter.eval_bytecode(&self.validator_bytecode)?;
        match self.interpreter.take_output() {
            Err(err) => Err(ProfileValidatorError::ProfileParseFailed(
                err.try_into_string().unwrap(),
            )),
            Ok(_) => Ok(()),
        }
    }

    pub fn validate_input(&mut self, input: MapValue) -> Result<(), ProfileValidatorError> {
        tracing::trace!("ProfileValidator::validate_input: {:?}", input);
        self.interpreter.set_context(
            MapValue::Object(BTreeMap::from_iter([
                ("input".into(), input),
                ("usecase".into(), MapValue::String(self.usecase.clone())),
            ])),
            None,
        );

        self.interpreter.eval_bytecode(&self.validator_bytecode)?;

        match self.interpreter.take_output() {
            Err(err) => Err(ProfileValidatorError::InternalError(
                err.try_into_string().unwrap(),
            )),
            Ok(MapValue::String(err)) => Err(ProfileValidatorError::InputValidationFailed(err)),
            Ok(MapValue::None) => Ok(()),
            _ => unreachable!(),
        }
    }

    pub fn validate_output(
        &mut self,
        result: Result<MapValue, MapValue>,
    ) -> Result<(), ProfileValidatorError> {
        tracing::trace!("ProfileValidator::validate_output: {:?}", result);

        match result {
            Ok(res) => {
                let val = MapValue::Object(BTreeMap::from_iter([
                    ("result".into(), res),
                    ("usecase".into(), MapValue::String(self.usecase.clone())),
                ]));
                self.interpreter.set_context(val, None);

                self.interpreter.eval_bytecode(&self.validator_bytecode)?;

                match self.interpreter.take_output() {
                    Err(err) => Err(ProfileValidatorError::InternalError(
                        err.try_into_string().unwrap(),
                    )),
                    Ok(MapValue::String(err)) => {
                        Err(ProfileValidatorError::ResultValidationFailed(err))
                    }
                    Ok(MapValue::None) => Ok(()),
                    _ => unreachable!(),
                }
            }
            Err(err) => {
                let val = MapValue::Object(BTreeMap::from_iter([
                    ("error".into(), err),
                    ("usecase".into(), MapValue::String(self.usecase.clone())),
                ]));
                self.interpreter.set_context(val, None);

                self.interpreter.eval_bytecode(&self.validator_bytecode)?;

                match self.interpreter.take_output() {
                    Err(err) => Err(ProfileValidatorError::InternalError(
                        err.try_into_string().unwrap(),
                    )),
                    Ok(MapValue::String(err)) => {
                        Err(ProfileValidatorError::ErrorValidationFailed(err))
                    }
                    Ok(MapValue::None) => Ok(()),
                    _ => unreachable!(),
                }
            }
        }
    }
}
