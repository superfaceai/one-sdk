use std::fmt;

use anyhow::Context;

use wasmi::{core::HostError, Engine, Extern, Linker, Module, Store, TypedResumableCall};

use crate::sf_std::host_to_core::unstable::perform::StructuredValue;

use super::state::InterpreterState;

mod sf_std;

#[derive(Debug)]
enum ResumableMarkerTrap {
    Abort(String),
}
impl fmt::Display for ResumableMarkerTrap {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Abort(msg) => write!(f, "abort: {}", msg),
        }
    }
}
impl HostError for ResumableMarkerTrap {}

pub struct WasmInterpreter {
    engine: Engine,
    store: Store<InterpreterState>,
    linker: Linker<InterpreterState>,
}
impl WasmInterpreter {
    // TODO: Use thiserror and define specific errors
    pub fn new() -> anyhow::Result<Self> {
        let engine = Engine::default();
        let mut store = Store::<InterpreterState>::new(&engine, InterpreterState::new());
        let mut linker = Linker::<InterpreterState>::new();

        sf_std::link(&mut linker, &mut store).context("Failed to export sf_unstable")?;

        Ok(Self {
            engine,
            store,
            linker,
        })
    }
}
impl super::Interpreter for WasmInterpreter {
    fn run(
        &mut self,
        wasm: &[u8],
        entry: &str,
        input: StructuredValue,
    ) -> anyhow::Result<StructuredValue> {
        let module = Module::new(&self.engine, wasm).context("Failed to initialize wasm module")?;

        // instance links store and module
        let instance = self
            .linker
            .instantiate(&mut self.store, &module)
            .context("Failed to instantiate module")?;
        // instance may or may not have a "start" function to initialize globals (?)
        let instance = instance
            .start(&mut self.store)
            .context("Failed to start module")?;

        let entry = format!("sf_entry_{}", entry);
        let module_entry = instance
            .get_export(&self.store, &entry)
            .and_then(Extern::into_func)
            .context("No or invalid map entry symbol")
            .and_then(|f| {
                // TODO: decide on core_to_map ABI
                f.typed::<i32, i32>(&self.store)
                    .context("Incorrectly typed entry symbol")
            })?;

        println!("core: map input: {:?}", input);

        let input_value = match input {
            StructuredValue::Number(ref num) if num.is_i64() => num.as_i64().unwrap(),
            StructuredValue::Object(ref object) if object.contains_key("person") => {
                match object.get("person").unwrap() {
                    StructuredValue::Number(ref num) if num.is_i64() => num.as_i64().unwrap(),
                    _ => todo!(),
                }
            }
            _ => todo!(),
        };
        let result = module_entry
            .call_resumable(&mut self.store, input_value as i32)
            .context("Failed to call entry function")?;

        let result = match result {
            TypedResumableCall::Finished(result) => result,
            TypedResumableCall::Resumable(invocation) => {
                match invocation
                    .host_error()
                    .downcast_ref::<ResumableMarkerTrap>()
                    .context("Resumed with an unknown trap")?
                {
                    ResumableMarkerTrap::Abort(message) => {
                        anyhow::bail!("Wasm aborted: {}", message)
                    }
                }
            }
        };
        println!("core: result: {}", result);

        Ok(StructuredValue::Number(result.into()))
    }
}
