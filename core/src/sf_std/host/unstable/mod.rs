//! Unstable functions provide no stability guarantees

use crate::sf_std::abi::{
    bits::{PairRepr, Ptr, Size},
    error::ResultRepr,
    MessageFn, StreamFn,
};

mod http;
pub use http::*;

//////////////
// MESSAGES //
//////////////

// SAFETY: We choose to trust this FFI.
const EXCHANGE_MESSAGE: MessageFn = unsafe {
    MessageFn::new(
        __import_message_exchange,
        __import_message_exchange_retrieve,
    )
};
#[link(wasm_import_module = "sf_host_unstable")]
extern "C" {
    #[link_name = "message_exchange"]
    fn __import_message_exchange(
        msg_ptr: Ptr,
        msg_len: Size,
        out_ptr: Ptr,
        out_len: Size,
    ) -> PairRepr;

    #[link_name = "message_exchange_retrieve"]
    fn __import_message_exchange_retrieve(handle: Size, out_ptr: Ptr, out_len: Size) -> ResultRepr;
}

/////////////
// STREMAS //
/////////////

/// Stream which can be read from.
pub struct ReadStream(Size);
impl std::io::Read for ReadStream {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        STREAM_IO.read(self.0, buf)
    }
}
/// Stream which can be written to.
pub struct WriteStream(Size);
impl std::io::Write for WriteStream {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        STREAM_IO.write(self.0, buf)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        // this is a no-op right now
        Ok(())
    }
}
impl Drop for WriteStream {
    fn drop(&mut self) {
        STREAM_IO.close(self.0).unwrap()
    }
}

// SAFETY: We choose to trust this FFI.
const STREAM_IO: StreamFn = unsafe {
    StreamFn::new(
        __import_stream_read,
        __import_stream_write,
        __import_stream_close,
    )
};
#[link(wasm_import_module = "sf_host_unstable")]
extern "C" {
    #[link_name = "stream_read"]
    fn __import_stream_read(handle: Size, out_ptr: Ptr, out_len: Size) -> ResultRepr;

    #[link_name = "stream_write"]
    fn __import_stream_write(handle: Size, in_ptr: Ptr, in_len: Size) -> ResultRepr;

    #[link_name = "stream_close"]
    fn __import_stream_close(handle: Size) -> ResultRepr;
}
