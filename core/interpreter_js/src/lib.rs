use std::{cell::RefCell, rc::Rc};

use anyhow::Context as AnyhowContext;
use quickjs_wasm_rs::Context;
use thiserror::Error;

use map_std::{MapInterpreter, MapInterpreterRunError};
use sf_std::unstable::HostValue;

mod state;
use state::InterpreterState;

mod core_to_map_std_impl;

#[derive(Debug, Error)]
pub enum JsInterpreterError {
    #[error("{0}")]
    Error(#[from] anyhow::Error), // TODO: big todo
    #[error("Eval code cannot be an empty string")]
    EvalCodeEmpty
}

fn fmt_error(error: anyhow::Error) -> MapInterpreterRunError {
    MapInterpreterRunError::Error(format!("{:?}", error))
}

pub struct JsInterpreter {
    context: Context,
    #[allow(dead_code)]
    state: Rc<RefCell<InterpreterState>>,
}
impl JsInterpreter {
    pub fn new() -> Result<Self, JsInterpreterError> {
        let mut context = Context::default();
        let state = Rc::new(RefCell::new(InterpreterState::new()));

        // link ffi
        core_to_map_std_impl::unstable::link(&mut context, state.clone())
            .context("Failed to export sf_unstable")?;

        Ok(Self { context, state })
    }

    pub fn eval_code(&mut self, code: &str) -> Result<(), JsInterpreterError> {
        if code.len() == 0 {
            return Err(JsInterpreterError::EvalCodeEmpty);
        }

        tracing::trace!("Evaluating global: {}", code);
        self.context
            .eval_global("<global>", code)
            .context("Failed to evaluate global code")?;

        Ok(())
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

        let map_code = std::str::from_utf8(code)
            .context("Code must be valid utf8 text")
            .map_err(fmt_error)?;
        if map_code.len() == 0 {
            return Err(MapInterpreterRunError::MapCodeEmpty);
        }
        let bundle = format!("{}\n\n_start('{}');", map_code, entry);

        self.eval_code(&bundle)
            .context("Failed to run map bundle")
            .map_err(fmt_error)?;

        Ok(
            self.state.borrow_mut().take_output().unwrap()
        )
    }
}
