/// Macro which defines the message exchange.
macro_rules! define_exchange {
    (
        $name: ident $(< $($lifetimes: lifetime),+ $(,)?>)? {
            kind: $kind: literal,
            $(
                $field_name: ident : $field_type: ty
            ),+ $(,)?
        } -> $response: ty
    ) => {
        // we create an enum here, but only to gain automatic kind in conjunction with `#[tag = "kind"]` to get internally tagged enum.
        //
        // See https://serde.rs/enum-representations.html#internally-tagged.
        #[derive(Serialize)]
        #[serde(tag = "kind")]
        enum $name $(< $($lifetimes),+ >)? {
            // The name V doesn't matter as we are renaming it for serialization purposes
            #[serde(rename = $kind)]
            V {
                $(
                    $field_name: $field_type
                ),+
            }
        }
        impl $(< $($lifetimes),+ >)? $name $(< $($lifetimes),+ >)? {
            pub fn new(
                $( $field_name: $field_type ),+
            ) -> Self {
                Self::V { $( $field_name ),+ }
            }

            pub fn send_json(&self, fun: &$crate::sf_abi::MessageFn) -> Result<$response, $crate::sf_abi::InvokeJsonMessageError> {
                fun.invoke_json(self)
            }
        }
    };
}

pub mod unstable {
    use std::{collections::HashMap, fmt::Write};

    use serde::{Deserialize, Serialize};

    use crate::sf_abi;
    use sf_abi::bits::{Ptr, Size};

    pub type HttpHandle = u32;
    pub fn http_get(url: &str, headers: &[[&str; 2]]) -> HttpHandle {
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
            ) as u32
        }
    }
    pub fn http_response_read(handle: HttpHandle, out: &mut [u8]) -> usize {
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

    // #[derive(Serialize)]
    // struct MessageHttpCallInitiate<'a> {
    //     kind: &'static str,
    //     url: &'a str,
    //     method: &'a str,
    //     headers: &'a [[&'a str; 2]]
    // }
    // impl MessageHttpCallInitiate<'_> {
    //     const KIND: &'static str = "http-call";
    // }

    define_exchange! {
        MessageHttpCallInitiate<'a> {
            kind: "http-call",
            url: &'a str,
            method: &'a str,
            headers: &'a HashMap<String, Vec<String>>
        } -> ResponseHttpCallInitiate
    }
    #[derive(Debug, Deserialize)]
    struct ResponseHttpCallInitiate {
        #[serde(default)]
        request_body_handle: Option<Size>,
        response_handle: Size,
    }

    define_exchange! {
        MessageHttpCallRetrieveHead {
            kind: "http-call-head",
            handle: Size
        } -> ResponseHttpCallRetrieveHead
    }
    #[derive(Debug, Deserialize)]
    struct ResponseHttpCallRetrieveHead {
        headers: HashMap<String, Vec<String>>,
        body_handle: Size,
    }

    pub fn http_call(url: &str, method: &str, headers: &HashMap<String, Vec<String>>) -> u32 {
        let message = MessageHttpCallInitiate::new(url, method, headers);

        let response = message.send_json(&EXCHANGE_MESSAGE).unwrap();

        eprintln!("Response: {:?}", response);
        response.response_handle as u32
    }
    pub fn http_call_retrieve_head(handle: u32) -> () {}

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
}
