use std::{collections::HashMap, fmt, io::Read};

use anyhow::Context;

use wasmi::{
    core::{HostError, Trap},
    Engine, Extern, Linker, Module, Store,
};

use crate::sf_std::core_to_map::unstable as ctm_unstable;
use crate::sf_std::host_to_core::unstable::{http::HttpRequest, perform::StructuredValue};

struct InterpreterState {
    http_next_id: u32,
    http_requests: HashMap<ctm_unstable::HttpHandle, HttpRequest>,
}
impl InterpreterState {
    pub fn new() -> Self {
        Self {
            http_next_id: 1,
            http_requests: HashMap::new(),
        }
    }
}
impl ctm_unstable::SfCoreUnstable for InterpreterState {
    fn test_me(&mut self, value: i32) -> Result<i32, Trap> {
        eprintln!("core: test_me({})", value);

        return Err(ResumableMarkerTrap::TestMeFn(value).into());
    }

    fn abort(&mut self) -> Result<(), Trap> {
        eprintln!("core: abort()");

        return Err(ResumableMarkerTrap::Abort.into());
    }

    fn http_get(&mut self, url: &str, headers: &[[&str; 2]]) -> ctm_unstable::HttpHandle {
        eprintln!("core: http_get({}, {:?})", url, headers);

        let headers_map = {
            let mut headers_map = HashMap::<String, Vec<String>>::new();

            for &[key, value] in headers {
                headers_map
                    .entry(key.to_string())
                    .or_default()
                    .push(value.to_string());
            }

            headers_map
        };
        let request = HttpRequest::fire("GET", url, &headers_map, None).unwrap();

        let id = self.http_next_id;
        self.http_next_id += 1;

        self.http_requests.insert(id, request);

        id
    }

    fn http_response_read(&mut self, handle: ctm_unstable::HttpHandle, out: &mut [u8]) -> usize {
        eprintln!("core: http_response_read({}, u8[{}])", handle, out.len());

        let response = self
            .http_requests
            .get_mut(&handle)
            .unwrap()
            .response()
            .unwrap();

        let count = response.body().read(out).unwrap();

        if count == 0 {
            // TODO: where to clean up the request?
            self.http_requests.remove(&handle);
        }

        return count;
    }
}

#[derive(Debug)]
enum ResumableMarkerTrap {
    Abort,
    TestMeFn(i32),
}
impl fmt::Display for ResumableMarkerTrap {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Abort => write!(f, "abort"),
            Self::TestMeFn(arg1) => write!(f, "test_me({})", arg1),
        }
    }
}
impl HostError for ResumableMarkerTrap {}

pub struct Interpreter {
    engine: Engine,
    store: Store<InterpreterState>,
    linker: Linker<InterpreterState>,
}
impl Interpreter {
    // TODO: Use thiserror and define specific errors
    pub fn new() -> anyhow::Result<Self> {
        let engine = Engine::default();
        let mut store = Store::<InterpreterState>::new(&engine, InterpreterState::new());
        let mut linker = Linker::<InterpreterState>::new();

        ctm_unstable::link_to(&mut linker, &mut store).context("Failed to export sf_unstable")?;

        Ok(Self {
            engine,
            store,
            linker,
        })
    }

    pub fn run(
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

        let module_entry = instance
            .get_export(&self.store, entry)
            .and_then(Extern::into_func)
            .context("No or invalid map entry symbol")
            .and_then(|f| {
                // TODO: decide on core_to_map ABI
                f.typed::<i32, i32>(&self.store)
                    .context("Incorrectly typed entry symbol")
            })?;

        // here we can `call_resumable` instead
        /*
        let mut partial = entry
        .call_resumable(&mut store, input)
        .context("Failed to call sf_entry")?;

        while let TypedResumableCall::Resumable(invocation) = partial {
            let mark = invocation
                .host_error()
                .downcast_ref::<ResumableMarkerTrap>()
                .context("Resumed with an unknown trap")?;

            eprintln!("core: partial: {:?}", mark);

            partial = match mark {
                ResumableMarkerTrap::Abort => {
                    anyhow::bail!("Wasm aborted");
                }
                ResumableMarkerTrap::TestMeFn(param) => {
                    let values = [Value::I32(param - 1)];
                    invocation.resume(&mut store, &values)
                }
            }
            .context("Failed to result sf_entry")?;
        }

        match partial {
            TypedResumableCall::Finished(result) => {
                println!("core: result: {}", result);
            }
            _ => unreachable!(),
        };
        */

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
            .call(&mut self.store, input_value as i32)
            .context("Failed to call entry function")?;
        println!("core: result: {}", result);

        Ok(StructuredValue::Number(result.into()))
    }
}
