use std::{cell::RefCell, ops::DerefMut, rc::Rc};

use anyhow::Context as AnyhowContext;
use quickjs_wasm_rs::JSContextRef;
use sf_std::unstable::exception::{PerformException, PerformExceptionErrorCode};
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
impl From<JsInterpreterError> for PerformException {
    fn from(value: JsInterpreterError) -> Self {
        PerformException {
            error_code: PerformExceptionErrorCode::JsInterpreterError,
            message: value.to_string(),
        }
    }
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
        if code.is_empty() {
            return Err(JsInterpreterError::EvalCodeEmpty);
        }

        self.context
            .eval_global(name, code)
            .map_err(JsInterpreterError::EvalFailed)?;

        Ok(())
    }

    pub fn compile_code(&mut self, name: &str, code: &str) -> Result<Vec<u8>, JsInterpreterError> {
        if code.is_empty() {
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

    pub fn run(&mut self, name: &str, code: &str, usecase: &str) -> Result<(), JsInterpreterError> {
        if code.is_empty() {
            return Err(JsInterpreterError::EvalCodeEmpty);
        }

        self.eval_code(name, code)?;

        let entry = format!("_start('{}');", usecase);
        self.eval_code("", &entry)?;

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use map_std::unstable::MapStdUnstable;

    use super::*;

    struct MockMapStd;
    impl MockMapStd {
        pub fn new() -> Self {
            Self
        }
    }
    impl MapStdUnstable for MockMapStd {
        fn print(&mut self, message: &str) {
            eprintln!("mock print: {}", message)
        }

        fn stream_read(
            &mut self,
            _handle: sf_std::abi::Handle,
            _buf: &mut [u8],
        ) -> std::io::Result<usize> {
            Ok(0)
        }

        fn stream_write(
            &mut self,
            _handle: sf_std::abi::Handle,
            _buf: &[u8],
        ) -> std::io::Result<usize> {
            Ok(0)
        }

        fn stream_close(&mut self, _handle: sf_std::abi::Handle) -> std::io::Result<()> {
            Ok(())
        }

        fn http_call(
            &mut self,
            _params: map_std::unstable::HttpRequest,
            _security: map_std::unstable::HttpRequestSecurity
        ) -> Result<sf_std::abi::Handle, map_std::unstable::HttpCallError> {
            Ok(1)
        }

        fn http_call_head(
            &mut self,
            _handle: sf_std::abi::Handle,
        ) -> Result<map_std::unstable::HttpResponse, map_std::unstable::HttpCallHeadError> {
            todo!()
        }

        fn take_context(
            &mut self,
        ) -> Result<map_std::unstable::MapValue, map_std::unstable::TakeContextError> {
            todo!()
        }

        fn set_output_success(
            &mut self,
            _output: map_std::unstable::MapValue,
        ) -> Result<(), map_std::unstable::SetOutputError> {
            Ok(())
        }

        fn set_output_failure(
            &mut self,
            _output: map_std::unstable::MapValue,
        ) -> Result<(), map_std::unstable::SetOutputError> {
            Ok(())
        }
    }
    impl MapStdFull for MockMapStd {}

    #[test]
    fn test_creating_two_instances_does_not_crash() {
        // this test should be in quickjs-wasm-rs but we reproduce our bug here
        const CODE: &str = r#"
        function main() {
            let buf = new Uint8Array(1024);
            for (let i = 0; i < 100; i += 1) {
                const tmp = new Uint8Array(buf.length + 1024);
                buf = tmp; 
            }

            __ffi.unstable.print(`buf len: ${buf.length}`);
        }
        main()
        "#;

        // accumulate objects to be garbage collected
        let mut interpreter1 = JsInterpreter::new(MockMapStd::new()).unwrap();
        interpreter1.eval_code("test1", "const x = 1;").unwrap();
        std::mem::drop(interpreter1);

        // trigger garbage collection here
        let mut interpreter2 = JsInterpreter::new(MockMapStd::new()).unwrap();
        interpreter2.eval_code("test2", CODE).unwrap();
        std::mem::drop(interpreter2);
    }
}
