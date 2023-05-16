use std::io::Read;

use serde::{Deserialize, Serialize};
use thiserror::Error;
use url::Url;

use super::{ErrorCode, IoStream, MessageExchange, EXCHANGE_MESSAGE};
use crate::{abi::Handle, lowercase_headers_multimap, HeadersMultiMap, MultiMap};

define_exchange_core_to_host! {
    struct HttpCallRequest<'a> {
        kind: "http-call",
        /// HTTP method - will be used as-is.
        method: &'a str,
        url: &'a str,
        /// Headers.
        ///
        /// Multiple values for one key will not be joined.
        headers: &'a HeadersMultiMap,
        /// Body bytes to be sent.
        body: Option<&'a [u8]>
    } -> enum HttpCallResponse {
        Ok {
            #[serde(default)]
            request_body_stream: Option<IoStream>,
            handle: Handle,
        },
        Err {
            error_code: ErrorCode,
            message: String,
        }
    }
}
define_exchange_core_to_host! {
    struct HttpCallHeadRequest {
        kind: "http-call-head",
        /// Handle previously returned by `http-call`.
        handle: Handle
    } -> enum HttpCallHeadResponse {
        Ok {
            status: u16,
            headers: HeadersMultiMap,
            body_stream: IoStream, // TODO: optional? in case response doesn't have a body
        },
        Err {
            error_code: ErrorCode,
            message: String,
        }
    }
}

#[derive(Debug, Error)]
pub enum HttpCallError {
    #[error("Invalid fetch url: {0}")]
    InvalidUrl(String),
    #[error("Unknown http error: {0}")]
    Unknown(String), // TODO: more granular
}
pub struct HttpRequest {
    handle: Handle,
}
impl HttpRequest {
    pub fn fetch(
        method: &str,
        url: &str,
        headers: &HeadersMultiMap,
        query: &MultiMap,
        body: Option<&[u8]>,
    ) -> Result<Self, HttpCallError> {
        let mut url = Url::parse(url).map_err(|err| HttpCallError::InvalidUrl(err.to_string()))?;
        // merge query params already in the URL with the params passed in query
        // TODO: or we can assert here that the url doesn't contain any params -
        url.query_pairs_mut().extend_pairs(
            query
                .iter()
                .flat_map(|(key, values)| values.iter().map(move |value| (key, value))),
        );

        let response = HttpCallRequest {
            kind: HttpCallRequest::KIND,
            url: url.as_str(),
            method,
            headers,
            body,
        }
        .send_json(&EXCHANGE_MESSAGE)
        .unwrap();

        match response {
            HttpCallResponse::Ok {
                request_body_stream,
                handle,
            } => {
                assert!(request_body_stream.is_none());
                Ok(Self { handle })
            }
            HttpCallResponse::Err {
                error_code,
                message,
            } => Err(Self::response_error_to_http_call_error(error_code, message)),
        }
    }

    pub fn into_response(self) -> Result<HttpResponse, HttpCallError> {
        let exchange_response = HttpCallHeadRequest::new(self.handle)
            .send_json(&EXCHANGE_MESSAGE)
            .unwrap();

        match exchange_response {
            HttpCallHeadResponse::Ok {
                status,
                headers,
                body_stream,
            } => Ok(HttpResponse {
                status,
                headers: lowercase_headers_multimap(headers),
                body: body_stream,
            }),
            HttpCallHeadResponse::Err {
                error_code,
                message,
            } => Err(Self::response_error_to_http_call_error(error_code, message)),
        }
    }

    fn response_error_to_http_call_error(error_code: ErrorCode, message: String) -> HttpCallError {
        match error_code {
            ErrorCode::NetworkInvalidUrl => HttpCallError::InvalidUrl(message),
            _ => HttpCallError::Unknown(format!("{:?}: {}", error_code, message)),
        }
    }
}

pub struct HttpResponse {
    status: u16,
    headers: HeadersMultiMap,
    body: IoStream,
}
impl HttpResponse {
    pub fn status(&self) -> u16 {
        self.status
    }

    pub fn headers(&self) -> &HeadersMultiMap {
        &self.headers
    }

    #[allow(dead_code)]
    pub fn body(&mut self) -> impl Read + '_ {
        &mut self.body
    }

    // like <https://docs.rs/hyper/latest/hyper/struct.Response.html#method.into_body>
    pub fn into_body(self) -> IoStream {
        let HttpResponse { body, .. } = self;

        body
    }
}
