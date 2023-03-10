use std::io::{Read, Write};

use slab::Slab;

use crate::sf_std::core_to_map::unstable::{
    HttpCallHeadError as MapHttpCallHeadError, HttpRequest as MapHttpRequest,
    HttpResponse as MapHttpResponse, MapValue, SfCoreUnstable as MapSfCoreUnstable,
};
use crate::sf_std::host_to_core::unstable::{http::HttpRequest, HostValue, IoStream};

struct HandleMap<T> {
    // TODO: figure out if we need generational ids or if it is secure assuming each map has its own state
    data: Slab<T>,
}
impl<T> HandleMap<T> {
    pub fn new() -> Self {
        Self { data: Slab::new() }
    }

    const fn handle_to_index(handle: usize) -> Option<usize> {
        handle.checked_sub(1)
    }

    const fn index_to_handle(index: usize) -> usize {
        index + 1
    }

    pub fn insert(&mut self, value: T) -> usize {
        Self::index_to_handle(self.data.insert(value))
    }

    pub fn get_mut(&mut self, handle: usize) -> Option<&mut T> {
        Self::handle_to_index(handle).and_then(|h| self.data.get_mut(h))
    }

    pub fn try_remove(&mut self, handle: usize) -> Option<T> {
        Self::handle_to_index(handle).and_then(|h| self.data.try_remove(h))
    }
}

pub(super) struct InterpreterState {
    http_requests: HandleMap<HttpRequest>,
    streams: HandleMap<IoStream>,
    map_input: Option<HostValue>,
    map_output: Option<HostValue>,
}
impl InterpreterState {
    pub fn new() -> Self {
        Self {
            http_requests: HandleMap::new(),
            streams: HandleMap::new(),
            map_input: None,
            map_output: None,
        }
    }

    pub fn set_input(&mut self, input: HostValue) {
        assert!(self.map_input.is_none());
        self.map_input = Some(input);
    }

    pub fn take_output(&mut self) -> Option<HostValue> {
        self.map_output.take()
    }
}
impl MapSfCoreUnstable for InterpreterState {
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

    fn http_call(&mut self, params: MapHttpRequest<'_>) -> usize {
        let request =
            HttpRequest::fire(params.method, params.url, params.headers, params.body).unwrap();

        self.http_requests.insert(request)
    }

    fn http_call_head(&mut self, handle: usize) -> Result<MapHttpResponse, MapHttpCallHeadError> {
        match self.http_requests.try_remove(handle) {
            None => Err(MapHttpCallHeadError::InvalidHandle),
            Some(mut request) => match request.into_response() {
                Err(err) => Err(MapHttpCallHeadError::ResponseError(err.to_string())),
                Ok(response) => Ok(MapHttpResponse {
                    status: response.status(),
                    headers: response.headers().clone(),
                    body_stream: self.streams.insert(response.into_body()),
                }),
            },
        }
    }

    fn get_input(&mut self) -> Option<MapValue> {
        // TODO: here we should transform HostValue into MapValue - i.e. especially transform custom objects (streams)
        self.map_input
            .take()
            .map(|v| serde_json::to_value(v).unwrap())
    }

    fn set_output(&mut self, output: MapValue) {
        // TODO: here we should transform MapValue into HostValue
        assert!(self.map_output.is_none());
        self.map_output = Some(serde_json::from_value(output).unwrap());
    }
}
