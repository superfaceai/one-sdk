use std::io::Read;

use serde::{Deserialize, Serialize};
use thiserror::Error;
use url::Url;

use super::{ErrorCode, IoStream, IoStreamHandle};
use crate::{
    abi::{
        Handle, MessageExchange, MessageExchangeFfiFn, StaticMessageExchange, StaticStreamExchange,
        StreamExchange, StreamExchangeFfiFn,
    },
    lowercase_headers_multimap, HeadersMultiMap, MultiMap,
};

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
            request_body_stream: Option<IoStreamHandle>,
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
            body_stream: IoStreamHandle, // TODO: optional? in case response doesn't have a body
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
    #[error("Connection refused: {0}")]
    ConnectionRefused(String),
    #[error("Host was not found: {0}")]
    HostNotFound(String),
    #[error("Unknown http error: {0}")]
    Unknown(String), // TODO: more granular
}
pub struct HttpRequest<
    Me: MessageExchange = MessageExchangeFfiFn,
    Se: StreamExchange = StreamExchangeFfiFn,
> {
    handle: Handle,
    message_exchange: Me,
    stream_exchange: Se,
}
impl<Me: StaticMessageExchange, Se: StaticStreamExchange> HttpRequest<Me, Se> {
    pub fn fetch(
        method: &str,
        url: &str,
        headers: &HeadersMultiMap,
        query: &MultiMap,
        body: Option<&[u8]>,
    ) -> Result<Self, HttpCallError> {
        Self::fetch_in(
            method,
            url,
            headers,
            query,
            body,
            Me::instance(),
            Se::instance(),
        )
    }
}
impl<Me: MessageExchange, Se: StreamExchange> HttpRequest<Me, Se> {
    fn fetch_in(
        method: &str,
        url: &str,
        headers: &HeadersMultiMap,
        query: &MultiMap,
        body: Option<&[u8]>,
        message_exchange: Me,
        stream_exchange: Se,
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
        .send_json_in(&message_exchange)
        .unwrap();

        match response {
            HttpCallResponse::Ok {
                request_body_stream,
                handle,
            } => {
                assert!(request_body_stream.is_none());
                Ok(Self {
                    handle,
                    message_exchange,
                    stream_exchange,
                })
            }
            HttpCallResponse::Err {
                error_code,
                message,
            } => Err(Self::response_error_to_http_call_error(error_code, message)),
        }
    }

    pub fn into_response(self) -> Result<HttpResponse<Se>, HttpCallError> {
        let exchange_response = HttpCallHeadRequest::new(self.handle)
            .send_json_in(&self.message_exchange)
            .unwrap();

        match exchange_response {
            HttpCallHeadResponse::Ok {
                status,
                headers,
                body_stream,
            } => Ok(HttpResponse {
                status,
                headers: lowercase_headers_multimap(headers),
                body: IoStream::<Se>::from_handle_in(body_stream, self.stream_exchange),
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
            ErrorCode::NetworkConnectionRefused => HttpCallError::ConnectionRefused(message),
            ErrorCode::NetworkHostNotFound => HttpCallError::HostNotFound(message),
            ErrorCode::NetworkError | ErrorCode::NetworkInvalidHandle => {
                HttpCallError::Unknown(format!("{:?}: {}", error_code, message))
            }
        }
    }
}

pub struct HttpResponse<Se: StreamExchange = StreamExchangeFfiFn> {
    status: u16,
    headers: HeadersMultiMap,
    body: IoStream<Se>,
}
impl<Se: StreamExchange> HttpResponse<Se> {
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
    pub fn into_body(self) -> IoStream<Se> {
        let HttpResponse { body, .. } = self;

        body
    }
}

#[cfg(test)]
mod test {
    use std::collections::HashMap;

    use super::*;
    use crate::abi::testing::{TestMessageExchangeFn, TestStreamExchangeFn};

    #[test]
    fn test_http_fetch_query_normalization() {
        HttpRequest::fetch_in(
            "GET",
            "https://example.com/?foo=1&bar=2",
            &HashMap::new(),
            &HashMap::from_iter([
                ("foo".to_string(), vec!["x".to_string(), "y".to_string()]),
                ("quz".to_string(), vec!["b".to_string(), "c".to_string()]),
            ]),
            None,
            TestMessageExchangeFn::new(|message| {
                let query = message["url"].as_str().unwrap().split_once("?").unwrap().1;
                let mut pairs = query.split("&").collect::<Vec<_>>();
                pairs.sort(); // since query parameters don't have a set ordering and internally there is a hashmap, we have to make it deterministic by sorting the pairs

                assert_eq!(
                    pairs,
                    vec!["bar=2", "foo=1", "foo=x", "foo=y", "quz=b", "quz=c"]
                );

                serde_json::json!({ "kind": "ok", "handle": 1 })
            }),
            TestStreamExchangeFn::new(
                |_handle, _buf| unimplemented!(),
                |_handle, _buf| unimplemented!(),
                |_handle| unimplemented!(),
            ),
        )
        .unwrap();
    }
}
