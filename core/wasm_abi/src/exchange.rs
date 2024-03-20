//! ABI convenience wrappers for `host <-> core` communication.

use std::io;

use serde::{de::DeserializeOwned, Serialize};
use thiserror::Error;

use super::{AbiResult, AbiResultRepr, Handle, Ptr, Size};

#[derive(Debug, Error)]
pub enum JsonMessageError {
    #[error("Failed to serialize message: {0}")]
    SerializeFailed(serde_json::Error),
    #[error("Failed to deserialize message: {0}")]
    DeserializeFailed(serde_json::Error),
}

/// Implementation of a channel over which messages can be exchanged.
pub trait MessageExchange {
    /// Invoke exchange by sending `message` and retrieving response.
    fn invoke(&self, message: &[u8]) -> Vec<u8>;
}
impl<E: MessageExchange + ?Sized> MessageExchange for &E {
    fn invoke(&self, message: &[u8]) -> Vec<u8> {
        (**self).invoke(message)
    }
}
/// Sends a message using [invoke](MessageExchange::invoke) by serializing and deserializing JSON.
pub fn message_exchange_invoke_json<M: Serialize, R: DeserializeOwned, E: MessageExchange>(
    exchange: E,
    message: &M,
) -> Result<R, JsonMessageError> {
    let _span = tracing::trace_span!("host/MessageExchange::invoke_json").entered();

    let json_message = serde_json::to_string(message).map_err(JsonMessageError::SerializeFailed)?;

    tracing::trace!(request = %json_message);

    let response = exchange.invoke(json_message.as_bytes());

    tracing::trace!(response = %std::str::from_utf8(response.as_slice()).unwrap());

    let response =
        serde_json::from_slice(response.as_slice()).map_err(JsonMessageError::DeserializeFailed)?;

    Ok(response)
}

/// Static message exchange is a trait for `MessageExchange`s which can be accessed in static context.
pub trait StaticMessageExchange: MessageExchange + Sized {
    /// Returns an instance of this exchange.
    ///
    /// This does not have to be a pure function.
    fn instance() -> Self;
}

/// Implementation of a channel over which byte streams can be exchanged.
///
/// Semantics are similar to [std::io::Read] and [std::io::Write].
pub trait StreamExchange {
    fn read(&self, handle: Handle, buf: &mut [u8]) -> io::Result<Size>;

    fn write(&self, handle: Handle, buf: &[u8]) -> io::Result<Size>;

    fn close(&self, handle: Handle) -> io::Result<()>;
}
impl<E: StreamExchange + ?Sized> StreamExchange for &E {
    fn read(&self, handle: Handle, buf: &mut [u8]) -> io::Result<Size> {
        (**self).read(handle, buf)
    }

    fn write(&self, handle: Handle, buf: &[u8]) -> io::Result<Size> {
        (**self).write(handle, buf)
    }

    fn close(&self, handle: Handle) -> io::Result<()> {
        (**self).close(handle)
    }
}
/// Static stream exchange is a trait for `StreamExchange`s which can be accessed in static context.
pub trait StaticStreamExchange: StreamExchange + Sized {
    /// Returns an instance of this exchange.
    ///
    /// This does not have to be a pure function.
    fn instance() -> Self;
}

/// Implementation of [MessageExchange] over FFI functions.
pub struct MessageExchangeFfiFn {
    /// Send message and get response or handle to stored response.
    ///
    /// `fn(msg_ptr, msg_len, out_ptr, out_len, ret_handle) -> size
    exchange_fn: unsafe extern "C" fn(Ptr<u8>, Size, Ptr<u8>, Size, Ptr<Handle>) -> Size,
    /// Retrieve stored response message.
    ///
    /// `fn(handle, out_ptr, out_len) -> Result<size, errno>`
    retrieve_fn: unsafe extern "C" fn(Handle, Ptr<u8>, Size) -> AbiResultRepr,
}
impl MessageExchangeFfiFn {
    const DEFAULT_RESPONSE_BUFFER_SIZE: usize = 1024; // or 8k?

