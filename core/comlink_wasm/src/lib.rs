use wasm_abi::{
	AbiResultRepr, Handle, MessageExchange, MessageExchangeFfiFn, Ptr, Size, StaticMessageExchange
};

pub mod typescript_parser;

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
