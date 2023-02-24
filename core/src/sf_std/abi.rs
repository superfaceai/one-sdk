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
//! taken from WASI `fd_read` and `fd_write`. See <https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#fd_read>.

pub mod bits {
    //! Here we define bit sizes of types we need.
    //!
    //! We can mostly rely on rust `usize` which is both pointer- and `size_t`-sized.
    //! We use unsigned types to avoid sign extension trouble.
    //!
    //! These definitions also allow us to compile tests on 64-bit platforms without breaking.

    /// ABI pointer-sized type.
    pub type Ptr = usize;
    /// ABI `size_t`-sized type.
    ///
    /// See <https://en.cppreference.com/w/c/types/size_t>.
    pub type Size = usize;
    /// ABI pair representation.
    ///
    /// The actual type used in FFI to represent a pair.
    pub type PairRepr = u64;

    /// Struct representing a pair of `(Size, Size)` in ABI.
    ///
    /// On 32-bit platforms we rely on using `i64` to store two `i32`s. However since `u128` is not
    /// FFI-safe, we cannot do the same thing on 64bit platforms (x86_64, wasm64, aarch64), so we split
    /// 64 bits to 48/16. This is __usually__ right since sizes are not expected to be greater than 48 bits in practice, and
    /// we do not transfer pointers using these pairs.
    pub struct AbiPair(pub Size, pub Size);
    impl AbiPair {
        #[cfg(target_pointer_width = "32")]
        const LOWER_BITS: usize = 32;
        #[cfg(target_pointer_width = "64")]
        const LOWER_BITS: usize = 48;
        const LOWER_MASK: PairRepr = ((1 as PairRepr) << Self::LOWER_BITS) - 1;
    }
    impl From<PairRepr> for AbiPair {
        fn from(value: PairRepr) -> Self {
            let lower = (value & Self::LOWER_MASK) as Size;
            let upper = (value >> Self::LOWER_BITS) as Size;

            Self(lower, upper)
        }
    }
    impl From<AbiPair> for PairRepr {
        fn from(pair: AbiPair) -> Self {
            let lower = pair.0 as PairRepr;
            let upper = (pair.1 as PairRepr) << AbiPair::LOWER_BITS;

            lower | upper
        }
    }
    impl std::fmt::Debug for AbiPair {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "AbiPair(lower: {}, upper: {})", self.0, self.1)
        }
    }
}

pub mod result {
    //! WASI errno definitions.
    //!
    //! See <https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-errno-variant>.

    use super::bits;

    /// ABI result representation.
    ///
    /// The actual type used in FFI to represent result enum.
    pub type ResultRepr = bits::PairRepr;

    /// Enum representing a `Result<Size>` in ABI.
    ///
    /// This is represented as a pair of `(value, tag)` - tag is smaller than the value on 64-bit platforms.
    pub enum AbiResult {
        Ok(bits::Size),
        Err(bits::Size),
    }
    impl AbiResult {
        const TAG_OK: bits::Size = 0;
        const TAG_ERR: bits::Size = 1;

        pub fn into_io_result(self) -> std::io::Result<bits::Size> {
            match self {
                Self::Ok(value) => Ok(value),
                Self::Err(err) => Err(from_wasi_errno(err)),
            }
        }
    }
    impl From<ResultRepr> for AbiResult {
        fn from(value: ResultRepr) -> Self {
            let bits::AbiPair(value, tag) = bits::AbiPair::from(value);

            match tag {
                Self::TAG_OK => Self::Ok(value),
                Self::TAG_ERR => Self::Err(value),
                _ => panic!("Invalid tag {} for AbiResult", tag),
            }
        }
    }
    impl From<AbiResult> for ResultRepr {
        fn from(value: AbiResult) -> Self {
            match value {
                AbiResult::Ok(value) => bits::AbiPair(value, AbiResult::TAG_OK),
                AbiResult::Err(value) => bits::AbiPair(value, AbiResult::TAG_ERR),
            }
            .into()
        }
    }

    pub fn from_wasi_errno(errno: bits::Size) -> std::io::Error {
        std::io::Error::from_raw_os_error(errno as i32)
    }
}

use thiserror::Error;

#[derive(Debug, Error)]
pub enum JsonMessageError {
    #[error("Failed to serialize message: {0}")]
    SerializeError(serde_json::Error),
    #[error("Failed to deserialize message: {0}")]
    DeserializeError(serde_json::Error),
}

pub use self::{
    bits::{AbiPair, PairRepr, Ptr, Size},
    result::{AbiResult, ResultRepr},
};
