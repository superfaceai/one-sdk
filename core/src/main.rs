use std::{
    collections::{hash_map, HashMap},
    fmt,
};

use anyhow::Context;

use wasmi::{
    core::{HostError, Trap},
    Engine, Extern, Instance, Linker, Module, Store, TypedFunc, TypedResumableCall, Value,
};

mod sf_abi;
mod sf_core;
mod sf_host;

struct HostState {
    http_next_id: u32,
    http_requests: HashMap<sf_core::unstable::HttpHandle, sf_host::unstable::HttpHandle>,
}
impl HostState {
    pub fn new() -> Self {
        Self {
            http_next_id: 1,
            http_requests: HashMap::new(),
        }
    }
}
impl sf_core::unstable::SfCoreUnstable for HostState {
    fn test_me(&mut self, value: i32) -> Result<i32, Trap> {
        eprintln!("core: test_me({})", value);

        return Err(ResumableMarkerTrap::TestMeFn(value).into());
    }

    fn abort(&mut self) -> Result<(), Trap> {
        eprintln!("core: abort()");

        return Err(ResumableMarkerTrap::Abort.into());
    }

    fn http_get(&mut self, url: &str, headers: &[[&str; 2]]) -> sf_core::unstable::HttpHandle {
        {
            let headers = {
                let mut headers = HashMap::new();

                headers.insert("foo".to_string(), vec!["a".to_string()]);
                headers.insert(
                    "bar".to_string(),
                    vec!["123".to_string(), "seven".to_string()],
                );

                headers
            };
            let handle = sf_host::unstable::http_call("https://example.com", "GET", &headers);
            eprintln!("core: http_call() = {}", handle);
        }

        eprintln!("core: http_get({}, {:?})", url, headers);

        let id = self.http_next_id;
        self.http_next_id += 1;

        self.http_requests
            .insert(id, sf_host::unstable::http_get(url, headers));

        id
    }

    fn http_response_read(
        &mut self,
        handle: sf_core::unstable::HttpHandle,
        out: &mut [u8],
    ) -> usize {
        eprintln!("core: http_response_read({}, u8[{}])", handle, out.len());

        let handle = self.http_requests.get(&handle).unwrap();

        sf_host::unstable::http_response_read(*handle, out)
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

fn run(
    _instance: &Instance, // for access to memory from resumable functions
    mut store: &mut Store<HostState>,
    entry: TypedFunc<i32, i32>,
    input: i32,
) -> anyhow::Result<()> {
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

    Ok(())
}

fn main() -> anyhow::Result<()> {
    let mut args = std::env::args();

    let file_name = args.next().context("Required argument 1 missing")?;
    let input_arg: i32 = args
        .next()
        .context("Required argument 2 missing")?
        .parse()
        .context("Argument 2 must be a number")?;

    let wasm = std::fs::read(file_name).context("Failed to read input file")?;

    let engine = Engine::default();
    let module = Module::new(&engine, wasm.as_slice()).context("Failed to initializem module")?;

    let mut store = Store::<HostState>::new(&engine, HostState::new());
    let mut linker = Linker::<HostState>::new();

    sf_core::unstable::link_to(&mut linker, &mut store).context("Failed to export sf_unstable")?;

    // instance links store and module
    let instance = linker
        .instantiate(&mut store, &module)
        .context("Failed to instantiate module")?;
    // instance may or may not have a "start" function to initialize globals (?)
    let instance = instance
        .start(&mut store)
        .context("Failed to run start function")?;

    let module_entry = instance
        .get_export(&store, "sf_entry")
        .and_then(Extern::into_func)
        .context("No or invalid sf_entry symbol")
        .and_then(|f| {
            f.typed::<i32, i32>(&store)
                .context("Incorrectly typed sf_entry")
        })?;

    run(&instance, &mut store, module_entry, input_arg)?;

    Ok(())
}
