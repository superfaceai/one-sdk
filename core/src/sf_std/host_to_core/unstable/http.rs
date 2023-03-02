use std::io::Read;

use serde::{Deserialize, Serialize};

use super::{IoStream, MessageExchange, EXCHANGE_MESSAGE};
use crate::sf_std::{abi::Size, HeadersMultiMap};

define_exchange! {
    struct InHttpCall<'a> {
        kind: "http-call",
        url: &'a str,
        method: &'a str,
        headers: &'a HeadersMultiMap,
        body: Option<&'a [u8]>
    } -> enum OutHttpCall {
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
define_exchange! {
    struct InHttpCallHead {
        kind: "http-call-head",
        handle: Size
    } -> enum OutHttpCallHead {
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
    response: Option<HttpResponse>,
}
impl HttpRequest {
    // TODO: proper errors, not strings
    pub fn fire(
        method: &str,
        url: &str,
        headers: &HeadersMultiMap,
        body: Option<&[u8]>,
    ) -> Result<Self, String> {
        let response = InHttpCall {
            kind: InHttpCall::KIND,
            url,
            method,
            headers,
            body: body,
        }
        .send_json(&EXCHANGE_MESSAGE)
        .unwrap();

        match response {
            OutHttpCall::Ok {
                request_body_stream,
                handle,
            } => {
                assert!(request_body_stream.is_none());
                Ok(Self {
                    handle,
                    response: None,
                })
            }
            OutHttpCall::Err { error } => Err(format!("HttpCall error: {}", error)),
        }
    }

    // TODO: proper errors, not strings
    pub fn response(&mut self) -> Result<&'_ mut HttpResponse, String> {
        if let Some(ref mut response) = self.response {
            return Ok(response);
        }

        let exchange_response = InHttpCallHead::new(self.handle)
            .send_json(&EXCHANGE_MESSAGE)
            .unwrap();

        match exchange_response {
            OutHttpCallHead::Err { error } => Err(format!("OutHttpCallHead error: {}", error)),
            OutHttpCallHead::Ok {
                status,
                headers,
                body_stream,
            } => {
                self.response = Some(HttpResponse {
                    status,
                    headers,
                    body: body_stream,
                });

                Ok(self.response.as_mut().unwrap())
            }
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

    pub fn body(&mut self) -> impl Read + '_ {
        &mut self.body
    }
}
