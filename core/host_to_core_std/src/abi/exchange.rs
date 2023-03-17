//! ABI convenience wrappers for `host <-> core` communication.

use std::io;

use thiserror::Error;
use serde::{de::DeserializeOwned, Serialize};

use super::{AbiPair, AbiResult, PairRepr, Ptr, ResultRepr, Size};

#[derive(Debug, Error)]
pub enum JsonMessageError {
    #[error("Failed to serialize message: {0}")]
    SerializeError(serde_json::Error),
    #[error("Failed to deserialize message: {0}")]
    DeserializeError(serde_json::Error),
}

pub struct MessageFn {
    /// Send message and get response or handle to stored response.
    ///
    /// `fn(msg_ptr, msg_len, out_ptr, out_len) -> (size, handle)`
    exchange_fn: unsafe extern "C" fn(Ptr, Size, Ptr, Size) -> PairRepr,
    /// Retrieve stored response message.
    ///
    /// `fn(handle, out_ptr, out_len) -> Result<size, errno>`
    retrieve_fn: unsafe extern "C" fn(Size, Ptr, Size) -> ResultRepr,
}
impl MessageFn {
    const DEFAULT_RESPONSE_BUFFER_SIZE: usize = 1024; // or 8k?

    /// ## Safety
    ///
    /// Calling any of `exchange_fn`, `retrieve_fn` according to their ABI must not cause undefined behavior.
    pub const unsafe fn new(
        exchange_fn: unsafe extern "C" fn(Ptr, Size, Ptr, Size) -> PairRepr,
        retrieve_fn: unsafe extern "C" fn(Size, Ptr, Size) -> ResultRepr,
    ) -> Self {
        Self {
            exchange_fn,
            retrieve_fn,
        }
    }

    /// Send a message to `self.exchange_fn` and retrieve response, calling `self.retrieve_fn` only if the response doesn't fit into the initial buffer.
    pub fn invoke(&self, message: &[u8]) -> Vec<u8> {
        let mut response_buffer = Vec::<u8>::with_capacity(Self::DEFAULT_RESPONSE_BUFFER_SIZE);

        let AbiPair(result_size, result_handle) = {
            let msg_ptr = message.as_ptr() as Ptr;
            let msg_len = message.len() as Size;

            let out_ptr = response_buffer.as_mut_ptr() as Ptr;
            let out_len = response_buffer.capacity() as Size;

            // SAFETY: caller of constructor promises it is safe
            unsafe { (self.exchange_fn)(msg_ptr, msg_len, out_ptr, out_len) }
        }
        .into();

        if result_size > response_buffer.capacity() {
            // response buffer was too small, we must retrieve the message with a second function call

            response_buffer.reserve(result_size); // extend to at least result_size

            let result: AbiResult = {
                let out_ptr = response_buffer.as_mut_ptr() as usize;
                let out_len = response_buffer.capacity() as usize;

                // SAFETY: caller of constructor promises it is safe
                unsafe { (self.retrieve_fn)(result_handle, out_ptr, out_len) }
            }
            .into();

            // these errors are very unlikely and indicate an error in the host implementation
            // therefore we don't propagate them out
            match result.into_io_result() {
                Ok(written) => assert_eq!(written as usize, result_size),
                Err(err) => panic!("Failed to retrieve stored message: {}", err),
            }
        };

        // SAFETY: we never take more than capacity
        //  worst case we read uninitialized memory, which hopefully isn't as UB in WASM
        unsafe { response_buffer.set_len(response_buffer.capacity().min(result_size)) };

        response_buffer
    }

    /// Sends a message using [invoke](Self::invoke) by serializing and deserializing JSON.
    pub fn invoke_json<M: Serialize, R: DeserializeOwned>(
        &self,
        message: &M,
    ) -> Result<R, JsonMessageError> {
        let json_message =
            serde_json::to_string(message).map_err(JsonMessageError::SerializeError)?;

        let response = self.invoke(json_message.as_bytes());

        let response = serde_json::from_slice(response.as_slice())
            .map_err(JsonMessageError::DeserializeError)?;

        Ok(response)
    }
}

pub struct StreamFn {
    /// Read up to `out_len` bytes from stream at `handle`, return number of read bytes.
    ///
    /// `fn(handle, out_ptr, out_len) -> Result<read, errno>`
    read_fn: unsafe extern "C" fn(Size, Ptr, Size) -> ResultRepr,
    /// Write up to `in_len` bytes to stream at `handle`, return number of written bytes.
    ///
    /// `fn(handle, in_ptr, in_len) -> Result<written, errno>`
    write_fn: unsafe extern "C" fn(Size, Ptr, Size) -> ResultRepr,
    /// Close stream at `handle`, signalling it will not be read from or written to again.
    ///
    /// `fn(handle) -> Result<(), errno>`
    close_fn: unsafe extern "C" fn(Size) -> ResultRepr,
}
impl StreamFn {
    /// ## Safety
    ///
    /// Calling any of `read_fn`, `write_fn` and `close_fn` according to their ABI must not cause undefined behavior.
    pub const unsafe fn new(
        read_fn: unsafe extern "C" fn(Size, Ptr, Size) -> ResultRepr,
        write_fn: unsafe extern "C" fn(Size, Ptr, Size) -> ResultRepr,
        close_fn: unsafe extern "C" fn(Size) -> ResultRepr,
    ) -> Self {
        Self {
            read_fn,
            write_fn,
            close_fn,
        }
    }

