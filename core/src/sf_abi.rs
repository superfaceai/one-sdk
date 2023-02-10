//! # Superface ABI conventions
//!
//! These conventions apply both to the communication between the `host <-> core` as well as `core <-> map`.
//! Data of known size is transferred using messages, while data of unknown size is transferred using streams.
//!
//! ## Messages
//!
//! Messages are byte sequences of length known during transmission. Boundary functions which require complex arguments and return
//! values exchange messages. The ABI representation is identical to strings - `(ptr, len)` pair. To receive the response message,
//! the caller must pass a destination buffer.
//!
//! However, it cannot know the size of the message up front. If the response is longer than the buffer provided to the call, the response
//! is stored by the callee and the function returns the size of the message and a handle:
//! `i64` with lower 32 bits the size and upper 32 bits as the handle.
//! This handle can be used to retrieve the message with a second call. By selecting a reasonable buffer size, the caller can avoid
//! most secondary calls.
//!
//! The format of messages is UTF-8 JSON.
//!
//! ## Streams
//!
//! Streams are byte sequences of unknown length. They use POSIX-style `read` and `write` functions to transfer data with ABI
//! taken from WASI `fd_read` and `fd_write`. See https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_read.

use std::io;

use serde::{de::DeserializeOwned, Serialize};
use thiserror::Error;

/// Type for `i64` rerepsenting a `(i32, i32)`.
struct AbiResultTuple(u32, u32);
impl From<i64> for AbiResultTuple {
    fn from(value: i64) -> Self {
        // to avoid unwanted sign extension
        let input = value as u64;

        let lower = (input & 0xFFFFFFFF) as u32;
        let upper = (input >> 32) as u32;

        Self(lower, upper)
    }
}
impl From<AbiResultTuple> for i64 {
    fn from(value: AbiResultTuple) -> Self {
        let lower = value.0 as u64;
        let upper = (value.1 as u64) << 32;

        let output = lower | upper;

        output as i64
    }
}

/// Type for `i64` representing a `Result<i32, i32>`.
enum AbiResultEnum {
    Ok(i32),
    Err(i32),
}
impl AbiResultEnum {
    const TAG_OK: u32 = 0;
    const TAG_ERR: u32 = 1;

    pub fn to_io_result(self) -> io::Result<i32> {
        match self {
            Self::Ok(v) => Ok(v),
            Self::Err(errno) => Err(errno::errno_to_io_error_kind(errno).into()),
        }
    }
}
impl From<i64> for AbiResultEnum {
    fn from(value: i64) -> Self {
        let AbiResultTuple(tag, value) = AbiResultTuple::from(value);

        match tag {
            Self::TAG_OK => Self::Ok(value as i32),
            Self::TAG_ERR => Self::Err(value as i32),
            _ => unreachable!(),
        }
    }
}
impl From<AbiResultEnum> for i64 {
    fn from(value: AbiResultEnum) -> Self {
        match value {
            AbiResultEnum::Ok(value) => AbiResultTuple(AbiResultEnum::TAG_OK, value as u32),
            AbiResultEnum::Err(value) => AbiResultTuple(AbiResultEnum::TAG_ERR, value as u32),
        }
        .into()
    }
}

mod errno {
    //! WASI errno definitions.
    //!
    //! See https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-errno-variant.

    pub fn errno_to_io_error_kind(errno: i32) -> std::io::ErrorKind {
        todo!()
    }
}

#[derive(Debug, Error)]
pub enum InvokeJsonMessageError {
    #[error("Failed to serialize message: {0}")]
    SerializeError(serde_json::Error),
    #[error("Failed to deserialize message: {0}")]
    DeserializeError(serde_json::Error),
}

pub struct MessageFn {
    /// Send message and get response or handle to stored response.
    ///
    /// `fn(msg_ptr, msg_len, out_ptr, out_len) -> (size, handle)`
    exchange_fn: fn(i32, i32, i32, i32) -> i64,
    /// Retrieve stored response message.
    ///
    /// `fn(handle, out_ptr, out_len) -> Result<size, errno>`
    retrieve_fn: fn(i32, i32, i32) -> i64,
}
impl MessageFn {
    const DEFAULT_RESPONSE_BUFFER_SIZE: usize = 256;

    pub const fn new(
        exchange_fn: fn(i32, i32, i32, i32) -> i64,
        retrieve_fn: fn(i32, i32, i32) -> i64,
    ) -> Self {
        Self {
            exchange_fn,
            retrieve_fn,
        }
    }

