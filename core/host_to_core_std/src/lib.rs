//! # Host <-> Core communication
//!
//! This can be understood as the standard library provided by Host to the Core.

/// Defines message exchange initiated from core to the host.
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
macro_rules! define_exchange_core_to_host {
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
        #[derive(Debug, Serialize)]
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

            pub fn send_json_in<E: $crate::abi::MessageExchange>(&self, message_exchange: E) -> Result<$response_name, $crate::abi::JsonMessageError> {
                message_exchange.invoke_json(self)
            }
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

use std::collections::HashMap;

pub mod abi;
pub mod unstable;

pub type MultiMap = HashMap<String, Vec<String>>;
// TODO: consider making the key always lowercase at the type level somehow
pub type HeadersList = Vec<(String, String)>;

pub fn lowercase_headers_multimap(map: MultiMap) -> MultiMap {
    map.into_iter()
        .map(|(key, value)| (key.to_lowercase(), value))
        .collect()
}

pub fn encode_query(query: &MultiMap) -> String {
    let mut pairs = Vec::<(&str, &str)>::new();

    for (key, values) in query.iter() {
        for value in values {
            pairs.push((key, value));
        }
    }

    serde_urlencoded::to_string(&pairs).unwrap()
}
