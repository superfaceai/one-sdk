use std::{
    collections::HashMap,
    io::{Read, Write},
};

use slab::Slab;

use map_std::unstable::{
    HttpCallError, HttpCallHeadError as MapHttpCallHeadError, HttpRequest as MapHttpRequest,
    HttpResponse as MapHttpResponse, MapStdUnstable, MapValue, SetOutputError, TakeInputError,
};
use sf_std::{
    abi::Handle,
    unstable::{http::HttpRequest, IoStream},
};

struct HandleMap<T> {
    // TODO: figure out if we need generational ids or if it is secure assuming each map has its own state
    data: Slab<T>,
}
impl<T> HandleMap<T> {
    pub fn new() -> Self {
        Self { data: Slab::new() }
    }

    const fn handle_to_index(handle: Handle) -> Option<usize> {
        (handle as usize).checked_sub(1)
    }

    const fn index_to_handle(index: usize) -> Handle {
        (index + 1) as Handle
    }

    pub fn insert(&mut self, value: T) -> Handle {
        Self::index_to_handle(self.data.insert(value))
    }

    pub fn get_mut(&mut self, handle: Handle) -> Option<&mut T> {
        Self::handle_to_index(handle).and_then(|h| self.data.get_mut(h))
    }

    pub fn try_remove(&mut self, handle: Handle) -> Option<T> {
        Self::handle_to_index(handle).and_then(|h| self.data.try_remove(h))
    }
}

pub(super) struct InterpreterState {
    http_requests: HandleMap<HttpRequest>,
    streams: HandleMap<IoStream>,
    secrets: Option<HashMap<String, String>>,
    map_input: Option<MapValue>,
    map_output: Option<Result<MapValue, MapValue>>,
}
impl InterpreterState {
    pub fn new() -> Self {
        Self {
            http_requests: HandleMap::new(),
            streams: HandleMap::new(),
            secrets: None,
            map_input: None,
            map_output: None,
        }
    }

    pub fn set_input(&mut self, input: MapValue, secrets: Option<HashMap<String, String>>) {
        assert!(self.map_input.is_none());
        assert!(self.secrets.is_none());

        self.map_input = Some(input);
        self.secrets = secrets;
    }

    pub fn take_output(&mut self) -> Option<Result<MapValue, MapValue>> {
        self.map_output.take()
    }
}
impl MapStdUnstable for InterpreterState {
    fn abort(&mut self, message: &str, filename: &str, line: usize, column: usize) -> String {
        format!("{} in ({}:{}:{})", message, filename, line, column)
    }

    fn print(&mut self, message: &str) {
        tracing::info!("map: {}", message);
    }

    fn stream_read(&mut self, handle: Handle, buf: &mut [u8]) -> std::io::Result<usize> {
        match self.streams.get_mut(handle) {
            None => Err(std::io::ErrorKind::NotFound.into()),
            Some(stream) => stream.read(buf),
        }
    }

    fn stream_write(&mut self, handle: Handle, buf: &[u8]) -> std::io::Result<usize> {
        match self.streams.get_mut(handle) {
            None => Err(std::io::ErrorKind::NotFound.into()),
            Some(stream) => stream.write(buf),
        }
    }

    fn stream_close(&mut self, handle: Handle) -> std::io::Result<()> {
        match self.streams.try_remove(handle) {
            None => Err(std::io::ErrorKind::NotFound.into()),
            Some(_) => Ok(()), // drop cleans up
        }
    }

    fn http_call(&mut self, params: MapHttpRequest<'_>) -> Result<Handle, HttpCallError> {
        // TODO: enrich with security

        let request = HttpRequest::fetch(
            params.method,
            params.url,
            params.headers,
            params.query,
            params.body,
        )
        .map_err(|err| HttpCallError::Failed(err.to_string()))?;

        Ok(self.http_requests.insert(request))
    }

    fn http_call_head(&mut self, handle: Handle) -> Result<MapHttpResponse, MapHttpCallHeadError> {
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

    fn take_input(&mut self) -> Result<MapValue, TakeInputError> {
        self.map_input.take().ok_or(TakeInputError::AlreadyTaken)
    }

    fn set_output_success(&mut self, output: MapValue) -> Result<(), SetOutputError> {
        if self.map_output.is_some() {
            return Err(SetOutputError::AlreadySet);
        }
        self.map_output = Some(Ok(output));

        Ok(())
    }

    fn set_output_failure(&mut self, output: MapValue) -> Result<(), SetOutputError> {
        if self.map_output.is_some() {
            return Err(SetOutputError::AlreadySet);
        }
        self.map_output = Some(Err(output));

        Ok(())
    }
}