    /// ## Safety
    ///
    /// Calling any of `exchange_fn`, `retrieve_fn` according to their ABI must not cause undefined behavior.
    pub const unsafe fn new(
        exchange_fn: unsafe extern "C" fn(Ptr<u8>, Size, Ptr<u8>, Size, Ptr<Handle>) -> Size,
        retrieve_fn: unsafe extern "C" fn(Handle, Ptr<u8>, Size) -> AbiResultRepr,
    ) -> Self {
        Self {
            exchange_fn,
            retrieve_fn,
        }
    }
}
impl MessageExchange for MessageExchangeFfiFn {
    /// Send a message to `self.exchange_fn` and retrieve response, calling `self.retrieve_fn` only if the response doesn't fit into the initial buffer.
    fn invoke(&self, message: &[u8]) -> Vec<u8> {
        let mut response_buffer = Vec::<u8>::with_capacity(Self::DEFAULT_RESPONSE_BUFFER_SIZE);

        let (result_size, result_handle) = {
            let mut ret_handle: Handle = 0;
            let msg_ptr = message.as_ptr().into();
            let msg_len = message.len() as Size;

            let out_ptr = response_buffer.as_mut_ptr().into();
            let out_len = response_buffer.capacity() as Size;

            // SAFETY: caller of constructor promises it is safe
            let size = unsafe {
                (self.exchange_fn)(
                    msg_ptr,
                    msg_len,
                    out_ptr,
                    out_len,
                    Ptr::from(&mut ret_handle as *mut _),
                )
            };

            (size, ret_handle)
        };

        if result_size > response_buffer.capacity() {
            // response buffer was too small, we must retrieve the message with a second function call

            response_buffer.reserve(result_size); // extend to at least result_size

            let result: AbiResult = {
                let out_ptr = response_buffer.as_mut_ptr().into();
                let out_len = response_buffer.capacity();

                // SAFETY: caller of constructor promises it is safe
                unsafe { (self.retrieve_fn)(result_handle, out_ptr, out_len) }
            }
            .into();

            // these errors are very unlikely and indicate an error in the host implementation
            // therefore we don't propagate them out
            match result.into_io_result() {
                Ok(written) => assert_eq!(written, result_size),
                Err(err) => panic!("Failed to retrieve stored message: {}", err),
            }
        };

        // SAFETY: we never take more than capacity
        unsafe { response_buffer.set_len(response_buffer.capacity().min(result_size)) };

        response_buffer
    }
}

/// Abstract implementation of [StreamExchange] over FFI functions.
pub struct StreamExchangeFfiFn {
    /// Read up to `out_len` bytes from stream at `handle`, return number of read bytes.
    ///
    /// `fn(handle, out_ptr, out_len) -> Result<read, errno>`
    read_fn: unsafe extern "C" fn(Handle, Ptr<u8>, Size) -> AbiResultRepr,
    /// Write up to `in_len` bytes to stream at `handle`, return number of written bytes.
    ///
    /// `fn(handle, in_ptr, in_len) -> Result<written, errno>`
    write_fn: unsafe extern "C" fn(Handle, Ptr<u8>, Size) -> AbiResultRepr,
    /// Close stream at `handle`, signalling it will not be read from or written to again.
    ///
    /// `fn(handle) -> Result<(), errno>`
    close_fn: unsafe extern "C" fn(Handle) -> AbiResultRepr,
}
impl StreamExchangeFfiFn {
    /// ## Safety
    ///
    /// Calling any of `read_fn`, `write_fn` and `close_fn` according to their ABI must not cause undefined behavior.
    pub const unsafe fn new(
        read_fn: unsafe extern "C" fn(Handle, Ptr<u8>, Size) -> AbiResultRepr,
        write_fn: unsafe extern "C" fn(Handle, Ptr<u8>, Size) -> AbiResultRepr,
        close_fn: unsafe extern "C" fn(Handle) -> AbiResultRepr,
    ) -> Self {
        Self {
            read_fn,
            write_fn,
            close_fn,
        }
    }
}
impl StreamExchange for StreamExchangeFfiFn {
    fn read(&self, handle: Handle, buf: &mut [u8]) -> io::Result<Size> {
        let _span = tracing::trace_span!("host/StreamExchange::read").entered();

        let out_ptr = buf.as_mut_ptr().into();
        let out_len = buf.len() as Size;
        tracing::trace!(handle, ?out_ptr, out_len);

        // SAFETY: caller of constructor promises it is safe
        let result: AbiResult = unsafe { (self.read_fn)(handle, out_ptr, out_len).into() };

        let result = result.into_io_result();
        tracing::trace!(result = ?result);

        result
    }

    fn write(&self, handle: Handle, buf: &[u8]) -> io::Result<Size> {
        let _span = tracing::trace_span!("host/StreamExchange::write").entered();

        let in_ptr = buf.as_ptr().into();
        let in_len = buf.len() as Size;
        tracing::trace!(handle, ?in_ptr, in_len);

        // SAFETY: caller of constructor promises it is safe
        let result: AbiResult = unsafe { (self.write_fn)(handle, in_ptr, in_len).into() };

        let result = result.into_io_result();
        tracing::trace!(result = ?result);

        result
    }

    fn close(&self, handle: Handle) -> io::Result<()> {
        let _span = tracing::trace_span!("host/StreamExchange::close").entered();

        tracing::trace!(handle);
        // SAFETY: caller of constructor promises it is safe
        let result: AbiResult = unsafe { (self.close_fn)(handle).into() };

        let result = result.into_io_result().map(|_| ());
        tracing::trace!(result = ?result);

        result
    }
}

