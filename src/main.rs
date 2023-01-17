use std::fmt;

use anyhow::Context;

use wasmi::{
	Engine, Module, Store, Func, Caller, Linker, Extern, TypedResumableCall,
	core::{Trap, HostError, Value}
};

type HostState = ();

#[derive(Debug)]
enum ResumableMarkerTrap {
	TestMeFn(i32)
}
impl fmt::Display for ResumableMarkerTrap {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
			Self::TestMeFn(arg1) => write!(f, "test_me({})", arg1)
		}
    }
}
impl HostError for ResumableMarkerTrap {}

fn main() -> anyhow::Result<()> {
	let file_name = std::env::args().nth(1).context("Required argument missing")?;
	let wasm = std::fs::read(file_name).context("Failed to read input file")?;

	let engine = Engine::default();
	let module = Module::new(&engine, wasm.as_slice()).context("Failed to initializem module")?;

	let mut store = Store::<HostState>::new(&engine, ());
	let mut linker = Linker::<HostState>::new();

	let test_me = Func::wrap(&mut store, |_caller: Caller<'_, HostState>, param: i32| -> Result<i32, Trap> {
		println!("test_me({})", param);
		
		// return Ok(param + 100);
		return Err(
			ResumableMarkerTrap::TestMeFn(param).into()
		);
	});
	linker.define("sf_unstable", "test_me", test_me).context("Failed to define sf_unstable::test_me")?;

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

	
	// let result = module_entry.call(&mut store, 1).context("Failed to call sf_entry")?;
	// println!("Result: {}", result);

	let mut partial = module_entry.call_resumable(&mut store, 42).context("Failed to call sf_entry")?;
	while let TypedResumableCall::Resumable(invocation) = partial {
		let mark = invocation.host_error().downcast_ref::<ResumableMarkerTrap>().context("Resumed with an unknown trap")?;
		
		println!("Partial: {:?}", mark);

		let values = match mark {
			ResumableMarkerTrap::TestMeFn(param) => {
				[Value::I32(param + 100)]
			}
		};

		partial = invocation.resume(&mut store, &values).context("Failed to result sf_entry")?;
	}

	match partial {
		TypedResumableCall::Finished(result) => {
			println!("Result: {}", result);
		}
		_ => unreachable!()
	};

	Ok(())
}
