use std::{collections::HashMap, fmt, io::Read};

use anyhow::Context;

use wasmi::{
    core::{HostError, Trap},
    Engine, Extern, Linker, Module, Store, TypedResumableCall,
};

use crate::sf_std::core_to_map::unstable as ctm_unstable;
use crate::sf_std::host_to_core::unstable::{http::HttpRequest, perform::StructuredValue};

struct InterpreterState {
    http_next_id: usize,
    http_requests: HashMap<usize, HttpRequest>,
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

        id as _
    }

    fn http_response_read(&mut self, handle: ctm_unstable::HttpHandle, out: &mut [u8]) -> usize {
        eprintln!("core: http_response_read({}, u8[{}])", handle, out.len());

        let response = self
            .http_requests
            .get_mut(&(handle as _))
            .unwrap()
            .response()
            .unwrap();

        let count = response.body().read(out).unwrap();

        if count == 0 {
            // TODO: where to clean up the request?
            self.http_requests.remove(&(handle as _));
        }

        return count;
    }

    fn store_message(&mut self, _message: Vec<u8>) -> usize {
        // TODO: implement
        0
    }

    fn retrieve_message(&mut self, _id: usize) -> Option<Vec<u8>> {
        // TODO: implement
        None
    }

    fn abort(
        &mut self,
        message: &str,
        filename: &str,
        line: usize,
        column: usize,
    ) -> Result<(), Trap> {
        Err(ResumableMarkerTrap::Abort(format!(
            "{} in ({}:{}:{})",
            message, filename, line, column
        ))
        .into())
    }

    fn print(&mut self, message: &str) -> Result<(), Trap> {
        println!("map: {}", message);

        Ok(())
    }

    fn http_call(&mut self, params: ctm_unstable::HttpRequest<'_>) -> usize {
        let request = HttpRequest::fire(params.method, params.url, params.headers, params.body).unwrap();
        
        let id = self.http_next_id;
        self.http_next_id += 1;
        self.http_requests.insert(id, request);

        id
    }

    fn http_call_head(&mut self, handle: usize) -> Result<ctm_unstable::HttpResponse, ctm_unstable::HttpCallHeadError> {
        match self.http_requests.remove(&handle) {
            None => Err(ctm_unstable::HttpCallHeadError::InvalidHandle),
            Some(mut request) => match request.response() {
                Err(err) => Err(ctm_unstable::HttpCallHeadError::ResponseError(err)),
                Ok(response) => Ok(ctm_unstable::HttpResponse {
                    status: response.status(),
                    headers: response.headers().clone(),
                    body_stream: ()
                })
            }
        }
    }
}

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

        ctm_unstable::link(&mut linker, &mut store).context("Failed to export sf_unstable")?;

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