pub mod testing {
    //! Here we export implementation of MessageExchange and StreamExchange for testing.

    use std::sync::Mutex;

    use super::{io, Handle, MessageExchange, Size, StreamExchange};

    // Mutex so the function can be FnMut, but in WASM it doesn't do much.
    pub struct TestMessageExchangeFn<F: FnMut(serde_json::Value) -> serde_json::Value>(Mutex<F>);
    impl<F: FnMut(serde_json::Value) -> serde_json::Value> TestMessageExchangeFn<F> {
        pub fn new(fun: F) -> Self {
            Self(Mutex::new(fun))
        }
    }
    impl<F: FnMut(serde_json::Value) -> serde_json::Value> MessageExchange
        for TestMessageExchangeFn<F>
    {
        fn invoke(&self, message: &[u8]) -> Vec<u8> {
            let message = serde_json::from_slice(message).unwrap();
            let response = (self.0.lock().unwrap())(message);

            serde_json::to_vec(&response).unwrap()
        }
    }

    pub struct TestStreamExchangeFn<Fr, Fw, Fc>(Mutex<Fr>, Mutex<Fw>, Mutex<Fc>)
    where
        Fr: FnMut(Handle, &mut [u8]) -> io::Result<Size>,
        Fw: FnMut(Handle, &[u8]) -> io::Result<Size>,
        Fc: FnMut(Handle) -> io::Result<()>;
    impl<Fr, Fw, Fc> TestStreamExchangeFn<Fr, Fw, Fc>
    where
        Fr: FnMut(Handle, &mut [u8]) -> io::Result<Size>,
        Fw: FnMut(Handle, &[u8]) -> io::Result<Size>,
        Fc: FnMut(Handle) -> io::Result<()>,
    {
        pub fn new(read: Fr, write: Fw, close: Fc) -> Self {
            Self(Mutex::new(read), Mutex::new(write), Mutex::new(close))
        }
    }
    impl<Fr, Fw, Fc> StreamExchange for TestStreamExchangeFn<Fr, Fw, Fc>
    where
        Fr: FnMut(Handle, &mut [u8]) -> io::Result<Size>,
        Fw: FnMut(Handle, &[u8]) -> io::Result<Size>,
        Fc: FnMut(Handle) -> io::Result<()>,
    {
        fn read(&self, handle: Handle, buf: &mut [u8]) -> io::Result<Size> {
            (self.0.lock().unwrap())(handle, buf)
        }

        fn write(&self, handle: Handle, buf: &[u8]) -> io::Result<Size> {
            (self.1.lock().unwrap())(handle, buf)
        }

        fn close(&self, handle: Handle) -> io::Result<()> {
            (self.2.lock().unwrap())(handle)
        }
    }
}

#[cfg(test)]
mod test {
    // Here are the actual tests for this module.

    use std::sync::Mutex;