    /// Send a message to `self.exchange_fn` and retrieve response, calling `self.retrieve_fn` only if the response doesn't fit into the initial buffer.
    pub fn invoke(&self, message: &[u8]) -> Vec<u8> {
        let mut response_buffer = Vec::<u8>::with_capacity(Self::DEFAULT_RESPONSE_BUFFER_SIZE);

        let AbiResultTuple(result_size, result_handle) = {
            let msg_ptr = message.as_ptr() as i32;
            let msg_len = message.len() as i32;

            let out_ptr = response_buffer.as_mut_ptr() as i32;
            let out_len = response_buffer.capacity() as i32;

            (self.exchange_fn)(msg_ptr, msg_len, out_ptr, out_len)
        }
        .into();
        let result_size = result_size as usize;
        let result_handle = result_handle as i32;

        if result_size > response_buffer.capacity() {
            // response buffer was too small, we must retrieve the message with a second function call
            // extend to at least result_size
            response_buffer.reserve(result_size);

            let result: AbiResultEnum = {
                let out_ptr = response_buffer.as_mut_ptr() as i32;
                let out_len = response_buffer.capacity() as i32;

                (self.retrieve_fn)(result_handle, out_ptr, out_len)
            }
            .into();

            match result.to_io_result() {
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
    ) -> Result<R, InvokeJsonMessageError> {
        let json_message =
            serde_json::to_string(message).map_err(InvokeJsonMessageError::SerializeError)?;

        let response = self.invoke(json_message.as_bytes());

        let response = serde_json::from_slice(response.as_slice())
            .map_err(InvokeJsonMessageError::DeserializeError)?;

        Ok(response)
    }
}

pub struct StreamFn {
    /// Read up to `out_len` bytes from stream at `handle`, return number of read bytes.
    ///
    /// `fn(handle, out_ptr, out_len) -> Result<read, errno>`
    read_fn: fn(i32, i32, i32) -> i64,
    /// Write up to `in_len` bytes to stream at `handle`, return number of written bytes.
    ///
    /// `fn(handle, in_ptr, in_len) -> Result<written, errno>`
    write_fn: fn(i32, i32, i32) -> i64,
    /// Close stream at `handle`, signalling it will not be read from or written to again.
    ///
    /// `fn(handle) -> Result<(), errno>`
    close_fn: fn(i32) -> i64,
}
impl StreamFn {
    pub const fn new(
        read_fn: fn(i32, i32, i32) -> i64,
        write_fn: fn(i32, i32, i32) -> i64,
        close_fn: fn(i32) -> i64,
    ) -> Self {
        Self {
            read_fn,
            write_fn,
            close_fn,
        }
    }

    pub fn read(&self, handle: i32, buf: &mut [u8]) -> io::Result<usize> {
        let out_ptr = buf.as_mut_ptr() as i32;
        let out_len = buf.len() as i32;

        let result: AbiResultEnum = (self.read_fn)(handle, out_ptr, out_len).into();

        result.to_io_result().map(|read| read as usize)
    }

    pub fn write(&self, handle: i32, buf: &[u8]) -> io::Result<usize> {
        let in_ptr = buf.as_ptr() as i32;
        let in_len = buf.len() as i32;

        let result: AbiResultEnum = (self.write_fn)(handle, in_ptr, in_len).into();

        result.to_io_result().map(|written| written as usize)
    }

    pub fn close(&self, handle: i32) -> io::Result<()> {
        let result: AbiResultEnum = (self.close_fn)(handle).into();

        result.to_io_result().map(|_| ())
    }
}

#[cfg(test)]
mod test {
    use serde::{Deserialize, Serialize};

    use super::{AbiResultEnum, AbiResultTuple, MessageFn};

    #[derive(Serialize, Deserialize)]
    struct TestMsg {
        f1: u32,
        f2: String,
    }

    const MESSAGE_FN: MessageFn = {
        // very simple message storage - only for testing and only in single-threaded context (WASM)
        static mut STORED_MESSAGES: Vec<(i32, String)> = Vec::new();
        static mut STORED_MESSAGED_ID: i32 = 1;
        fn test_message_target_fn(msg_ptr: i32, msg_len: i32, out_ptr: i32, out_len: i32) -> i64 {
            let msg_bytes = unsafe {
                std::slice::from_raw_parts(msg_ptr as usize as *const u8, msg_len as usize)
            };
            let msg: TestMsg = serde_json::from_slice(msg_bytes).unwrap();

            let result = serde_json::to_string(&msg).unwrap();
            let result_len = result.len();

            let handle = if result_len > out_len as usize {
                // store the message, generate the handle
                unsafe {
                    let handle = STORED_MESSAGED_ID;
                    STORED_MESSAGED_ID += 1;
                    STORED_MESSAGES.push((handle, result));

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

            AbiResultTuple(result_len as u32, handle as u32).into()
        }
        fn test_message_retrieve_fn(handle: i32, out_ptr: i32, out_len: i32) -> i64 {
            let index = unsafe {
                STORED_MESSAGES
                    .iter()
                    .enumerate()
                    .find_map(|(index, (h, _))| (handle == *h).then_some(index))
            };

            match index {
                None => AbiResultEnum::Err(1),
                Some(index) => {
                    let msg = unsafe { STORED_MESSAGES.swap_remove(index) }.1;

                    let out_ptr = out_ptr as *mut u8;
                    for (i, byte) in msg.as_bytes().iter().enumerate().take(out_len as usize) {
                        unsafe { out_ptr.add(i).write(*byte) };
                    }

                    AbiResultEnum::Ok(msg.len() as i32)
                }
            }
            .into()
        }

        MessageFn::new(test_message_target_fn, test_message_retrieve_fn)
    };

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

    #[test]
    fn test_invoke_stream() {}
}
