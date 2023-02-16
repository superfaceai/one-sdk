//! # Host <-> Core communication
//!
//! This can be understood as the standard library provided by Host to the Core.

/// Macro which defines the message exchange.
///
/// Defines a struct with given fields and possibly lifetimes. Allows attributes (including doc comments) on
/// the struct and its fields. Defines a response enum with newtype or struct variants and kebab-case kind.
///
/// Defines a `new` method which automatically fills `kind` field.
/// Defines a convenience `send_json` method which ties the message with its response.
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
///         Ok {
///            baz: String,
///            bar: f32
///         },
///         TryAgain,
///         Err {
///             error: String
///         }
///     }
/// }
/// ```
macro_rules! define_exchange {
    (
        $( #[$in_attr: meta] )*
        struct $name: ident $(< $($lifetimes: lifetime),+ $(,)?>)? {
            kind: $kind: literal,
            $(
                $( #[$in_field_attr: meta] )*
                $field_name: ident : $field_type: ty
            ),+ $(,)?
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
        #[derive(Serialize)]
        struct $name $(< $($lifetimes),+ >)? {
            kind: &'static str,
            $(
                $( #[$in_field_attr] )*
                $field_name: $field_type
            ),+
        }
        impl $(< $($lifetimes),+ >)? $name $(< $($lifetimes),+ >)? {
            pub const KIND: &'static str = $kind;

            pub fn new(
                $( $field_name: $field_type ),+
            ) -> Self {
                Self {
                    kind: Self::KIND,
                    $( $field_name ),+
                }
            }

            pub fn send_json(&self, fun: &$crate::sf_abi::MessageFn) -> Result<$response_name, $crate::sf_abi::InvokeJsonMessageError> {
                fun.invoke_json(self)
            }
        }

        $( #[$out_attr] )*
        #[derive(Deserialize)]
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

/// Unstable functions provide no stability guarantees.
pub mod unstable {
    use std::{collections::HashMap, fmt::Write};

    use serde::{Deserialize, Serialize};

    use crate::sf_abi;
    use sf_abi::bits::{Ptr, Size};

    pub fn http_get(url: &str, headers: &[[&str; 2]]) -> usize {
        let mut headers_str = String::new();
        for [key, value] in headers {
            write!(&mut headers_str, "{key}:{value}\n").unwrap();
        }

        unsafe {
            __import_http_get(
                url.as_ptr() as i32,
                url.len() as i32,
                headers_str.as_ptr() as i32,
                headers_str.len() as i32,
            ) as usize
        }
    }
    pub fn http_response_read(handle: usize, out: &mut [u8]) -> usize {
        unsafe {
            __import_http_response_read(handle as i32, out.as_mut_ptr() as i32, out.len() as i32)
                as usize
        }
    }
    #[link(wasm_import_module = "sf_host_unstable")]
    extern "C" {
        #[link_name = "http_get"]
        fn __import_http_get(url_ptr: i32, url_len: i32, headers_ptr: i32, headers_len: i32)
            -> i32;

        #[link_name = "http_response_read"]
        fn __import_http_response_read(handle: i32, out_ptr: i32, out_len: i32) -> i32;
    }

    pub struct HttpCall {
        pub response_handle: usize,
        pub request_body: Option<WriteStream>,
    }
    /// Initiates an HTTP call.
    ///
    /// Returns a handle which can be used with [http_call_retrieve_head].
    pub fn http_call(url: &str, method: &str, headers: &HashMap<String, Vec<String>>) -> HttpCall {
        let response = InHttpCall {
            kind: InHttpCall::KIND,
            url,
            method,
            headers,
            want_body: false,
        }
        .send_json(&EXCHANGE_MESSAGE)
        .unwrap();

        match response {
            OutHttpCall::Ok {
                request_body_handle,
                response_handle,
            } => HttpCall {
                response_handle,
                request_body: request_body_handle.map(WriteStream),
            },
            // TOOD: propagate out
            OutHttpCall::Err { error } => panic!("HttpCall error: {}", error),
        }
    }

    pub struct HttpCallHead {
        pub status: u16,
        pub headers: HashMap<String, Vec<String>>,
        pub body: ReadStream,
    }
    /// Retrieve the head of HTTP call response.
    ///
    /// Takes the handle obtained from [http_call] and returns the head of the reponse.
    /// If the response has a body a stream is opened and its handle is returned.
    pub fn http_call_retrieve_head(response_handle: usize) -> HttpCallHead {
        let response = InHttpCallRetrieveHead::new(response_handle as usize)
            .send_json(&EXCHANGE_MESSAGE)
            .unwrap();

        match response {
            OutHttpCallRetrieveHead::Ok {
                status,
                headers,
                body_handle,
            } => HttpCallHead {
                status,
                headers,
                body: ReadStream(body_handle),
            },
            // TODO: propagate out
            OutHttpCallRetrieveHead::Err { error } => {
                panic!("HttpCallRetrieveHead error: {}", error)
            }
        }
    }

    //////////////
    // MESSAGES //
    //////////////

    // SAFETY: We choose to trust this FFI.
    const EXCHANGE_MESSAGE: sf_abi::MessageFn = unsafe {
        sf_abi::MessageFn::new(
            __import_message_exchange,
            __import_message_exchange_retrieve,
        )
    };
    #[link(wasm_import_module = "sf_host_unstable")]
    extern "C" {
        #[link_name = "message_exchange"]
        fn __import_message_exchange(
            msg_ptr: Ptr,
            msg_len: Size,
            out_ptr: Ptr,
            out_len: Size,
        ) -> sf_abi::bits::PairRepr;

        #[link_name = "message_exchange_retrieve"]
        fn __import_message_exchange_retrieve(
            handle: Size,
            out_ptr: Ptr,
            out_len: Size,
        ) -> sf_abi::error::ResultRepr;
    }

    define_exchange! {
        struct InHttpCall<'a> {
            kind: "http-call",
            url: &'a str,
            method: &'a str,
            headers: &'a HashMap<String, Vec<String>>,
            /// Whether to open a writable body stream to send with the request.
            want_body: bool
        } -> enum OutHttpCall {
            Ok {
                #[serde(default)]
                request_body_handle: Option<Size>,
                response_handle: Size,
            },
            Err {
                error: String
            }
        }
    }
    define_exchange! {
        struct InHttpCallRetrieveHead {
            kind: "http-call-head",
            response_handle: Size
        } -> enum OutHttpCallRetrieveHead {
            Ok {
                status: u16,
                headers: HashMap<String, Vec<String>>,
                body_handle: Size, // TODO: optional?
            },
            Err {
                error: String
            }
        }
    }

    /////////////
    // STREMAS //
    /////////////

    /// Stream which can be read from.
    pub struct ReadStream(Size);
    impl std::io::Read for ReadStream {
        fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
            todo!()
        }
    }
    /// Stream which can be written to.
    pub struct WriteStream(Size);
    impl std::io::Write for WriteStream {
        fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
            todo!()
        }

        fn flush(&mut self) -> std::io::Result<()> {
            todo!()
        }
    }
}
