use std::{cell::RefCell, rc::Rc};

use quickjs_wasm_rs::Context;

use anyhow::Context as AnyhowContext;

use crate::sf_std::host_to_core::unstable::HostValue;

use super::state::InterpreterState;

mod sf_std;

pub struct JsInterpreter {
    context: Context,
    #[allow(dead_code)]
    state: Rc<RefCell<InterpreterState>>,
}
impl JsInterpreter {
    const STD_CODE: &str = include_str!("./sf_std/std.js");

    pub fn new() -> anyhow::Result<Self> {
        let mut context = Context::default();
        let state = Rc::new(RefCell::new(InterpreterState::new()));

        sf_std::unstable::link(&mut context, state.clone())
            .context("Failed to export sf_unstable")?;
        context
            .eval_global("std.js", Self::STD_CODE)
            .context("Failed to evaluate std.js")?;

        Ok(Self { context, state })
    }
}
impl super::Interpreter for JsInterpreter {
    fn run(
        &mut self,
        code: &[u8],
        entry: &str,
        input: HostValue,
        parameters: HostValue,
        security: HostValue,
    ) -> anyhow::Result<Result<HostValue, HostValue>> {
        self.state
            .borrow_mut()
            .set_input(input, parameters, security);

        let script = std::str::from_utf8(code).context("Code must be valid utf8 text")?;
        let entry = format!("_start(\"{}\")", entry);

        self.context
            .eval_global("map.js", script)
            .context("Failed to evaluate map code")?;
        self.context
            .eval_global("entry.js", &entry)
            .context("Failed to evaluate entry")?;
        let result = self.state.borrow_mut().take_output().unwrap();

        Ok(result)
    }
}
