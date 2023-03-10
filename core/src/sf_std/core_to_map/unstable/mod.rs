use thiserror::Error;

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

use crate::sf_std::{abi::Size, HeadersMultiMap, MultiMap};

#[allow(dead_code)]
pub const MODULE_NAME: &str = "sf_core_unstable";

pub type MapValue = JsonValue;

pub struct HttpRequest<'a> {
    pub method: &'a str,
    pub url: &'a str,
    pub headers: &'a HeadersMultiMap,
    pub query: &'a MultiMap,
    pub body: Option<&'a [u8]>,
}
pub struct HttpResponse {
    pub status: u16,
    pub headers: HeadersMultiMap,
    pub body_stream: usize,
}
#[derive(Debug, Error)]
pub enum HttpCallError {
    // TODO: define more granular categories
    #[error("http call failed: {0}")]
    Failed(String),
}
#[derive(Debug, Error)]
pub enum HttpCallHeadError {
    #[error("Handle does not belong to an active http request")]
    InvalidHandle,
    #[error("Response error: {0}")]
    ResponseError(String),
}

#[derive(Debug, Error)]
pub enum TakeInputError {
    #[error("Input has already been taken")]
    AlreadyTaken,
}
#[derive(Debug, Error)]
pub enum SetOutputError {
    #[error("Output has already been set")]
    AlreadySet,
}

pub trait SfCoreUnstable {
    // env
    fn print(&mut self, message: &str);
    fn abort(&mut self, message: &str, filename: &str, line: usize, column: usize) -> String;

    // streams
    fn stream_read(&mut self, handle: usize, buf: &mut [u8]) -> std::io::Result<usize>;
    fn stream_write(&mut self, handle: usize, buf: &[u8]) -> std::io::Result<usize>;
    fn stream_close(&mut self, handle: usize) -> std::io::Result<()>;

    // http
    fn http_call(&mut self, params: HttpRequest<'_>) -> Result<usize, HttpCallError>;
    fn http_call_head(&mut self, handle: usize) -> Result<HttpResponse, HttpCallHeadError>;

    // input and output
    fn take_input(&mut self) -> Result<MapValue, TakeInputError>;
    fn set_output(&mut self, output: MapValue) -> Result<(), SetOutputError>;
}

//////////////
// MESSAGES //
//////////////

define_exchange_map_to_core! {
    let state: SfCoreUnstable;
    enum RequestUnstable<'a> {
        // http
        HttpCall {
            method: &'a str,
            url: &'a str,
            // TODO: we could optimize this to borrow the strings instead (just like method and url), but it would add complexity
            // for performance which might not be critical
            headers: HeadersMultiMap,
            query: MultiMap,
            body: Option<Vec<u8>>,
        } -> enum Response {
            Ok {
                request_body_stream: Option<()>, // TODO: think about implementation/ergonomics
                handle: Size,
            },
            Err { error: String, }
        } => {
            let handle = state.http_call(HttpRequest {
                method,
                url,
                headers: &headers,
                query: &query,
                body: body.as_deref(),
            });

            match handle {
                Ok(handle) => Response::Ok {
                    request_body_stream: None,
                    handle,
                },
                Err(err) => Response::Err { error: err.to_string() }
            }
        },
        HttpCallHead {
            handle: usize,
        } -> enum Response {
            Ok {
                status: u16,
                headers: HeadersMultiMap,
                body_stream: usize,
            },
            Err { error: String, },
        } => match state.http_call_head(handle) {
            Err(err) => Response::Err { error: err.to_string() },
            Ok(HttpResponse {
                status,
                headers,
                body_stream,
            }) => Response::Ok { status, headers, body_stream, }
        },
        // input and output
        TakeInput -> enum Response {
            Ok { input: JsonValue },
            Err { error: String }
        } => match state.take_input() {
            Err(err) => Response::Err { error: err.to_string() },
            Ok(input) => Response::Ok { input },
        },
        SetOutput { output: JsonValue } -> enum Response {
            Ok,
            Err {
                error: String
            }
        } => match state.set_output(output) {
            Ok(()) => Response::Ok,
            Err(err) =>Response::Err { error: err.to_string() }
        }
    }
}

pub fn handle_message<H: SfCoreUnstable>(state: &mut H, message: &[u8]) -> String {
    RequestUnstable::handle(state, message)
}
