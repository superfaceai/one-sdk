use std::{cell::RefCell, rc::Rc};

use quickjs_wasm_rs::Context;

use anyhow::Context as AnyhowContext;

use crate::sf_std::host_to_core::unstable::perform::StructuredValue;

use super::state::InterpreterState;

mod sf_std;

pub struct JsInterpreter {
    context: Context,
    state: Rc<RefCell<InterpreterState>>,
}
impl JsInterpreter {
    const STD_CODE: &str = include_str!("./std.js");

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
        input: StructuredValue,
    ) -> anyhow::Result<StructuredValue> {
        let script = std::str::from_utf8(code).context("Code must be valid utf8 text")?;
        let entry = format!("sf_entry(\"{}\")", entry);

        self.context
            .eval_global("map.js", script)
            .context("Failed to evaluate map code")?;
        let result = self
            .context
            .eval_global("entry.js", &entry)
            .context("Failed to evaluate entry")?;
        let result = result.as_f64().unwrap();
        println!("core: result: {}", result);

        Ok(StructuredValue::Number(
            serde_json::Number::from_f64(result).unwrap(),
        ))
    }
}
