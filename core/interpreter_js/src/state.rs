use std::io::{Read, Write};

use base64::Engine;
use serde_json::Value;
use slab::Slab;

use map_std::unstable::{
    security::{ApiKeyBodyType, ApiKeyPlacement, HttpSecurity, Security, SecurityMap},
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
    security: Option<SecurityMap>,
    map_input: Option<MapValue>,
    map_output: Option<Result<MapValue, MapValue>>,
}
impl InterpreterState {
    pub fn new() -> Self {
        Self {
            http_requests: HandleMap::new(),
            streams: HandleMap::new(),
            security: None,
            map_input: None,
            map_output: None,
        }
    }

    pub fn set_input(&mut self, input: MapValue, security: Option<SecurityMap>) {
        assert!(self.map_input.is_none());
        assert!(self.security.is_none());

        self.map_input = Some(input);
        self.security = security;
    }

    pub fn take_output(&mut self) -> Option<Result<MapValue, MapValue>> {
        self.map_output.take()
    }

    fn resolve_security(&self, params: &mut MapHttpRequest) -> Result<(), HttpCallError> {
        let security = match params.security {
            None => return Ok(()),
            Some(ref security) => security,
        };

        let security_config = self
            .security
            .as_ref()
            .expect(format!("Security configuration for {} is missing", security).as_str())
            .get(security.as_str());

        match security_config {
            None => {
                return Err(HttpCallError::InvalidSecurityConfiguration(format!(
                    "Security configuration '{}' is missing",
                    security
                )));
            }
            Some(Security::Http(HttpSecurity::Basic { user, password })) => {
                let encoded_crendentials = base64::engine::general_purpose::STANDARD
                    .encode(format!("{}:{}", user, password).as_bytes());
                let basic_auth = vec![format!("Basic {}", encoded_crendentials)];

                params
                    .headers
                    .insert("Authorization".to_string(), basic_auth);
            }
            Some(Security::Http(HttpSecurity::Bearer {
                bearer_format: _,
                token,
            })) => {
                let digest_auth = vec![format!("Bearer {}", token)];

                params
                    .headers
                    .insert("Authorization".to_string(), digest_auth);
            }
            Some(Security::ApiKey {
                r#in,
                name,
                apikey,
                body_type,
            }) => match (r#in, body_type) {
                (ApiKeyPlacement::Header, _) => {
                    params
                        .headers
                        .insert(name.to_string(), vec![apikey.to_string()]);
                }
                (ApiKeyPlacement::Path, _) => {
                    params.url = params.url.replace(&format!("{{{}}}", name), &apikey);
                }
                (ApiKeyPlacement::Query, _) => {
                    params
                        .query
                        .insert(name.to_string(), vec![apikey.to_string()]);
                }
                (ApiKeyPlacement::Body, Some(ApiKeyBodyType::Json)) => {
                    if let Some(body) = &params.body {
                        let mut body =
                            serde_json::from_slice::<serde_json::Value>(&body).map_err(|e| {
                                HttpCallError::InvalidSecurityConfiguration(format!(
                                    "Failed to parse body: {}",
                                    e
                                ))
                            })?;

                        let keys = if name.starts_with('/') {
                            name.split('/').filter(|p| !p.is_empty()).collect()
                        } else {
                            vec![name.as_str()]
                        };

                        if keys.len() == 0 {
                            return Err(HttpCallError::InvalidSecurityConfiguration(format!(
                                "Invalid field name '{}'",
                                name
                            )));
                        }

                        let mut key_idx: usize = 0;
                        let mut nested = &mut body;

                        while key_idx < keys.len() - 1 {
                            nested = &mut nested[keys[key_idx]];

                            if !nested.is_object() {
                                return Err(HttpCallError::InvalidSecurityConfiguration(format!(
                                    "Field values on path '/{}' isn't object",
                                    &keys[0..key_idx + 1].join("/")
                                )));
                            }

                            key_idx += 1;
                        }

                        nested[keys[key_idx]] = Value::from(apikey.to_string());

                        params.body = Some(serde_json::to_vec(&body).map_err(|e| {
                            HttpCallError::InvalidSecurityConfiguration(format!(
                                "Failed to serialize body: {}",
                                e
                            ))
                        })?);
                    } else {
                        return Err(HttpCallError::Failed("Body is empty".to_string()));
                    }
                }
                (ApiKeyPlacement::Body, None) => {
                    return Err(HttpCallError::InvalidSecurityConfiguration(
                        "Missing body type".to_string(),
                    ));
                }
            },
        }

        Ok(())
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

    fn http_call(&mut self, mut params: MapHttpRequest) -> Result<Handle, HttpCallError> {
        self.resolve_security(&mut params)?;

        let request = HttpRequest::fetch(
            &params.method,
            &params.url,
            &params.headers,
            &params.query,
            params.body.as_deref(),
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
