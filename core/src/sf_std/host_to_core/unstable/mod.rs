//! Unstable functions provide no stability guarantees

use serde::{Deserialize, Serialize};

use super::{
    abi::{MessageFn, StreamFn},
    MessageExchange,
};
use crate::sf_std::abi::{PairRepr, Ptr, ResultRepr, Size};

pub mod fs;
pub mod http;
pub mod perform;

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
#[cfg(not(test))]
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
// this is impractical but the imports don't get stripped when we are testing cdylib, so we stub them out
#[cfg(test)]
extern "C" fn __import_message_exchange(
    _msg_ptr: Ptr,
    _msg_len: Size,
    _out_ptr: Ptr,
    _out_len: Size,
) -> PairRepr {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_message_exchange_retrieve(
    _handle: Size,
    _out_ptr: Ptr,
    _out_len: Size,
) -> ResultRepr {
    unreachable!()
}

/////////////
// STREMAS //
/////////////

/// Stream which can be read from or written to.
///
/// Not all streams can be both read from and written to, those will return an error.
#[derive(Debug, PartialEq, Eq)]
pub struct IoStream(usize);
impl IoStream {
    pub(in crate::sf_std) fn from_raw_handle(handle: usize) -> Self {
        Self(handle)
    }

    pub(in crate::sf_std) fn to_raw_handle(&self) -> usize {
        self.0
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
impl Serialize for IoStream {
    fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
        self.0.serialize(ser)
    }
}
impl<'de> Deserialize<'de> for IoStream {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<IoStream, D::Error> {
        usize::deserialize(de).map(IoStream::from_raw_handle)
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

#[cfg(not(test))]
#[link(wasm_import_module = "sf_host_unstable")]
extern "C" {
    #[link_name = "stream_read"]
    fn __import_stream_read(handle: Size, out_ptr: Ptr, out_len: Size) -> ResultRepr;

    #[link_name = "stream_write"]
    fn __import_stream_write(handle: Size, in_ptr: Ptr, in_len: Size) -> ResultRepr;

    #[link_name = "stream_close"]
    fn __import_stream_close(handle: Size) -> ResultRepr;
}
// this is impractical but the imports don't get stripped when we are testing cdylib, so we stub them out
#[cfg(test)]
extern "C" fn __import_stream_read(_handle: Size, _out_ptr: Ptr, _out_len: Size) -> ResultRepr {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_stream_write(_handle: Size, _in_ptr: Ptr, _in_len: Size) -> ResultRepr {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_stream_close(handle: Size) -> ResultRepr {
    use crate::sf_std::abi::AbiResult;
    // this is actually called in tests which construct IoStreams, so we always succeed here
    // TODO: this should possibly be configurable on per-test basis
    assert_ne!(handle, 0);
    AbiResult::Ok(0).into()
}
