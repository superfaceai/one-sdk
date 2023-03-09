use anyhow::Context;
use wasmi::{core::Trap, Caller, Extern, Func, Linker, Store};

use super::ResumableMarkerTrap;
use crate::sf_std::{
    abi::{AbiPair, AbiResult, PairRepr, Ptr, ResultRepr, Size},
    core_to_map::unstable::{self, SfCoreUnstable},
};

// TODO: should not be anyhow::Result
// TODO: should be in unstable submodule
pub fn link<H: SfCoreUnstable + 'static>(
    linker: &mut Linker<H>,
    mut store: &mut Store<H>,
) -> anyhow::Result<()> {
    let http_get = Func::wrap(
        &mut store,
        |mut caller: Caller<'_, H>,
         url_ptr: i32,
         url_len: i32,
         headers_ptr: i32,
         headers_len: i32|
         -> i32 {
            let memory = caller
                .get_export("memory")
                .and_then(Extern::into_memory)
                .unwrap();
            let (memory, state) = memory.data_and_store_mut(&mut caller);

            let url = mem_as_str(memory, url_ptr, url_len);

            let mut headers = Vec::<[&str; 2]>::new();
            let headers_str = mem_as_str(memory, headers_ptr, headers_len);
            for pair_str in headers_str.split('\n').filter(|s| !s.is_empty()) {
                let (name, value) = pair_str.split_once(':').unwrap();

                headers.push([name, value]);
            }

            state.http_get(url, headers.as_slice()) as i32
        },
    );
    linker
        .define(unstable::MODULE_NAME, "http_get", http_get)
        .context("Failed to define sf_core_unstable::http_get")?;

    let http_read_response = Func::wrap(
        &mut store,
        |mut caller: Caller<'_, H>, handle: i32, out_ptr: i32, out_len: i32| -> i32 {
            let memory = caller
                .get_export("memory")
                .and_then(Extern::into_memory)
                .unwrap();
            let (memory, state) = memory.data_and_store_mut(&mut caller);

            let handle = handle as u32;
            let out = &mut memory[out_ptr as usize..][..out_len as usize];

            state.http_response_read(handle, out) as i32
        },
    );
    linker
        .define(
            unstable::MODULE_NAME,
            "http_read_response",
            http_read_response,
        )
        .context("Failed to define sf_core_unstable::http_read_response")?;

    linker
        .define(
            unstable::MODULE_NAME,
            "message_exchange",
            Func::wrap(&mut store, __export_message_exchange::<H>),
        )
        .context("Failed to define sf_core_unstable::message_exchange")?;

    linker
        .define(
            unstable::MODULE_NAME,
            "message_exchange_retrieve",
            Func::wrap(&mut store, __export_message_exchange_retrieve::<H>),
        )
        .context("Failed to define sf_core_unstable::message_exchange_retrieve")?;

    linker
        .define(
            unstable::MODULE_NAME,
            "abort",
            Func::wrap(&mut store, __export_abort::<H>),
        )
        .context("Failed to define sf_core_unstable::abort")?;

    linker
        .define(
            unstable::MODULE_NAME,
            "print",
            Func::wrap(&mut store, __export_print::<H>),
        )
        .context("Failed to define sf_core_unstable::print")?;

    Ok(())
}

// Because it is prone to bugs, Wasmi does not implement trait `WasmType` for `usize` - which is the backing type of our `Ptr` and `Size`.
//
// We however do want to tie them together. We are assuming the core runs in WASM and that if it is wasm64 so is wasmi.
// If this assumption changes later we need to figure out where to split the definitions.
#[cfg(target_pointer_width = "32")]
type PtrWasmi = u32;
#[cfg(target_pointer_width = "64")]
type PtrWasmi = u64;

#[cfg(target_pointer_width = "32")]
type SizeWasmi = u32;
#[cfg(target_pointer_width = "64")]
type SizeWasmi = u64;

fn mem_as_str(memory: &[u8], ptr: i32, len: i32) -> &str {
    // TODO: error handling
    std::str::from_utf8(&memory[ptr as usize..][..len as usize]).unwrap()
}

