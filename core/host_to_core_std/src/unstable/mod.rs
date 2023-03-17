//! Unstable functions provide no stability guarantees

use crate::abi::{MessageFn, StreamFn, PairRepr, Ptr, ResultRepr, Size};
use super::MessageExchange;

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
        msg_ptr: Ptr,
        msg_len: Size,
        out_ptr: Ptr,
        out_len: Size,
    ) -> PairRepr;

    #[link_name = "message_exchange_retrieve"]
    fn __import_message_exchange_retrieve(handle: Size, out_ptr: Ptr, out_len: Size) -> ResultRepr;
}
// this is impractical but the imports don't get stripped when we are testing cdylib, so we stub them out
#[cfg(test)]
extern "C" fn __import_message_exchange(
    _msg_ptr: Ptr,
    _msg_len: Size,
    _out_ptr: Ptr,
    _out_len: Size,
) -> PairRepr {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_message_exchange_retrieve(
    _handle: Size,
    _out_ptr: Ptr,
    _out_len: Size,
) -> ResultRepr {
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
    fn __import_stream_read(handle: Size, out_ptr: Ptr, out_len: Size) -> ResultRepr;

    #[link_name = "stream_write"]
    fn __import_stream_write(handle: Size, in_ptr: Ptr, in_len: Size) -> ResultRepr;

    #[link_name = "stream_close"]
    fn __import_stream_close(handle: Size) -> ResultRepr;
}

// this is impractical but the imports don't get stripped when we are testing cdylib, so we stub them out
#[cfg(test)]
extern "C" fn __import_stream_read(_handle: Size, _out_ptr: Ptr, _out_len: Size) -> ResultRepr {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_stream_write(_handle: Size, _in_ptr: Ptr, _in_len: Size) -> ResultRepr {
    unreachable!()
}
#[cfg(test)]
extern "C" fn __import_stream_close(handle: Size) -> ResultRepr {
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
