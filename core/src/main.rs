use std::{fmt, collections::HashMap, io::Read};

use anyhow::Context;

use wasmi::{
	Engine, Module, Store, Func, Caller, Linker, Extern, TypedResumableCall,
	core::{Trap, HostError, Value}, TypedFunc, Instance
};

struct HostState {
	http_next_id: u32,
	http_requests: HashMap<u32, reqwest::blocking::Response>
}
impl HostState {
	pub fn new() -> Self {
		Self {
			http_next_id: 1,
			http_requests: HashMap::new()
		}
	}

	pub fn start_request(&mut self, url: &str) -> u32 {
		let id = self.http_next_id;
		self.http_next_id += 1;

		self.http_requests.insert(id, reqwest::blocking::get(url).unwrap());
		
		id
	}
}

#[derive(Debug)]
enum ResumableMarkerTrap {
	Abort,
	TestMeFn(i32)
}
impl fmt::Display for ResumableMarkerTrap {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		match self {
			Self::Abort => write!(f, "abort"),
			Self::TestMeFn(arg1) => write!(f, "test_me({})", arg1)
		}
	}
}
impl HostError for ResumableMarkerTrap {}

fn define_exports(
	mut store: &mut Store<HostState>,
	linker: &mut Linker<HostState>
) -> anyhow::Result<()> {
	let abort = Func::wrap(&mut store, |_caller: Caller<'_, HostState>| -> Result<(), Trap> {
		return Err(
			ResumableMarkerTrap::Abort.into()
		);
	});
	// TODO: maybe should be in env::abort?
	linker.define("sf_unstable", "abort", abort).context("Failed to define sf_unstable::abort")?;

	let test_me = Func::wrap(&mut store, |_caller: Caller<'_, HostState>, param: i32| -> Result<i32, Trap> {
		eprintln!("test_me({})", param);

		return Err(
			ResumableMarkerTrap::TestMeFn(param).into()
		);
	});
	linker.define("sf_unstable", "test_me", test_me).context("Failed to define sf_unstable::test_me")?;

	let http_get = Func::wrap(&mut store, |mut caller: Caller<'_, HostState>, url_buf: i32, url_len: i32| -> i32 {
		let memory = caller.get_export("memory").and_then(Extern::into_memory).unwrap();
		let (memory, state) = memory.data_and_store_mut(&mut caller);

		let url = std::str::from_utf8(&memory[url_buf as usize..][..url_len as usize]).unwrap(); // TODO: error handling
		let http_id = state.start_request(url);
		eprintln!("http_get({}) = {}", url, http_id);

		return http_id as i32;
	});
	linker.define("sf_unstable", "http_get", http_get).context("Failed to define sf_unstable::http_get")?;

	let http_read_response = Func::wrap(&mut store, |mut caller: Caller<'_, HostState>, handle: i32, buf: i32, len: i32| -> i32 {
		let memory = caller.get_export("memory").and_then(Extern::into_memory).unwrap();
		let (memory, state) = memory.data_and_store_mut(&mut caller);

		let request = state.http_requests.get_mut(&(handle as u32)).unwrap();
		let buffer = &mut memory[buf as usize..][..len as usize];
		
		let read_count = request.read(buffer).unwrap();
		eprintln!("http_read_response({}, {}+{}) = {}", handle, buf, len, read_count);
		
		return read_count as i32;
	});
	linker.define("sf_unstable", "http_read_response", http_read_response).context("Failed to define sf_unstable::http_read_response")?;

	Ok(())
}

fn run(
	_instance: &Instance, // for access to memory from resumable functions
	mut store: &mut Store<HostState>,
	entry: TypedFunc<i32, i32>
) -> anyhow::Result<()> {
	let mut partial = entry.call_resumable(&mut store, 42).context("Failed to call sf_entry")?;

	while let TypedResumableCall::Resumable(invocation) = partial {
		let mark = invocation.host_error().downcast_ref::<ResumableMarkerTrap>().context("Resumed with an unknown trap")?;
		
		eprintln!("Partial: {:?}", mark);

		partial = match mark {
			ResumableMarkerTrap::Abort => {
				anyhow::bail!("Wasm aborted");
			}
			ResumableMarkerTrap::TestMeFn(param) => {
				let values = [Value::I32(param + 100)];
				invocation.resume(&mut store, &values)
			}
		}.context("Failed to result sf_entry")?;
	}

	match partial {
		TypedResumableCall::Finished(result) => {
			println!("Result: {}", result);
		}
		_ => unreachable!()
	};

	Ok(())
}

fn main() -> anyhow::Result<()> {
	let file_name = std::env::args().nth(1).context("Required argument missing")?;
	let wasm = std::fs::read(file_name).context("Failed to read input file")?;

	let engine = Engine::default();
	let module = Module::new(&engine, wasm.as_slice()).context("Failed to initializem module")?;

	let mut store = Store::<HostState>::new(&engine, HostState::new());
	let mut linker = Linker::<HostState>::new();

	define_exports(&mut store, &mut linker)?;

	// instance links store and module
	let instance = linker.instantiate(&mut store, &module).context("Failed to instantiate module")?;
	// instance may or may not have a "start" function to initialize globals (?)
	let instance = instance.start(&mut store).context("Failed to run start function")?;

	let module_entry = instance
		.get_export(&store, "sf_entry")
		.and_then(Extern::into_func)
		.context("No or invalid sf_entry symbol")
		.and_then(
			|f| f.typed::<i32, i32>(&store).context("Incorrectly typed sf_entry")
		)
	?;

	run(&instance, &mut store, module_entry)?;

	Ok(())
}
