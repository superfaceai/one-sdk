use std::{cell::RefCell, ops::DerefMut, rc::Rc};

use anyhow::Context as AnyhowContext;
use quickjs_wasm_rs::JSContextRef;
use thiserror::Error;

use map_std::MapStdFull;

mod core_to_map_bindings;

#[derive(Debug, Error)]
pub enum JsInterpreterError {
    // TODO: big todo - Javy uses anyhow, we need to figure out how to reasonably interface with that
    #[error("Initialzation failed: {0}")]
    InitializationFailed(anyhow::Error),
    #[error("Code evaluation failed: {0:#}")]
    EvalFailed(anyhow::Error),
    #[error("Code compilation failed: {0:#}")]
    CompilationFailed(anyhow::Error),
    #[error("Eval code cannot be an empty string")]
    EvalCodeEmpty,
}

pub struct JsInterpreter<S: MapStdFull + 'static> {
    context: JSContextRef,
    #[allow(dead_code)]
    state: Rc<RefCell<S>>,
}
impl<S: MapStdFull + 'static> JsInterpreter<S> {
    pub fn new(state: S) -> Result<Self, JsInterpreterError> {
        let mut context = JSContextRef::default();
        let state = Rc::new(RefCell::new(state));

        // link ffi
        core_to_map_bindings::unstable::link(&mut context, state.clone())
            .context("Failed to export sf_unstable")
            .map_err(JsInterpreterError::InitializationFailed)?;

        Ok(Self { context, state })
    }

    pub fn state_mut(&mut self) -> impl DerefMut<Target = S> + '_ {
        self.state.borrow_mut()
    }

    pub fn eval_code(&mut self, name: &str, code: &str) -> Result<(), JsInterpreterError> {
        if code.len() == 0 {
            return Err(JsInterpreterError::EvalCodeEmpty);
        }

        self.context
            .eval_global(name, code)
            .map_err(JsInterpreterError::EvalFailed)?;

        Ok(())
    }

    pub fn compile_code(&mut self, name: &str, code: &str) -> Result<Vec<u8>, JsInterpreterError> {
        if code.len() == 0 {
            return Err(JsInterpreterError::EvalCodeEmpty);
        }

        let bytecode = self
            .context
            .compile_global(name, code)
            .map_err(JsInterpreterError::CompilationFailed)?;

        Ok(bytecode)
    }

    pub fn eval_bytecode(&mut self, bytecode: &[u8]) -> Result<(), JsInterpreterError> {
        self.context
            .eval_binary(bytecode)
            .map_err(JsInterpreterError::EvalFailed)?;

        Ok(())
    }

    pub fn run(&mut self, code: &str, usecase: &str) -> Result<(), JsInterpreterError> {
        if code.len() == 0 {
            return Err(JsInterpreterError::EvalCodeEmpty);
        }

        let bundle = format!("{}\n\n_start('{}');", code, usecase);

        self.eval_code("map.js", &bundle)?;

        Ok(())
    }
}
