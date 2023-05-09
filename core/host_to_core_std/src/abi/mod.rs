//! # Superface `host <-> core` ABI conventions
//!
//! Data of known size is transferred using messages, while data of unknown size is transferred using streams.
//!
//! ## Messages
//!
//! Messages are byte sequences of length known during transmission. Boundary functions which require complex arguments and return
//! values exchange messages. The ABI representation is identical to strings - `(ptr, len)` pair. To receive the response message,
//! the caller must pass a destination buffer.
//!
//! However, it cannot know the size of the message up front. If the response is longer than the buffer provided to the call, the response
//! is stored by the callee and the function returns the size of the message and a handle.
//! This handle can be used to retrieve the message with a second call. By selecting a reasonable buffer size, the caller can avoid
//! most secondary calls.
//!
//! The format of messages is UTF-8 JSON.
//!
//! ## Streams
//!
//! Streams are byte sequences of unknown length. They use POSIX-style `read` and `write` functions to transfer data with ABI
//! taken from WASI `fd_read` and `fd_write`. See <https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_read>.

mod bits;
mod exchange;
mod result;

pub use self::{
    bits::{AbiPair, AbiPairRepr, Handle, Ptr, Size},
    exchange::{
        JsonMessageError, MessageExchange, MessageExchangeFfiFn, StaticMessageExchange,
        StaticStreamExchange, StreamExchange, StreamExchangeFfiFn,
    },
    result::{err_from_wasi_errno, AbiResult, AbiResultRepr},
};

#[cfg(test)]
pub use exchange::testing;
