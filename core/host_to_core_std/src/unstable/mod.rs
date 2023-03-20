//! Unstable functions provide no stability guarantees

use super::MessageExchange;
use crate::abi::{AbiResultRepr, Handle, MessageFn, Ptr, Size, StreamFn};

pub mod fs;
pub mod http;
pub mod perform;

mod value;
pub use value::HostValue;
mod stream;
pub use stream::IoStream;

//////////////
// MESSAGES //
//////////////

// SAFETY: We choose to trust this FFI.
const EXCHANGE_MESSAGE: MessageFn = unsafe {
    MessageFn::new(
        __import_message_exchange,
        __import_message_exchange_retrieve,
    )
};
#[cfg(not(test))]
#[link(wasm_import_module = "sf_host_unstable")]
extern "C" {
    #[link_name = "message_exchange"]
    fn __import_message_exchange(
        msg_ptr: Ptr<u8>,
        msg_len: Size,
        out_ptr: Ptr<u8>,
        out_len: Size,
        ret_handle: Ptr<Handle>,
    ) -> Size;

    #[link_name = "message_exchange_retrieve"]
    fn __import_message_exchange_retrieve(
        handle: Handle,
        out_ptr: Ptr<u8>,
        out_len: Size,
    ) -> AbiResultRepr;
}
// this is impractical but the imports don't get stripped when we are testing cdylib, so we stub them out
#[cfg(test)]
extern "C" fn __import_message_exchange(
    _msg_ptr: Ptr<u8>,
    _msg_len: Size,
    _out_ptr: Ptr<u8>,
    _out_len: Size,
    _ret_handle: Ptr<Handle>,
) -> Size {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_message_exchange_retrieve(
    _handle: Handle,
    _out_ptr: Ptr<u8>,
    _out_len: Size,
) -> AbiResultRepr {
    unreachable!()
}

/////////////
// STREMAS //
/////////////

// SAFETY: We choose to trust this FFI.
const STREAM_IO: StreamFn = unsafe {
    StreamFn::new(
        __import_stream_read,
        __import_stream_write,
        __import_stream_close,
    )
};

#[cfg(not(test))]
#[link(wasm_import_module = "sf_host_unstable")]
extern "C" {
    #[link_name = "stream_read"]
    fn __import_stream_read(handle: Handle, out_ptr: Ptr<u8>, out_len: Size) -> AbiResultRepr;

    #[link_name = "stream_write"]
    fn __import_stream_write(handle: Handle, in_ptr: Ptr<u8>, in_len: Size) -> AbiResultRepr;

    #[link_name = "stream_close"]
    fn __import_stream_close(handle: Handle) -> AbiResultRepr;
}

// this is impractical but the imports don't get stripped when we are testing cdylib, so we stub them out
#[cfg(test)]
extern "C" fn __import_stream_read(
    _handle: Handle,
    _out_ptr: Ptr<u8>,
    _out_len: Size,
) -> AbiResultRepr {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_stream_write(
    _handle: Handle,
    _in_ptr: Ptr<u8>,
    _in_len: Size,
) -> AbiResultRepr {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_stream_close(handle: Handle) -> AbiResultRepr {
    use crate::abi::AbiResult;
    // this is actually called in tests which construct IoStreams, so we always succeed here
    // TODO: this should possibly be configurable on per-test basis
    assert_ne!(handle, 0);
    AbiResult::Ok(0).into()
}
#[cfg(test)]
mod test {
    use serde_json::json;

    use super::{HostValue, IoStream};

    // TODO: if this macro is needed outside of tests we can move it to the above module
    macro_rules! host_value_object {
        (
            $(
                $key: expr => $value: expr
            ),* $(,)?
        ) => {
            {
                let mut values = std::collections::BTreeMap::new();
                $(
                    values.insert($key.to_string(), $value);
                )+
                HostValue::Object(values)
            }
        }
    }

    #[test]
    fn test_json_structured_data() {
        let actual_json = json!({
            "none": null,
            "bool": false,
            "number_int": -123,
            "number_float": 0.123,
            "string": "this is a string",
            "array": [1, [2.0, true], { "a": "foo", "b": "bar" }],
            "object": {
                "none2": null,
                "boolean": true,
                "stream2": { "$HostValue::Stream": 123 }
            },
            "stream": { "$HostValue::Stream": 45 }
        });

        let actual: HostValue = serde_json::from_value(actual_json.clone()).unwrap();

        assert_eq!(
            actual,
            host_value_object! {
                "none" => HostValue::None,
                "bool" => HostValue::Bool(false),
                "number_int" => HostValue::Number(serde_json::Number::from(-123)),
                "number_float" => HostValue::Number(serde_json::Number::from_f64(0.123).unwrap()),
                "string" => HostValue::String("this is a string".to_string()),
                "array" => HostValue::Array(vec![
                    HostValue::Number(1.into()),
                    HostValue::Array(vec![HostValue::Number(serde_json::Number::from_f64(2.0).unwrap()), HostValue::Bool(true)]),
                    host_value_object! {
                        "a" => HostValue::String("foo".to_string()),
                        "b" => HostValue::String("bar".to_string())
                    }
                ]),
                "object" => host_value_object! {
                    "none2" => HostValue::None,
                    "boolean" => HostValue::Bool(true),
                    "stream2" => HostValue::Stream(IoStream::from_raw_handle(123))
                },
                "stream" => HostValue::Stream(IoStream::from_raw_handle(45))
            }
        );

        let actual_json_again = serde_json::to_value(actual).unwrap();
        assert_eq!(actual_json_again, actual_json);
    }
}
