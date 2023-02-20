//! Unstable functions provide no stability guarantees

use crate::sf_std::abi::{
    bits::{PairRepr, Ptr, Size},
    error::ResultRepr,
    MessageFn, StreamFn,
};

pub mod fs;
pub mod http;

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

/// Stream which can be read from or written to.
///
/// Not all streams can be both read from and written to. See [ReadStream] and [WriteStream].
pub struct IoStream(Size);
impl IoStream {
    pub(in crate::sf_std) fn from_raw_handle(handle: Size) -> Self {
        Self(handle)
    }
}
impl std::io::Read for IoStream {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        STREAM_IO.read(self.0, buf)
    }
}
impl std::io::Write for IoStream {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        STREAM_IO.write(self.0, buf)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        // this is a no-op right now
        Ok(())
    }
}
impl Drop for IoStream {
    fn drop(&mut self) {
        STREAM_IO.close(self.0).unwrap()
    }
}

/// Stream which can be read from.
pub struct ReadStream(IoStream);
impl ReadStream {
    pub(in crate::sf_std) fn from_raw_handle(handle: Size) -> Self {
        Self(IoStream::from_raw_handle(handle))
    }
}
impl std::io::Read for ReadStream {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        self.0.read(buf)
    }
}

/// Stream which can be written to.
pub struct WriteStream(IoStream);
impl WriteStream {
    pub(in crate::sf_std) fn from_raw_handle(handle: Size) -> Self {
        Self(IoStream::from_raw_handle(handle))
    }
}
impl std::io::Write for WriteStream {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.0.write(buf)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.0.flush()
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
