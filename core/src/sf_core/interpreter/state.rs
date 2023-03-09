use std::io::{Read, Write};

use slab::Slab;

use crate::sf_std::core_to_map::unstable as ctm_unstable;
use crate::sf_std::host_to_core::unstable::{http::HttpRequest, IoStream};

pub(super) struct InterpreterState {
    // TODO: figure out if we need generational ids or if it is secure assuming each map has its own state
    http_requests: Slab<HttpRequest>,
    streams: Slab<IoStream>,
}
impl InterpreterState {
    pub fn new() -> Self {
        Self {
            http_requests: Slab::new(),
            streams: Slab::new(),
        }
    }
}
impl ctm_unstable::SfCoreUnstable for InterpreterState {
    fn abort(&mut self, message: &str, filename: &str, line: usize, column: usize) -> String {
        format!("{} in ({}:{}:{})", message, filename, line, column)
    }

    fn print(&mut self, message: &str) {
        println!("map: {}", message);
    }

    fn stream_read(&mut self, handle: usize, buf: &mut [u8]) -> std::io::Result<usize> {
        match self.streams.get_mut(handle) {
            None => Err(std::io::ErrorKind::NotFound.into()),
            Some(stream) => stream.read(buf),
        }
    }

    fn stream_write(&mut self, handle: usize, buf: &[u8]) -> std::io::Result<usize> {
        match self.streams.get_mut(handle) {
            None => Err(std::io::ErrorKind::NotFound.into()),
            Some(stream) => stream.write(buf),
        }
    }

    fn stream_close(&mut self, handle: usize) -> std::io::Result<()> {
        match self.streams.try_remove(handle) {
            None => Err(std::io::ErrorKind::NotFound.into()),
            Some(_) => Ok(()), // drop cleans up
        }
    }

    fn http_call(&mut self, params: ctm_unstable::HttpRequest<'_>) -> usize {
        let request =
            HttpRequest::fire(params.method, params.url, params.headers, params.body).unwrap();

        self.http_requests.insert(request)
    }

    fn http_call_head(
        &mut self,
        handle: usize,
    ) -> Result<ctm_unstable::HttpResponse, ctm_unstable::HttpCallHeadError> {
        match self.http_requests.try_remove(handle) {
            None => Err(ctm_unstable::HttpCallHeadError::InvalidHandle),
            Some(mut request) => match request.into_response() {
                Err(err) => Err(ctm_unstable::HttpCallHeadError::ResponseError(
                    err.to_string(),
                )),
                Ok(response) => Ok(ctm_unstable::HttpResponse {
                    status: response.status(),
                    headers: response.headers().clone(),
                    body_stream: self.streams.insert(response.into_body()),
                }),
            },
        }
    }
}
