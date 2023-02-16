use std::{collections::HashMap, io::Read};

use serde::{Deserialize, Serialize};

use super::{ReadStream, WriteStream, EXCHANGE_MESSAGE};
use crate::sf_std::abi::bits::Size;

#[derive(Serialize)]
enum InHttpCallBody<'a> {
    Data(&'a [u8]),
    Stream, // TODO: make this work
}
define_exchange! {
    struct InHttpCall<'a> {
        kind: "http-call",
        url: &'a str,
        method: &'a str,
        headers: &'a HashMap<String, Vec<String>>,
        body: Option<InHttpCallBody<'a>>
    } -> enum OutHttpCall {
        Ok {
            #[serde(default)]
            request_body_handle: Option<Size>,
            handle: Size,
        },
        Err {
            error: String
        }
    }
}
define_exchange! {
    struct InHttpCallRetrieveHead {
        kind: "http-call-head",
        handle: Size
    } -> enum OutHttpCallRetrieveHead {
        Ok {
            status: u16,
            headers: HashMap<String, Vec<String>>,
            body_handle: Size, // TODO: optional?
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
        headers: &HashMap<String, Vec<String>>,
        body: Option<&[u8]>,
    ) -> Result<Self, String> {
        let response = InHttpCall {
            kind: InHttpCall::KIND,
            url,
            method,
            headers,
            body: body.map(InHttpCallBody::Data),
        }
        .send_json(&EXCHANGE_MESSAGE)
        .unwrap();

        match response {
            OutHttpCall::Ok {
                request_body_handle,
                handle,
            } => {
                assert!(request_body_handle.is_none());
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

        let exchange_response = InHttpCallRetrieveHead::new(self.handle)
            .send_json(&EXCHANGE_MESSAGE)
            .unwrap();

        match exchange_response {
            // TODO: propagate out
            OutHttpCallRetrieveHead::Err { error } => {
                Err(format!("HttpCallRetrieveHead error: {}", error))
            }
            OutHttpCallRetrieveHead::Ok {
                status,
                headers,
                body_handle,
            } => {
                self.response = Some(HttpResponse {
                    status,
                    headers,
                    body: ReadStream(body_handle),
                });

                Ok(self.response.as_mut().unwrap())
            }
        }
    }
}

pub struct HttpResponse {
    status: u16,
    headers: HashMap<String, Vec<String>>,
    body: ReadStream,
}
impl HttpResponse {
    pub fn body(&mut self) -> impl Read + '_ {
        &mut self.body
    }
}
