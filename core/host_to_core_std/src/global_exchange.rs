use wasm_abi::{MessageExchange, StaticMessageExchange, StaticStreamExchange, StreamExchange};

static mut GLOBAL_MESSAGE_EXCHANGE: Option<Box<dyn MessageExchange>> = None;
/// SAFETY: Must be called exactly once during initialization (before any functions using the exchange are called).
pub unsafe fn set_global_message_exchange(message_exchange: impl MessageExchange + 'static) {
    unsafe {
        GLOBAL_MESSAGE_EXCHANGE = Some(Box::new(message_exchange));
    }
}

pub struct GlobalMessageExchange;
impl MessageExchange for GlobalMessageExchange {
    fn invoke(&self, message: &[u8]) -> Vec<u8> {
        unsafe { GLOBAL_MESSAGE_EXCHANGE.as_ref().unwrap_unchecked() }.invoke(message)
    }
}
impl StaticMessageExchange for GlobalMessageExchange {
    fn instance() -> Self {
        Self
    }
}

static mut GLOBAL_STREAM_EXCHANGE: Option<Box<dyn StreamExchange>> = None;
/// SAFETY: Must be called exactly once during initialization (before any functions using the exchange are called).
pub unsafe fn set_global_stream_exchange(stream_exchange: impl StreamExchange + 'static) {
    unsafe {
        GLOBAL_STREAM_EXCHANGE = Some(Box::new(stream_exchange));
    }
}

pub struct GlobalStreamExchange;
impl StreamExchange for GlobalStreamExchange {
    fn read(&self, handle: wasm_abi::Handle, buf: &mut [u8]) -> std::io::Result<wasm_abi::Size> {
        unsafe { GLOBAL_STREAM_EXCHANGE.as_ref().unwrap_unchecked() }.read(handle, buf)
    }

    fn write(&self, handle: wasm_abi::Handle, buf: &[u8]) -> std::io::Result<wasm_abi::Size> {
        unsafe { GLOBAL_STREAM_EXCHANGE.as_ref().unwrap_unchecked() }.write(handle, buf)
    }

    fn close(&self, handle: wasm_abi::Handle) -> std::io::Result<()> {
        unsafe { GLOBAL_STREAM_EXCHANGE.as_ref().unwrap_unchecked() }.close(handle)
    }
}
impl StaticStreamExchange for GlobalStreamExchange {
    fn instance() -> Self {
        Self
    }
}
