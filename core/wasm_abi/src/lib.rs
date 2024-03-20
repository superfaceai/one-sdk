//! # Superface `host <-> guest` ABI conventions
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
        message_exchange_invoke_json, JsonMessageError, MessageExchange, MessageExchangeFfiFn,
        StaticMessageExchange, StaticStreamExchange, StreamExchange, StreamExchangeFfiFn,
    },
    result::{err_from_wasi_errno, AbiResult, AbiResultRepr},
};

pub use exchange::testing;
pub use serde;

/// Defines message exchange initiated from the guest to the host.
///
/// Defines a struct with given fields and possibly lifetimes. Allows attributes (including doc comments) on
/// the struct and its fields. Defines a response enum with newtype or struct variants and kebab-case kind.
///
/// Defines a `new` method which automatically fills `kind` field.
/// Implements trait `MessageExchange`.
///
/// For example, the following defines `InMessage` with kind `my-kind` and two fields and defines a response `OutMessage` enum with three
/// variants with kinds `ok`, `try-again`, and `err`, each with different number of fields.
/// ```
/// define_exchange_core_to_host! {
///     struct InMessage<'a> {
///         kind: "my-kind",
///         foo: &'a str,
///         bar: u32
///     } -> enum OutMessage {
///         // "kind": "ok"
///         Ok {
///            baz: String,
///            bar: f32
///         },
///         // "kind": "try-again"
///         TryAgain,
///         // "kind": "err"
///         Err {
///             error: String
///         }
///     }
/// }
/// ```
#[macro_export]
macro_rules! define_exchange {
    (
        $( #[$in_attr: meta] )*
        struct $name: ident $(<$life: lifetime>)? {
            kind: $kind: literal
            $(
                ,
                $( #[$in_field_attr: meta] )*
                $field_name: ident : $field_type: ty
            )* $(,)?
        } ->
        $( #[$out_attr: meta] )*
        enum $response_name: ident {
            $(
                $( #[$out_variant_attr: meta] )*
                $variant_name: ident $({
                    $( $( #[$out_field_attr: meta] )* $variant_field_name: ident : $variant_field_type: ty ),+ $(,)?
                })?
            ),+ $(,)?
        }
    ) => {
        $( #[$in_attr] )*
        #[derive(Debug, $crate::serde::Serialize)]
        #[serde(crate = "wasm_abi::serde")] // the best way would be if it was possible to do stringify!($crate::serde)
        struct $name $(<$life>)? {
            kind: &'static str,
            $(
                $( #[$in_field_attr] )*
                $field_name: $field_type
            ),*
        }
        impl $(<$life>)? $name $(<$life>)? {
            pub const KIND: &'static str = $kind;

            #[allow(unused)]
            pub fn new(
                $( $field_name: $field_type ),*
            ) -> Self {
                Self {
                    kind: Self::KIND,
                    $( $field_name ),*
                }
            }

            pub fn send_json_in<E: $crate::MessageExchange>(&self, message_exchange: E) -> Result<$response_name, $crate::JsonMessageError> {
                $crate::message_exchange_invoke_json(message_exchange, self)
            }
        }

        $( #[$out_attr] )*
        #[derive(Debug, $crate::serde::Deserialize)]
        #[serde(crate = "wasm_abi::serde")]
        #[serde(tag = "kind")]
        #[serde(rename_all = "kebab-case")]
        enum $response_name {
            $(
                $( #[$out_variant_attr] )*
                $variant_name $({
                    $( $( #[$out_field_attr] )* $variant_field_name : $variant_field_type ),+
                })?
            ),+
        }
    };
}
