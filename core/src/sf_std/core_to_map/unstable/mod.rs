use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::sf_std::{abi::Size, HeadersMultiMap};

#[allow(dead_code)]
pub const MODULE_NAME: &str = "sf_core_unstable";

pub struct HttpRequest<'a> {
    pub method: &'a str,
    pub url: &'a str,
    pub headers: &'a HeadersMultiMap,
    pub body: Option<&'a [u8]>,
}
pub struct HttpResponse {
    pub status: u16,
    pub headers: HeadersMultiMap,
    pub body_stream: usize,
}

#[derive(Debug, Error)]
pub enum HttpCallHeadError {
    #[error("Handle does not belong to an active http request")]
    InvalidHandle,
    #[error("Response error: {0}")]
    ResponseError(String),
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
        method: &'a str,
        url: &'a str,
        // TODO: we could optimize this to borrow the strings instead (just like method and url), but it would add complexity
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
    // Err {
    //     error: String,
    // },
}

#[derive(Serialize)]
#[serde(tag = "kind")]
#[serde(rename_all = "kebab-case")]
enum OutHttpCallHead {
    Ok {
        status: u16,
        headers: HeadersMultiMap,
        body_stream: usize,
    },
    Err {
        error: String,
    },
}
pub fn handle_message<H: SfCoreUnstable>(state: &mut H, message: &[u8]) -> String {
    match serde_json::from_slice::<MessageUnstable>(message) {
        Err(err) => {
            let error = serde_json::json!({
                "kind": "err",
                "error": format!("Failed to deserialize message: {}", err)
            });
            serde_json::to_string(&error)
        }
        Ok(MessageUnstable::HttpCall {
            method,
            url,
            headers,
            body,
        }) => {
            let handle = state.http_call(HttpRequest {
                method,
                url,
                headers: &headers,
                body: body.as_deref(),
            });
            let out = OutHttpCall::Ok {
                request_body_stream: None,
                handle,
            };
            serde_json::to_string(&out)
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
                }) => OutHttpCallHead::Ok {
                    status,
                    headers,
                    body_stream,
                },
            };
            serde_json::to_string(&out)
        }
    }
    .unwrap()
}
