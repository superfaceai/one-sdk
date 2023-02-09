//! # Superface ABI conventions
//!
//! These conventions apply both to the communication between the `host <-> core` as well as `core <-> map`.
//! Data of known size is transferred using messages, while data of unknown size is transferred using streams.
//!
//! ## Messages
//!
//! Messages are UTF-8 JSON strings. Boundary functions which require complex arguments and return values exchange messages.
//! The ABI representation is identical to strings - `(ptr, len)` pair. To receive the response message, the caller must pass
//! a destination string.
//!
//! However, it cannot know the size of the message up front. If the response is longer than the buffer
//! provided to the call, the response is stored by the callee and the function returns the size of the message and a handle.
//! This handle can be used to retrieve the message with a second call. By selecting a reasonable buffer size, the caller can avoid
//! most secondary calls.

use serde::{de::DeserializeOwned, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum InvokeMessageError {
    #[error("Failed to serialize message: {0}")]
    SerializeError(serde_json::Error),
    #[error("Failed to deserialize message: {0}")]
    DeserializeError(serde_json::Error),
}

const DEFAULT_RESPONSE_BUFFER_SIZE: usize = 256;

/// Sends a message to `target_fn` and retrieve response, calling `retrieve_fn` only if the initial response doesn't fit into the default buffer.
///
/// The messages are serialized to JSON and transferred as (ptr, len) pairs.
///
/// If the response buffer is too small the target function must return a handle which can be used with the retrieve function
/// to retrieve the message.
pub fn invoke_message<M: Serialize, R: DeserializeOwned>(
    target_fn: fn(i32, i32, i32, i32) -> i64,
    retrieve_fn: fn(i32, i32, i32) -> i32,
    message: &M,
) -> Result<R, InvokeMessageError> {
    let json_message =
        serde_json::to_string(message).map_err(InvokeMessageError::SerializeError)?;
    let mut response_buffer = Vec::<u8>::with_capacity(DEFAULT_RESPONSE_BUFFER_SIZE);

    let result = {
        let msg_ptr = json_message.as_ptr() as i32;
        let msg_len = json_message.len() as i32;

        let out_ptr = response_buffer.as_mut_ptr() as i32;
        let out_len = response_buffer.capacity() as i32;

        target_fn(msg_ptr, msg_len, out_ptr, out_len) as u64
    };

    let result_size = (result & 0xFFFFFFFF) as usize;
    let result_handle = (result >> 32) as i32;
    if result_size > response_buffer.capacity() {
        // response buffer was too small, we must retrieve the message with a second function call
        // extend to at least result_size
        response_buffer.reserve(result_size);

        let written = {
            let out_ptr = response_buffer.as_mut_ptr() as i32;
            let out_len = response_buffer.capacity() as i32;

            retrieve_fn(result_handle, out_ptr, out_len) as usize
        };
        debug_assert_eq!(written, result_size);
    };

    // SAFETY: we never take more than capacity
    unsafe { response_buffer.set_len(response_buffer.capacity().min(result_size)) };
    let response =
        serde_json::from_slice(&response_buffer).map_err(InvokeMessageError::DeserializeError)?;

    Ok(response)
}

// #[cfg(test)]
mod test {
    use serde::{Deserialize, Serialize};

    use super::{invoke_message, DEFAULT_RESPONSE_BUFFER_SIZE};

    #[derive(Serialize, Deserialize)]
    struct TestMsg {
        f1: u32,
        f2: String,
    }

    static mut STORED_MESSAGES: Vec<(i32, String)> = Vec::new();
    fn test_target_fn(msg_ptr: i32, msg_len: i32, out_ptr: i32, out_len: i32) -> i64 {
        let msg_bytes =
            unsafe { std::slice::from_raw_parts(msg_ptr as usize as *const u8, msg_len as usize) };
        let msg: TestMsg = serde_json::from_slice(msg_bytes).unwrap();

        let result = serde_json::to_string(&msg).unwrap();
        let result_len = result.len();

        let handle = if result_len > out_len as usize {
            unsafe {
                let handle = (STORED_MESSAGES.len() + 1) as i32;
                STORED_MESSAGES.push((handle, result));

                handle
            }
        } else {
            let out_ptr = out_ptr as *mut u8;
            for (i, byte) in result.as_bytes().iter().enumerate() {
                unsafe { out_ptr.add(i).write(*byte) };
            }

            0
        };

        (((handle as u64) << 32) | (result_len as u64 & 0xFFFFFFFF)) as i64
    }
    fn test_retrieve_fn(handle: i32, out_ptr: i32, out_len: i32) -> i32 {
        let index = unsafe {
            STORED_MESSAGES
                .iter()
                .enumerate()
                .find_map(|(index, (h, _))| (handle == *h).then_some(index))
        };

        match index {
            None => 0,
            Some(index) => {
                let msg = unsafe { STORED_MESSAGES.swap_remove(index) }.1;

                let out_ptr = out_ptr as *mut u8;
                for (i, byte) in msg.as_bytes().iter().enumerate().take(out_len as usize) {
                    unsafe { out_ptr.add(i).write(*byte) };
                }

                msg.len() as i32
            }
        }
    }

    #[test]
    fn test_invoke_message_roundtrip() {
        let message = TestMsg {
            f1: 1,
            f2: "true".to_string(),
        };
        let response =
            invoke_message::<TestMsg, TestMsg>(test_target_fn, test_retrieve_fn, &message).unwrap();

        assert_eq!(response.f1, 1);
        assert_eq!(response.f2, "true");
    }

    #[test]
    fn test_invoke_message_roundtrip_toobig() {
        let long_string = {
            let mut value = String::new();
            for _ in 0..DEFAULT_RESPONSE_BUFFER_SIZE {
                value.push_str("na");
            }

            value
        };

        let message = TestMsg {
            f1: 1,
            f2: long_string.clone(),
        };
        let response =
            invoke_message::<TestMsg, TestMsg>(test_target_fn, test_retrieve_fn, &message).unwrap();

        assert_eq!(response.f1, 1);
        assert_eq!(response.f2, long_string);
    }
}
