use std::{cell::RefCell, rc::Rc};

use anyhow::Context as AnyhowContext;
use quickjs_wasm_rs::Context;
use thiserror::Error;

use map_std::{unstable::MapValue, MapInterpreter, MapInterpreterRunError};

mod state;
use state::InterpreterState;

mod core_to_map_std_impl;

#[derive(Debug, Error)]
pub enum JsInterpreterError {
    #[error("{0}")]
    Error(#[from] anyhow::Error), // TODO: big todo - Javy uses anyhow, we need to figure out how to reasonably interface with that
    #[error("Eval code cannot be an empty string")]
    EvalCodeEmpty,
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

    pub fn set_input(&mut self, input: MapValue) {
        self.state.borrow_mut().set_input(input)
    }

    pub fn take_output(&mut self) -> Result<MapValue, MapValue> {
        self.state.borrow_mut().take_output().unwrap()
    }

    pub fn eval_code(&mut self, name: &str, code: &str) -> Result<(), JsInterpreterError> {
        if code.len() == 0 {
            return Err(JsInterpreterError::EvalCodeEmpty);
        }

        tracing::trace!("Evaluating global: {}", code);
        self.context
            .eval_global(name, code)
            .context("Failed to evaluate global code")?;

        Ok(())
    }

    pub fn compile_code(&mut self, name: &str, code: &str) -> Result<Vec<u8>, JsInterpreterError> {
        if code.len() == 0 {
            return Err(JsInterpreterError::EvalCodeEmpty);
        }
        
        let bytecode = self.context.compile_global(name, code).context("Failed to compile global code")?;

        Ok(bytecode)
    }

    pub fn eval_bytecode(&mut self, bytecode: &[u8]) -> Result<(), JsInterpreterError> {
        self.context.eval_binary(bytecode)?;

        Ok(())
    }
}
impl MapInterpreter for JsInterpreter {
    fn run(
        &mut self,
        code: &[u8],
        entry: &str,
        input: MapValue,
        parameters: MapValue,
        security: MapValue,
    ) -> Result<Result<MapValue, MapValue>, MapInterpreterRunError> {
        self.set_input(MapValue::Object({
            let mut map = serde_json::Map::default();
            map.insert("input".to_string(), input);
            map.insert("parameters".to_string(), parameters);
            map.insert("security".to_string(), security);

            map
        }));

        let map_code = std::str::from_utf8(code)
            .context("Code must be valid utf8 text")
            .map_err(fmt_error)?;
        if map_code.len() == 0 {
            return Err(MapInterpreterRunError::MapCodeEmpty);
        }
        let bundle = format!("{}\n\n_start('{}');", map_code, entry);

        self.eval_code("map.js", &bundle)
            .context("Failed to run map bundle")
            .map_err(fmt_error)?;

        Ok(self.take_output())
    }
}
