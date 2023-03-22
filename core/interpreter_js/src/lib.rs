use std::{cell::RefCell, fmt::Write, rc::Rc};

use anyhow::Context as AnyhowContext;
use quickjs_wasm_rs::{Context, Value as JsValue};
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
    const STD_UNSTABLE_CODE: &str = include_str!("../map_std/std_unstable.js");

    pub fn new(replacement_std: Option<&str>) -> Result<Self, JsInterpreterError> {
        let mut context = Context::default();
        let state = Rc::new(RefCell::new(InterpreterState::new()));

        core_to_map_std_impl::unstable::link(&mut context, state.clone())
            .context("Failed to export sf_unstable")?;

        // here we collect all stdlib parts and crate one code string
        let stdlib_bundle = match replacement_std {
            Some(s) => s.to_string(),
            None => {
                let mut std = String::new();

                write!(&mut std, "{}", Self::STD_UNSTABLE_CODE).unwrap();

                std
            }
        };
        assert!(stdlib_bundle.len() > 0);

        let mut me = Self { context, state };
        me.eval_global(&stdlib_bundle)
            .context("Failed to evaluate stdlib")?;

        Ok(me)
    }

    /*
    fn eval_module(&mut self, name: &str, code: &str) -> anyhow::Result<()> {
        tracing::trace!("Evaluating module \"{}\": {}", name, code);
        let module = self.context.compile_module(name, code).context("Failed to compile module")?;
        self.context.eval_binary(&module).context("Failed to evaluate module")?;

        Ok(())
    }
    */

    fn eval_global(&mut self, code: &str) -> anyhow::Result<JsValue> {
        tracing::trace!("Evaluating global: {}", code);
        self.context
            .eval_global("<global>", code)
            .context("Failed to evaluate global code")
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

        // create stdlib + map bundle
        let map_code = std::str::from_utf8(code)
            .context("Code must be valid utf8 text")
            .map_err(fmt_error)?;
        if map_code.len() == 0 {
            return Err(MapInterpreterRunError::Error(
                "Map code must not be empty".into(),
            ));
        }
        let bundle = format!("{}\n\n_start('{}');", map_code, entry);

        self.eval_global(&bundle)
            .context("Failed to run map bundle")
            .map_err(fmt_error)?;

        let result = self.state.borrow_mut().take_output().unwrap();

        Ok(result)
    }
}

/*
Research about using modules - we would need to skip quickjs_wasm_rs and use raw quickjs_wasm_sys - not extreme amount of work but it adds complexity
#[cfg(test)]
mod test {
    use std::ffi::CString;

    #[test]
    fn test_interpreter_modules_sys() {
        use quickjs_wasm_sys::{
            JS_NewRuntime, JS_NewContext, JSContext,
            JS_EVAL_TYPE_MODULE, JS_EVAL_FLAG_COMPILE_ONLY, JS_Eval,
            JS_WriteObject, JS_WRITE_OBJ_BYTECODE, JS_ReadObject,
            JS_READ_OBJ_BYTECODE, JS_EvalFunction
        };
        eprint!("\n\n");

        let runtime = unsafe { JS_NewRuntime() };
        let inner = unsafe { JS_NewContext(runtime) };

        fn compile(inner: *mut JSContext, name: &str, contents: &str) -> (u64, Vec<u8>) {
            let input = CString::new(contents).unwrap();
            let script_name = CString::new(name).unwrap();
            let len = contents.len() - 1;
            let compile_type = JS_EVAL_TYPE_MODULE;

            let raw = unsafe {
                JS_Eval(
                    inner,
                    input.as_ptr(),
                    len as _,
                    script_name.as_ptr(),
                    (JS_EVAL_FLAG_COMPILE_ONLY | compile_type) as i32,
                )
            };
            eprintln!("raw: {:X?}, tag={}", raw, (raw >> 32) as i32);

            let mut output_size = 0;
            let bytes = unsafe {
                let output_buffer = JS_WriteObject(
                    inner,
                    &mut output_size,
                    raw,
                    JS_WRITE_OBJ_BYTECODE as i32,
                );
                Vec::from_raw_parts(
                    output_buffer as *mut u8,
                    output_size.try_into().unwrap(),
                    output_size.try_into().unwrap(),
                )
            };

            (raw, bytes)
        }

        let (module_foo_raw, module_foo) = compile(inner, "foo", r"
            export default function foox(s) {
                return s + 1;
            }
        ");
        eprintln!("After foo: {:?}, ptr={:X}, raw={:X}", module_foo, module_foo.as_ptr() as usize, module_foo_raw);
        let (module_bar_raw, module_bar) = compile(inner, "bar", r"
            import foo from 'foo';

            export default foo(2);
        ");
        eprintln!("After bar: {:?}, ptr={:X}, raw={:X}", module_bar, module_bar.as_ptr() as usize, module_bar_raw);

        let bytecode = unsafe { JS_ReadObject(
                inner,
                module_bar.as_ptr(),
                module_bar.len().try_into().unwrap(),
                JS_READ_OBJ_BYTECODE as _
            )
        };
        eprintln!("Bytecode: {:X?}, tag={}", bytecode, (bytecode >> 32) as i32);

        let eval = unsafe {
            JS_EvalFunction(inner, module_bar_raw)
        };
        eprintln!("Eval: {:X?}, tag={}", eval, (eval >> 32) as i32);
    }

    #[test]
    fn test_interpreter_modules_wrap() {
        eprint!("\n\n");

        use quickjs_wasm_rs::Context;
        let context = Context::default();
        eprintln!("After context");
        let module_foo = context.compile_module("foo", r"
            export function foo(s) {
                return s + 1;
            }
        ").unwrap();
        eprintln!("After foo: {:?}", module_foo);
        let module_bar = context.compile_module("bar", r"
            import { foo } from 'foo';

            foo(2);
        ").unwrap();
        eprintln!("After bar: {:?}", module_bar);

        let eval_result = context.eval_binary(&module_bar);
        eprintln!("After eval: {:?}", eval_result.is_err());

        let (bytecode, eval) = match eval_result {
            Err(err) => panic!("Failed to evaluate binary: {:?}", err),
            Ok(r) => r
        };
        eprintln!("After result: bytecode={:?}, eval={:?}", bytecode, eval);

        assert_eq!(eval.try_as_integer().unwrap(), 3);
    }
}
*/
