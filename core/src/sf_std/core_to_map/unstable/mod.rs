use anyhow::Context;
use wasmi::{core::Trap, Caller, Extern, Func, Linker, Store};

use crate::sf_std::abi::{AbiPair, AbiResult, PairRepr, Ptr, ResultRepr, Size};

use super::{mem_as_str, PtrWasmi, SizeWasmi};

const MODULE_NAME: &str = "sf_core_unstable";

pub type HttpHandle = u32;
pub trait SfCoreUnstable {
    fn test_me(&mut self, value: i32) -> Result<i32, Trap>;

    fn abort(&mut self) -> Result<(), Trap>;
    fn http_get(&mut self, url: &str, headers: &[[&str; 2]]) -> HttpHandle;
    // fn http_response_headers(&mut self, handle: HttpHandle, ) TODO
    fn http_response_read(&mut self, handle: HttpHandle, out: &mut [u8]) -> usize;

    fn handle_message(&mut self, message: &[u8]) -> Vec<u8>;
    fn store_message(&mut self, message: Vec<u8>) -> usize;
    fn retrieve_message(&mut self, id: usize) -> Option<Vec<u8>>;
}

// TODO: should not be anyhow::Result
pub fn link<H: SfCoreUnstable + 'static>(
    linker: &mut Linker<H>,
    mut store: &mut Store<H>,
) -> anyhow::Result<()> {
    let abort = Func::wrap(
        &mut store,
        |mut caller: Caller<'_, H>| -> Result<(), Trap> { caller.data_mut().abort() },
    );
    // TODO: maybe should be in env::abort?
    linker
        .define(MODULE_NAME, "abort", abort)
        .context("Failed to define sf_core_unstable::abort")?;

    let test_me = Func::wrap(
        &mut store,
        |mut caller: Caller<'_, H>, param: i32| -> Result<i32, Trap> {
            caller.data_mut().test_me(param)
        },
    );
    linker
        .define(MODULE_NAME, "test_me", test_me)
        .context("Failed to define sf_core_unstable::test_me")?;

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
        .define(MODULE_NAME, "http_get", http_get)
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
        .define(MODULE_NAME, "http_read_response", http_read_response)
        .context("Failed to define sf_core_unstable::http_read_response")?;

    linker
        .define(
            MODULE_NAME,
            "message_exchange",
            Func::wrap(&mut store, __export_message_exchange::<H>),
        )
        .context("Failed to define sf_core_unstable::message_exchange")?;

    linker
        .define(
            MODULE_NAME,
            "message_exchange_retrieve",
            Func::wrap(&mut store, __export_message_exchange_retrieve::<H>),
        )
        .context("Failed to define sf_core_unstable::message_exchange_retrieve")?;

    linker
        .define(
            MODULE_NAME,
            "print",
            Func::wrap(&mut store, __export_print::<H>),
        )
        .context("Failed to define sf_core_unstable::print")?;

    Ok(())
}

fn __export_message_exchange<H: SfCoreUnstable + 'static>(
    mut caller: Caller<'_, H>,
    msg_ptr: PtrWasmi,
    msg_len: SizeWasmi,
    out_ptr: PtrWasmi,
    out_len: SizeWasmi,
) -> PairRepr {
    let msg_ptr = msg_ptr as Ptr;
    let msg_len = msg_len as Size;
    let out_ptr = out_ptr as Ptr;
    let out_len = out_len as Size;

    let memory = caller
        .get_export("memory")
        .and_then(Extern::into_memory)
        .unwrap();
    let (memory, state) = memory.data_and_store_mut(&mut caller);

    let msg_bytes = &memory[msg_ptr..][..msg_len];
    let response = state.handle_message(msg_bytes);
    let response_len = response.len();

    let response_handle = if response_len <= out_len {
        let written = response_len.min(out_len);
        memory[out_ptr..][..written].copy_from_slice(&response);

        0
    } else {
        state.store_message(response)
    };

    AbiPair(response_len, response_handle).into()
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

fn __export_print<H: SfCoreUnstable + 'static>(
    mut caller: Caller<'_, H>,
    msg_ptr: PtrWasmi,
    msg_len: SizeWasmi,
) {
    let msg_ptr = msg_ptr as Ptr;
    let msg_len = msg_len as Size;

    let memory = caller
        .get_export("memory")
        .and_then(Extern::into_memory)
        .unwrap();
    let memory = memory.data(&mut caller);

    let msg_bytes = &memory[msg_ptr..][..msg_len];
    match std::str::from_utf8(msg_bytes) {
        Ok(message) => println!("{}", message),
        Err(err) => println!("Failed to print from map: {}", err),
    }
}
