use std::io::{Read, Write};

use map_std::{
    handle_map::HandleMap,
    unstable::{
        security::{resolve_security, SecurityMap},
        HttpCallError as MapHttpCallError, HttpCallHeadError as MapHttpCallHeadError,
        HttpRequest as MapHttpRequest, HttpResponse as MapHttpResponse, MapStdUnstable, MapValue,
        SetOutputError, TakeContextError,
    },
    MapStdFull,
};
use sf_std::abi::Handle;

use super::{HttpRequest, IoStream};

pub struct MapStdImpl {
    http_requests: HandleMap<HttpRequest>,
    streams: HandleMap<IoStream>,
    security: Option<SecurityMap>,
    map_context: Option<MapValue>,
    map_output: Option<Result<MapValue, MapValue>>,
}
impl MapStdImpl {
    pub fn new() -> Self {
        Self {
            http_requests: HandleMap::new(),
            streams: HandleMap::new(),
            security: None,
            map_context: None,
            map_output: None,
        }
    }

    pub fn set_context(&mut self, context: MapValue, security: Option<SecurityMap>) {
        assert!(self.map_context.is_none());
        assert!(self.security.is_none());

        self.map_context = Some(context);
        self.security = security;
    }

    pub fn take_output(&mut self) -> Option<Result<MapValue, MapValue>> {
        self.map_output.take()
    }
}
impl MapStdUnstable for MapStdImpl {
    fn print(&mut self, message: &str) {
        tracing::info!(map = %message);
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

    fn http_call(&mut self, mut params: MapHttpRequest) -> Result<Handle, MapHttpCallError> {
        let security_map = self.security.as_ref().unwrap();
        resolve_security(security_map, &mut params)?;

        let request = HttpRequest::fetch(
            &params.method,
            &params.url,
            &params.headers,
            &params.query,
            params.body.as_deref(),
        )?;

        Ok(self.http_requests.insert(request))
    }

    fn http_call_head(&mut self, handle: Handle) -> Result<MapHttpResponse, MapHttpCallHeadError> {
        match self.http_requests.try_remove(handle) {
            None => Err(MapHttpCallHeadError::InvalidHandle),
            Some(request) => {
                let response = request.into_response()?;

                Ok(MapHttpResponse {
                    status: response.status(),
                    headers: response.headers().clone(),
                    body_stream: self.streams.insert(response.into_body()),
                })
            }
        }
    }

    fn take_context(&mut self) -> Result<MapValue, TakeContextError> {
        self.map_context
            .take()
            .ok_or(TakeContextError::AlreadyTaken)
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
impl MapStdFull for MapStdImpl {}
