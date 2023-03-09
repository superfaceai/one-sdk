use std::{collections::HashMap, io::Read};

use crate::sf_std::core_to_map::unstable as ctm_unstable;
use crate::sf_std::host_to_core::unstable::http::HttpRequest;

pub(super) struct InterpreterState {
    http_next_id: usize,
    http_requests: HashMap<usize, HttpRequest>,
}
impl InterpreterState {
    pub fn new() -> Self {
        Self {
            http_next_id: 1,
            http_requests: HashMap::new(),
        }
    }
}
impl ctm_unstable::SfCoreUnstable for InterpreterState {
    fn http_get(&mut self, url: &str, headers: &[[&str; 2]]) -> ctm_unstable::HttpHandle {
        eprintln!("core: http_get({}, {:?})", url, headers);

        let headers_map = {
            let mut headers_map = HashMap::<String, Vec<String>>::new();

            for &[key, value] in headers {
                headers_map
                    .entry(key.to_string())
                    .or_default()
                    .push(value.to_string());
            }

            headers_map
        };
        let request = HttpRequest::fire("GET", url, &headers_map, None).unwrap();

        let id = self.http_next_id;
        self.http_next_id += 1;

        self.http_requests.insert(id, request);

        id as _
    }

    fn http_response_read(&mut self, handle: ctm_unstable::HttpHandle, out: &mut [u8]) -> usize {
        eprintln!("core: http_response_read({}, u8[{}])", handle, out.len());

        let response = self
            .http_requests
            .get_mut(&(handle as _))
            .unwrap()
            .response()
            .unwrap();

        let count = response.body().read(out).unwrap();

        if count == 0 {
            // TODO: where to clean up the request?
            self.http_requests.remove(&(handle as _));
        }

        return count;
    }

    fn store_message(&mut self, _message: Vec<u8>) -> usize {
        // TODO: implement
        0
    }

    fn retrieve_message(&mut self, _id: usize) -> Option<Vec<u8>> {
        // TODO: implement
        None
    }

    fn abort(&mut self, message: &str, filename: &str, line: usize, column: usize) -> String {
        format!("{} in ({}:{}:{})", message, filename, line, column)
    }

    fn print(&mut self, message: &str) {
        println!("map: {}", message);
    }

    fn http_call(&mut self, params: ctm_unstable::HttpRequest<'_>) -> usize {
        let request =
            HttpRequest::fire(params.method, params.url, params.headers, params.body).unwrap();

        let id = self.http_next_id;
        self.http_next_id += 1;
        self.http_requests.insert(id, request);

        id
    }

    fn http_call_head(
        &mut self,
        handle: usize,
    ) -> Result<ctm_unstable::HttpResponse, ctm_unstable::HttpCallHeadError> {
        match self.http_requests.remove(&handle) {
            None => Err(ctm_unstable::HttpCallHeadError::InvalidHandle),
            Some(mut request) => match request.response() {
                Err(err) => Err(ctm_unstable::HttpCallHeadError::ResponseError(err)),
                Ok(response) => Ok(ctm_unstable::HttpResponse {
                    status: response.status(),
                    headers: response.headers().clone(),
                    body_stream: (),
                }),
            },
        }
    }
}
