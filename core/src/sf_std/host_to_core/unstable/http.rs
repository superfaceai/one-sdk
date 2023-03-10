use std::io::Read;

use serde::{Deserialize, Serialize};

use super::{IoStream, MessageExchange, EXCHANGE_MESSAGE};
use crate::sf_std::{abi::Size, HeadersMultiMap};

define_exchange_core_to_host! {
    struct HttpCallRequest<'a> {
        kind: "http-call",
        method: &'a str,
        url: &'a str,
        headers: &'a HeadersMultiMap,
        body: Option<&'a [u8]>
    } -> enum HttpCallResponse {
        Ok {
            #[serde(default)]
            request_body_stream: Option<IoStream>,
            handle: Size,
        },
        Err {
            error: String
        }
    }
}
define_exchange_core_to_host! {
    struct HttpCallHeadRequest {
        kind: "http-call-head",
        handle: Size
    } -> enum HttpCallHeadResponse {
        Ok {
            status: u16,
            headers: HeadersMultiMap,
            body_stream: IoStream, // TODO: optional?
        },
        Err {
            error: String
        }
    }
}

pub struct HttpRequest {
    handle: usize,
}
impl HttpRequest {
    // TODO: proper errors
    pub fn fire(
        method: &str,
        url: &str,
        headers: &HeadersMultiMap,
        body: Option<&[u8]>,
    ) -> anyhow::Result<Self> {
        let response = HttpCallRequest {
            kind: HttpCallRequest::KIND,
            url,
            method,
            headers,
            body: body,
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
            HttpCallResponse::Err { error } => anyhow::bail!("HttpCall error: {}", error),
        }
    }

    // TODO: proper errors
    pub fn into_response(&mut self) -> anyhow::Result<HttpResponse> {
        let exchange_response = HttpCallHeadRequest::new(self.handle)
            .send_json(&EXCHANGE_MESSAGE)
            .unwrap();

        match exchange_response {
            HttpCallHeadResponse::Err { error } => {
                anyhow::bail!("OutHttpCallHead error: {}", error)
            }
            HttpCallHeadResponse::Ok {
                status,
                headers,
                body_stream,
            } => Ok(HttpResponse {
                status,
                headers,
                body: body_stream,
            }),
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
