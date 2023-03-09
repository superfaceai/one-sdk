use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::sf_std::{abi::Size, HeadersMultiMap};

pub const MODULE_NAME: &str = "sf_core_unstable";

pub type HttpHandle = u32;
pub struct HttpRequest<'a> {
    pub url: &'a str,
    pub method: &'a str,
    pub headers: &'a HeadersMultiMap,
    pub body: Option<&'a [u8]>,
}
pub struct HttpResponse {
    pub status: u16,
    pub headers: HeadersMultiMap,
    pub body_stream: (),
}

#[derive(Debug, Error)]
pub enum HttpCallHeadError {
    #[error("Handle does not belong to an active http request")]
    InvalidHandle,
    #[error("Response error: {0}")]
    ResponseError(String),
}

pub trait SfCoreUnstable {
    // old prototype
    fn http_get(&mut self, url: &str, headers: &[[&str; 2]]) -> HttpHandle;
    fn http_response_read(&mut self, handle: HttpHandle, out: &mut [u8]) -> usize;

    // messaging - internal
    fn store_message(&mut self, message: Vec<u8>) -> usize;
    fn retrieve_message(&mut self, id: usize) -> Option<Vec<u8>>;

    // env
    fn print(&mut self, message: &str);
    fn abort(&mut self, message: &str, filename: &str, line: usize, column: usize) -> String;

    // http
    fn http_call(&mut self, params: HttpRequest<'_>) -> usize;
    fn http_call_head(&mut self, handle: usize) -> Result<HttpResponse, HttpCallHeadError>;
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
        body: Option<Vec<u8>>,
    },
    HttpCallHead {
        handle: usize,
    },
}

#[derive(Serialize)]
#[serde(tag = "kind")]
#[serde(rename_all = "kebab-case")]
enum OutHttpCall {
    Ok {
        request_body_stream: Option<()>, // TODO: streams
        handle: Size,
    },
    Err {
        error: String,
    },
}

#[derive(Serialize)]
#[serde(tag = "kind")]
#[serde(rename_all = "kebab-case")]
enum OutHttpCallHead {
    Ok {
        status: u16,
        headers: HeadersMultiMap,
    },
    Err {
        error: String,
    },
}
pub fn handle_message<H: SfCoreUnstable>(state: &mut H, message: &[u8]) -> Vec<u8> {
    match serde_json::from_slice::<MessageUnstable>(message) {
        Err(err) => {
            let error = serde_json::json!({
                "kind": "err",
                "error": format!("Failed to deserialize message: {}", err)
            });
            serde_json::to_vec(&error)
        }
        Ok(MessageUnstable::HttpCall {
            url,
            method,
            headers,
            body,
        }) => {
            let handle = state.http_call(HttpRequest {
                url,
                method,
                headers: &headers,
                body: body.as_deref(),
            });
            let out = OutHttpCall::Ok {
                request_body_stream: None,
                handle,
            };
            serde_json::to_vec(&out)
        }
        Ok(MessageUnstable::HttpCallHead { handle }) => {
            let out = match state.http_call_head(handle) {
                Err(err) => OutHttpCallHead::Err {
                    error: format!("{}", err),
                },
                Ok(HttpResponse {
                    status,
                    headers,
                    body_stream,
                }) => OutHttpCallHead::Ok { status, headers },
            };
            serde_json::to_vec(&out)
        }
    }
    .unwrap()
}
