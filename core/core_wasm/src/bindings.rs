use wasm_abi::{
    AbiResultRepr, Handle, MessageExchange, MessageExchangeFfiFn, Ptr, Size, StaticMessageExchange,
    StaticStreamExchange, StreamExchange, StreamExchangeFfiFn,
};

//////////////
// MESSAGES //
//////////////

#[derive(Clone)]
pub struct MessageExchangeFfi;
impl MessageExchangeFfi {
    // SAFETY: We choose to trust this FFI.
    const FFI: MessageExchangeFfiFn = unsafe {
        MessageExchangeFfiFn::new(
            __import_message_exchange,
            __import_message_exchange_retrieve,
        )
    };
}
impl MessageExchange for MessageExchangeFfi {
    fn invoke(&self, message: &[u8]) -> Vec<u8> {
        Self::FFI.invoke(message)
    }
}
impl StaticMessageExchange for MessageExchangeFfi {
    fn instance() -> Self {
        Self
    }
}

#[cfg(not(test))]
#[link(wasm_import_module = "sf_host_unstable")]
extern "C" {
    #[link_name = "message_exchange"]
    fn __import_message_exchange(
        msg_ptr: Ptr<u8>,
        msg_len: Size,
        out_ptr: Ptr<u8>,
        out_len: Size,
        ret_handle: Ptr<Handle>,
    ) -> Size;

    #[link_name = "message_exchange_retrieve"]
    fn __import_message_exchange_retrieve(
        handle: Handle,
        out_ptr: Ptr<u8>,
        out_len: Size,
    ) -> AbiResultRepr;
}
#[cfg(test)]
extern "C" fn __import_message_exchange(
    _msg_ptr: Ptr<u8>,
    _msg_len: Size,
    _out_ptr: Ptr<u8>,
    _out_len: Size,
    _ret_handle: Ptr<Handle>,
) -> Size {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_message_exchange_retrieve(
    _handle: Handle,
    _out_ptr: Ptr<u8>,
    _out_len: Size,
) -> AbiResultRepr {
    unreachable!()
}

/////////////
// STREAMS //
/////////////

#[derive(Clone)]
pub struct StreamExchangeFfi;
impl StreamExchangeFfi {
    // SAFETY: We choose to trust this FFI.
    const FFI: StreamExchangeFfiFn = unsafe {
        StreamExchangeFfiFn::new(
            __import_stream_read,
            __import_stream_write,
            __import_stream_close,
        )
    };
}
impl StreamExchange for StreamExchangeFfi {
    fn read(&self, handle: Handle, buf: &mut [u8]) -> std::io::Result<Size> {
        Self::FFI.read(handle, buf)
    }

    fn write(&self, handle: Handle, buf: &[u8]) -> std::io::Result<Size> {
        Self::FFI.write(handle, buf)
    }

    fn close(&self, handle: Handle) -> std::io::Result<()> {
        Self::FFI.close(handle)
    }
}
impl StaticStreamExchange for StreamExchangeFfi {
    fn instance() -> Self {
        Self
    }
}

#[cfg(not(test))]
#[link(wasm_import_module = "sf_host_unstable")]
extern "C" {
    #[link_name = "stream_read"]
    fn __import_stream_read(handle: Handle, out_ptr: Ptr<u8>, out_len: Size) -> AbiResultRepr;

    #[link_name = "stream_write"]
    fn __import_stream_write(handle: Handle, in_ptr: Ptr<u8>, in_len: Size) -> AbiResultRepr;

    #[link_name = "stream_close"]
    fn __import_stream_close(handle: Handle) -> AbiResultRepr;
}
#[cfg(test)]
extern "C" fn __import_stream_read(
    _handle: Handle,
    _out_ptr: Ptr<u8>,
    _out_len: Size,
) -> AbiResultRepr {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_stream_write(
    _handle: Handle,
    _in_ptr: Ptr<u8>,
    _in_len: Size,
) -> AbiResultRepr {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_stream_close(_handle: Handle) -> AbiResultRepr {
    unreachable!()
}
