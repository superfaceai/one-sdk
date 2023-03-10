//! # Host <-> Core communication
//!
//! This can be understood as the standard library provided by Host to the Core.

/// Defines message exchanged initiated from core to the host.
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
/// define_exchange! {
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
macro_rules! define_exchange_core_to_host {
    (
        $( #[$in_attr: meta] )*
        struct $name: ident $(< $($lifetimes: lifetime),+ $(,)?>)? {
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
        #[derive(Debug, Serialize)]
        struct $name $(< $($lifetimes),+ >)? {
            kind: &'static str,
            $(
                $( #[$in_field_attr] )*
                $field_name: $field_type
            ),*
        }
        impl $(< $($lifetimes),+ >)? $name $(< $($lifetimes),+ >)? {
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
        }
        impl $(< $($lifetimes),+ >)? $crate::sf_std::host_to_core::MessageExchange for $name $(< $($lifetimes),+ >)? {
            type Response = $response_name;
        }

        $( #[$out_attr] )*
        #[derive(Debug, Deserialize)]
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

use serde::{de::DeserializeOwned, Serialize};

use super::abi::JsonMessageError;
use abi::MessageFn;

trait MessageExchange: Sized + Serialize {
    type Response: DeserializeOwned;

    /// Convenience for invoking `fun` and expecting `Self::Response`.
    fn send_json(&self, fun: &MessageFn) -> Result<Self::Response, JsonMessageError> {
        fun.invoke_json(self)
    }
}

pub mod abi;
pub mod unstable;