    use super::*;
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize)]
    struct TestMsg {
        f1: u32,
        f2: String,
    }

    // very simple message storage
    // Note that we use a mutex here but since WASM has no threads it doesn't do much.
    // It does make sure that our tests don't cause UB on other platforms though, since we expect them to
    // pass on amd64/aarch64 as well.
    static STORED_MESSAGES: Mutex<(Handle, Vec<(Handle, String)>)> = Mutex::new((1, Vec::new()));

    extern "C" fn test_message_exchange_fn(
        msg_ptr: Ptr<u8>,
        msg_len: Size,
        mut out_ptr: Ptr<u8>,
        out_len: Size,
        mut ret_handle: Ptr<Handle>,
    ) -> Size {
        let msg_bytes = unsafe { std::slice::from_raw_parts(msg_ptr.ptr(), msg_len) };
        let msg: TestMsg = serde_json::from_slice(msg_bytes).unwrap();

        let result = serde_json::to_string(&msg).unwrap();
        let result_len = result.len();

        let handle = if result_len > out_len {
            // store the message, generate the handle
            {
                let mut lock = STORED_MESSAGES.lock().unwrap();

                let handle = lock.0;
                lock.0 += 1;
                lock.1.push((handle, result));

                handle
            }
        } else {
            // output the message, no handle needed
            let out_ptr = out_ptr.mut_ptr();
            for (i, byte) in result.as_bytes().iter().enumerate() {
                unsafe { out_ptr.add(i).write(*byte) };
            }

            0
        };

        unsafe {
            ret_handle.mut_ptr().write(handle);
        }
        result_len
    }

    extern "C" fn test_message_retrieve_fn(
        handle: Handle,
        mut out_ptr: Ptr<u8>,
        out_len: Size,
    ) -> AbiResultRepr {
        let mut lock = STORED_MESSAGES.lock().unwrap();

        let index = lock
            .1
            .iter()
            .enumerate()
            .find_map(|(index, (h, _))| (handle == *h).then_some(index));

        match index {
            None => AbiResult::Err(1),
            Some(index) => {
                let msg = { lock.1.swap_remove(index) }.1;

                let out_ptr = out_ptr.mut_ptr();
                for (i, byte) in msg.as_bytes().iter().enumerate().take(out_len as usize) {
                    unsafe { out_ptr.add(i).write(*byte) };
                }

                AbiResult::Ok(msg.len())
            }
        }
        .into()
    }

    const MESSAGE_FN: MessageExchangeFfiFn =
        unsafe { MessageExchangeFfiFn::new(test_message_exchange_fn, test_message_retrieve_fn) };

    #[test]
    fn test_invoke_message_roundtrip() {
        let message = TestMsg {
            f1: 1,
            f2: "true".to_string(),
        };
        let response =
            message_exchange_invoke_json::<TestMsg, TestMsg, _>(MESSAGE_FN, &message).unwrap();

        assert_eq!(response.f1, 1);
        assert_eq!(response.f2, "true");
    }

    #[test]
    fn test_invoke_message_roundtrip_toobig() {
        let long_string = {
            let mut value = String::new();
            for _ in 0..MessageExchangeFfiFn::DEFAULT_RESPONSE_BUFFER_SIZE {
                value.push_str("na");
            }

            value
        };

        let message = TestMsg {
            f1: 12,
            f2: long_string.clone(),
        };
        let response =
            message_exchange_invoke_json::<TestMsg, TestMsg, _>(MESSAGE_FN, &message).unwrap();

        assert_eq!(response.f1, 12);
        assert_eq!(response.f2, long_string);
    }

    extern "C" fn test_stream_read(
        handle: Handle,
        mut out_ptr: Ptr<u8>,
        out_len: Size,
    ) -> AbiResultRepr {
        if handle == 123 {
            let data: [u8; 10] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            let to_write = out_len.min(data.len());

            let out_ptr = out_ptr.mut_ptr();
            for (i, byte) in data.into_iter().take(to_write).enumerate() {
                unsafe { out_ptr.add(i).write(byte) };
            }

            return AbiResult::Ok(to_write).into();
        }

        return AbiResult::Err(handle as Size).into();
    }
    extern "C" fn test_stream_write(
        handle: Handle,
        in_ptr: Ptr<u8>,
        in_len: Size,
    ) -> AbiResultRepr {
        if handle == 124 {
            let mut buffer = [0u8; 10];
            let to_read = in_len.min(buffer.len());

            let in_ptr = in_ptr.ptr();
            for i in 0..to_read {
                buffer[i] = unsafe { in_ptr.add(i).read() };
            }

            return AbiResult::Ok(to_read).into();
        }

        return AbiResult::Err(handle as Size).into();
    }
    extern "C" fn test_stream_close(handle: Handle) -> AbiResultRepr {
        if handle == 124 {
            return AbiResult::Ok(0).into();
        }

        return AbiResult::Err(handle as Size).into();
    }
    const STREAM_IO: StreamExchangeFfiFn =
        unsafe { StreamExchangeFfiFn::new(test_stream_read, test_stream_write, test_stream_close) };

    #[test]
    fn test_invoke_stream_read_5() {
        let mut buffer = [0u8; 5];
        assert_eq!(STREAM_IO.read(123, &mut buffer).unwrap(), 5);
        assert_eq!(buffer, [1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_invoke_stream_read_10() {
        let mut buffer = [0u8; 10];
        assert_eq!(STREAM_IO.read(123, &mut buffer).unwrap(), 10);
        assert_eq!(buffer, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }

    #[test]
    fn test_invoke_stream_read_15() {
        let mut buffer = [0u8; 15];
        assert_eq!(STREAM_IO.read(123, &mut buffer).unwrap(), 10);
        assert_eq!(buffer, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0, 0, 0, 0, 0]);
    }

    #[test]
    fn test_invoke_stream_write_5() {
        let data = [1, 2, 3, 4, 5];
        assert_eq!(STREAM_IO.write(124, &data).unwrap(), 5);
    }

    #[test]
    fn test_invoke_stream_write_10() {
        let data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        assert_eq!(STREAM_IO.write(124, &data).unwrap(), 10);
    }

    #[test]
    fn test_invoke_stream_write_15() {
        let data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        assert_eq!(STREAM_IO.write(124, &data).unwrap(), 10);
    }

    #[test]
    fn test_invoke_stream_close() {
        assert_eq!(STREAM_IO.close(124).unwrap(), ());
    }
}
