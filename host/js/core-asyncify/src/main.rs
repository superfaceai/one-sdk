#[link(wasm_import_module = "sf_host_unstable")]
extern "C" {
    #[link_name = "http_call"]
    fn http_call(url: usize, len: usize, out: usize, out_len: usize) -> usize;
}

fn main() {
    let url = "https://example.com";
    let mut buffer = [0u8; 16 * 1024];
    let read_len = unsafe {
        http_call(url.as_ptr() as usize, url.len(), buffer.as_mut_ptr() as usize, buffer.len())
    };

    let response = std::str::from_utf8(&buffer[..read_len]).unwrap();
    println!("Response: {}", response);
}
