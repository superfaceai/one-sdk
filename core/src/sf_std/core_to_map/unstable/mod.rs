use anyhow::Context;
use wasmi::{core::Trap, Caller, Extern, Func, Linker, Store};

use thiserror::Error;
use serde::{Deserialize, Serialize};

use crate::sf_std::{abi::{AbiPair, AbiResult, PairRepr, Ptr, ResultRepr, Size}, HeadersMultiMap};
use super::{mem_as_str, PtrWasmi, SizeWasmi};

const MODULE_NAME: &str = "sf_core_unstable";

pub type HttpHandle = u32;
pub struct HttpRequest<'a> {
    pub url: &'a str,
    pub method: &'a str,
    pub headers: &'a HeadersMultiMap,
    pub body: Option<&'a [u8]>
}
pub struct HttpResponse {
    pub status: u16,
    pub headers: HeadersMultiMap,
    pub body_stream: ()
}

#[derive(Debug, Error)]
pub enum HttpCallHeadError {
    #[error("Handle does not belong to an active http request")]
    InvalidHandle,
    #[error("Response error: {0}")]
    ResponseError(String)
}

pub trait SfCoreUnstable {
    fn http_get(&mut self, url: &str, headers: &[[&str; 2]]) -> HttpHandle;
    fn http_response_read(&mut self, handle: HttpHandle, out: &mut [u8]) -> usize;

    // messaging - internal
    fn store_message(&mut self, message: Vec<u8>) -> usize;
    fn retrieve_message(&mut self, id: usize) -> Option<Vec<u8>>;

    // env
    fn print(&mut self, message: &str) -> Result<(), Trap>;
    fn abort(
        &mut self,
        message: &str,
        filename: &str,
        line: usize,
        column: usize,
    ) -> Result<(), Trap>;

    // http
    fn http_call(&mut self, params: HttpRequest<'_>) -> usize;
    fn http_call_head(&mut self, handle: usize) -> Result<HttpResponse, HttpCallHeadError>;
}

// TODO: should not be anyhow::Result
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
            "abort",
            Func::wrap(&mut store, __export_abort::<H>),
        )
        .context("Failed to define sf_core_unstable::abort")?;

    linker
        .define(
            MODULE_NAME,
            "print",
            Func::wrap(&mut store, __export_print::<H>),
        )
        .context("Failed to define sf_core_unstable::print")?;

    Ok(())
}

//////////////
// MESSAGES //
//////////////
#[derive(Deserialize)]
#[serde(tag = "kind")]
#[serde(rename_all = "kebab-case")]
enum MessageUnstable<'a> {
    HttpCall {
        url: &'a str,
        method: &'a str,
        // TODO: we could optimize this to borrow the data instead, but it would add complexity
        // for performance which might not be critical
        headers: HeadersMultiMap,
        body: Option<Vec<u8>>
    },
    HttpCallHead {
        handle: usize
    }
}

#[derive(Serialize)]
#[serde(tag = "kind")]
#[serde(rename_all = "kebab-case")]
enum OutHttpCall {
    Ok {
        request_body_stream: Option<()>, // TODO: streams
        handle: Size
    },
    Err {
        error: String
    }
}

#[derive(Serialize)]
#[serde(tag = "kind")]
#[serde(rename_all = "kebab-case")]
enum OutHttpCallHead {
    Ok {
        status: u16,
        headers: HeadersMultiMap
    },
    Err {
        error: String
    }
}
fn handle_message<H: SfCoreUnstable>(state: &mut H, message: &[u8]) -> Vec<u8> {
    match serde_json::from_slice::<MessageUnstable>(message) {
        Err(err) => {
            let error = serde_json::json!({
                "kind": "err",
                "error": format!("Failed to deserialize message: {}", err)
            });
            serde_json::to_vec(&error)
        }
        Ok(MessageUnstable::HttpCall { url, method, headers, body }) => {
            let handle = state.http_call(HttpRequest { url, method, headers: &headers, body: body.as_deref() });
            let out = OutHttpCall::Ok { request_body_stream: None, handle };
            serde_json::to_vec(&out)
        }
        Ok(MessageUnstable::HttpCallHead { handle }) => {
            let out = match state.http_call_head(handle) {
                Err(err) => OutHttpCallHead::Err { error: format!("{}", err) },
                Ok(HttpResponse { status, headers, body_stream }) => OutHttpCallHead::Ok {
                    status, headers
                }
            };
            serde_json::to_vec(&out)
        }
    }.unwrap()
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

    let response = handle_message(state, &memory[msg_ptr..][..msg_len]);
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

    state.abort(message, filename, line, column)
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
    state.print(message)
}