    pub fn read(&self, handle: Size, buf: &mut [u8]) -> io::Result<Size> {
        let out_ptr = buf.as_mut_ptr() as Ptr;
        let out_len = buf.len() as Size;

        // SAFETY: caller of constructor promises it is safe
        let result: AbiResult = unsafe { (self.read_fn)(handle, out_ptr, out_len).into() };

        result.into_io_result().map(|read| read)
    }

    pub fn write(&self, handle: Size, buf: &[u8]) -> io::Result<Size> {
        let in_ptr = buf.as_ptr() as Ptr;
        let in_len = buf.len() as Size;

        // SAFETY: caller of constructor promises it is safe
        let result: AbiResult = unsafe { (self.write_fn)(handle, in_ptr, in_len).into() };

        result.into_io_result().map(|written| written)
    }

    pub fn close(&self, handle: Size) -> io::Result<()> {
        // SAFETY: caller of constructor promises it is safe
        let result: AbiResult = unsafe { (self.close_fn)(handle).into() };

        result.into_io_result().map(|_| ())
    }
}

#[cfg(test)]
mod test {
    use std::sync::Mutex;

    use serde::{Deserialize, Serialize};

    use super::{
        MessageFn, StreamFn, {AbiPair, AbiResult, PairRepr, Ptr, ResultRepr, Size},
    };

    #[derive(Serialize, Deserialize)]
    struct TestMsg {
        f1: u32,
        f2: String,
    }

    // very simple message storage
    // Note that we use a mutex here but since WASM has no threads it doesn't do much.
    // It does make sure that our tests don't cause UB on other platforms though, since we expect them to
    // pass on amd64/aarch64 as well.
    static STORED_MESSAGES: Mutex<(Size, Vec<(Size, String)>)> = Mutex::new((1, Vec::new()));

    extern "C" fn test_message_exchange_fn(
        msg_ptr: Ptr,
        msg_len: Size,
        out_ptr: Ptr,
        out_len: Size,
    ) -> PairRepr {
        let msg_bytes = unsafe { std::slice::from_raw_parts(msg_ptr as *const u8, msg_len) };
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
            let out_ptr = out_ptr as *mut u8;
            for (i, byte) in result.as_bytes().iter().enumerate() {
                unsafe { out_ptr.add(i).write(*byte) };
            }

            0
        };

        AbiPair(result_len, handle).into()
    }

    extern "C" fn test_message_retrieve_fn(
        handle: Size,
        out_ptr: Ptr,
        out_len: Size,
    ) -> ResultRepr {
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

                let out_ptr = out_ptr as *mut u8;
                for (i, byte) in msg.as_bytes().iter().enumerate().take(out_len as usize) {
                    unsafe { out_ptr.add(i).write(*byte) };
                }

                AbiResult::Ok(msg.len())
            }
        }
        .into()
    }

    const MESSAGE_FN: MessageFn =
        unsafe { MessageFn::new(test_message_exchange_fn, test_message_retrieve_fn) };

    #[test]
    fn test_invoke_message_roundtrip() {
        let message = TestMsg {
            f1: 1,
            f2: "true".to_string(),
        };
        let response = MESSAGE_FN
            .invoke_json::<TestMsg, TestMsg>(&message)
            .unwrap();

        assert_eq!(response.f1, 1);
        assert_eq!(response.f2, "true");
    }

    #[test]
    fn test_invoke_message_roundtrip_toobig() {
        let long_string = {
            let mut value = String::new();
            for _ in 0..MessageFn::DEFAULT_RESPONSE_BUFFER_SIZE {
                value.push_str("na");
            }

            value
        };

        let message = TestMsg {
            f1: 12,
            f2: long_string.clone(),
        };
        let response = MESSAGE_FN
            .invoke_json::<TestMsg, TestMsg>(&message)
            .unwrap();

        assert_eq!(response.f1, 12);
        assert_eq!(response.f2, long_string);
    }

    extern "C" fn test_stream_read(handle: Size, out_ptr: Ptr, out_len: Size) -> ResultRepr {
        if handle == 123 {
            let data: [u8; 10] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            let to_write = out_len.min(data.len());

            let out_ptr = out_ptr as *mut u8;
            for (i, byte) in data.into_iter().take(to_write).enumerate() {
                unsafe { out_ptr.add(i).write(byte) };
            }

            return AbiResult::Ok(to_write).into();
        }

        return AbiResult::Err(handle).into();
    }
    extern "C" fn test_stream_write(handle: Size, in_ptr: Ptr, in_len: Size) -> ResultRepr {
        if handle == 124 {
            let mut buffer = [0u8; 10];
            let to_read = in_len.min(buffer.len());

            let in_ptr = in_ptr as *const u8;
            for i in 0..to_read {
                buffer[i] = unsafe { in_ptr.add(i).read() };
            }

            return AbiResult::Ok(to_read).into();
        }

        return AbiResult::Err(handle).into();
    }
    extern "C" fn test_stream_close(handle: Size) -> ResultRepr {
        if handle == 124 {
            return AbiResult::Ok(0).into();
        }

        return AbiResult::Err(handle).into();
    }
    const STREAM_IO: StreamFn =
        unsafe { StreamFn::new(test_stream_read, test_stream_write, test_stream_close) };

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