fn __export_message_exchange<H: SfCoreUnstable + 'static>(
    mut caller: Caller<'_, H>,
    msg_ptr: PtrWasmi,
    msg_len: SizeWasmi,
    out_ptr: PtrWasmi,
    out_len: SizeWasmi,
) -> Result<PairRepr, Trap> {
    let msg_ptr = msg_ptr as Ptr;
    let msg_len = msg_len as Size;
    let out_ptr = out_ptr as Ptr;
    let out_len = out_len as Size;

    let memory = caller
        .get_export("memory")
        .and_then(Extern::into_memory)
        .unwrap();
    let (memory, state) = memory.data_and_store_mut(&mut caller);

    let response = unstable::handle_message(state, &memory[msg_ptr..][..msg_len]);
    let response_len = response.len();

    let response_handle = if response_len <= out_len {
        let written = response_len.min(out_len);
        memory[out_ptr..][..written].copy_from_slice(&response);

        0
    } else {
        state.store_message(response)
    };

    Ok(AbiPair(response_len, response_handle).into())
}

fn __export_message_exchange_retrieve<H: SfCoreUnstable + 'static>(
    mut caller: Caller<'_, H>,
    handle: SizeWasmi,
    out_ptr: PtrWasmi,
    out_len: SizeWasmi,
) -> ResultRepr {
    let handle = handle as Size;
    let out_ptr = out_ptr as Ptr;
    let out_len = out_len as Size;

    let memory = caller
        .get_export("memory")
        .and_then(Extern::into_memory)
        .unwrap();
    let (memory, state) = memory.data_and_store_mut(&mut caller);

    match state.retrieve_message(handle) {
        None => AbiResult::Err(1), // TODO: wasi errno
        Some(response) => {
            let response_len = response.len();

            if response_len <= out_len {
                let written = response_len.min(out_len);
                memory[out_ptr..][..written].copy_from_slice(&response);

                AbiResult::Ok(written)
            } else {
                // TODO: this drops the message and thus it won't be retrievable anymore - what do?
                //  although this error should never happen with a comforming guest
                // TODO: wasi errno
                AbiResult::Err(2)
            }
        }
    }
    .into()
}

fn __export_abort<H: SfCoreUnstable + 'static>(
    mut caller: Caller<'_, H>,
    msg_ptr: PtrWasmi,
    msg_len: SizeWasmi,
    filename_ptr: PtrWasmi,
    filename_len: SizeWasmi,
    line: SizeWasmi,
    column: SizeWasmi,
) -> Result<(), Trap> {
    let msg_ptr = msg_ptr as Ptr;
    let msg_len = msg_len as Size;
    let filename_ptr = filename_ptr as Ptr;
    let filename_len = filename_len as Size;
    let line = line as Size;
    let column = column as Size;

    let memory = caller
        .get_export("memory")
        .and_then(Extern::into_memory)
        .unwrap();
    let (memory, state) = memory.data_and_store_mut(&mut caller);

    let message = std::str::from_utf8(&memory[msg_ptr..][..msg_len])
        .map_err(|err| Trap::new(format!("Failed to decode abort message: {}", err)))?;
    let filename = std::str::from_utf8(&memory[filename_ptr..][..filename_len])
        .map_err(|err| Trap::new(format!("Failed to decode abort filename: {}", err)))?;

    Err(ResumableMarkerTrap::Abort(state.abort(message, filename, line, column)).into())
}

fn __export_print<H: SfCoreUnstable + 'static>(
    mut caller: Caller<'_, H>,
    msg_ptr: PtrWasmi,
    msg_len: SizeWasmi,
) -> Result<(), Trap> {
    let msg_ptr = msg_ptr as Ptr;
    let msg_len = msg_len as Size;

    let memory = caller
        .get_export("memory")
        .and_then(Extern::into_memory)
        .unwrap();
    let (memory, state) = memory.data_and_store_mut(&mut caller);

    let message = std::str::from_utf8(&memory[msg_ptr..][..msg_len])
        .map_err(|err| Trap::new(format!("Failed to decode print message: {}", err)))?;
    state.print(message);

    Ok(())
}
