use std::{cell::RefCell, rc::Rc};

use anyhow::Context as AnyhowContext;
use thiserror::Error;
use quickjs_wasm_rs::Context;

use sf_std::unstable::HostValue;
use map_std::{MapInterpreter, MapInterpreterRunError};

mod state;
use state::InterpreterState;

mod map_std_export;

#[derive(Debug, Error)]
pub enum JsInterpreterError {
    #[error("{0}")]
    Error(#[from] anyhow::Error) // TODO: big todo
}

pub struct JsInterpreter {
    context: Context,
    #[allow(dead_code)]
    state: Rc<RefCell<InterpreterState>>,
}
impl JsInterpreter {
    const STD_CODE: &str = include_str!("../map_std/std.js");

    pub fn new(replacement_std: Option<&str>) -> Result<Self, JsInterpreterError> {
        let mut context = Context::default();
        let state = Rc::new(RefCell::new(InterpreterState::new()));

        map_std_export::unstable::link(&mut context, state.clone())
            .context("Failed to export sf_unstable")?;

        let std = match replacement_std {
            None => Self::STD_CODE,
            Some(r) => r,
        };
        context
            .eval_global("std.js", std)
            .context("Failed to evaluate std.js")?;

        Ok(Self { context, state })
    }
}
impl MapInterpreter for JsInterpreter {
    fn run(
        &mut self,
        code: &[u8],
        entry: &str,
        input: HostValue,
        parameters: HostValue,
        security: HostValue,
    ) -> Result<Result<HostValue, HostValue>, MapInterpreterRunError> {
        self.state
            .borrow_mut()
            .set_input(input, parameters, security);

        let script = std::str::from_utf8(code).context("Code must be valid utf8 text").map_err(|e| MapInterpreterRunError::Error(e.to_string()))?;
        let entry = format!("_start(\"{}\")", entry);

        self.context
            .eval_global("map.js", script)
            .context("Failed to evaluate map code").map_err(|e| MapInterpreterRunError::Error(e.to_string()))?;
        self.context
            .eval_global("entry.js", &entry)
            .context("Failed to evaluate entry").map_err(|e| MapInterpreterRunError::Error(e.to_string()))?;
        let result = self.state.borrow_mut().take_output().unwrap();

        Ok(result)
    }
}
