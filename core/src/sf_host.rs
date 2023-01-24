pub mod unstable {
    use std::fmt::Write;

    pub type HttpHandle = u32;
    pub fn http_get(url: &str, headers: &[[&str; 2]]) -> HttpHandle {
        let mut headers_str = String::new();
        for [key, value] in headers {
            write!(&mut headers_str, "{key}:{value}\n").unwrap();
        }

        unsafe {
            __import_http_get(
                url.as_ptr() as i32,
                url.len() as i32,
                headers_str.as_ptr() as i32,
                headers_str.len() as i32,
            ) as u32
        }
    }
    pub fn http_response_read(handle: HttpHandle, out: &mut [u8]) -> usize {
        unsafe {
            __import_http_response_read(handle as i32, out.as_mut_ptr() as i32, out.len() as i32)
                as usize
        }
    }

    #[link(wasm_import_module = "sf_host_unstable")]
    extern "C" {
        #[cfg_attr(target_arch = "wasm32", link_name = "http_get")]
        fn __import_http_get(url_ptr: i32, url_len: i32, headers_ptr: i32, headers_len: i32)
            -> i32;
        #[cfg_attr(target_arch = "wasm32", link_name = "http_response_read")]
        fn __import_http_response_read(handle: i32, out_ptr: i32, out_len: i32) -> i32;
    }
}
