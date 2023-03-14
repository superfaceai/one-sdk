use std::{cell::RefCell, ops::DerefMut, rc::Rc};

use anyhow::Context as AnyhowContext;
use quickjs_wasm_rs::{Context, JSError, Value as JsValue};

use crate::sf_std::core_to_map::unstable::{self, SfCoreUnstable};

use super::JsValueDebug;

pub const MODULE_NAME: &[&str] = &["std", "ffi", "unstable"];

pub fn link<H: SfCoreUnstable + 'static>(
    context: &mut Context,
    state: Rc<RefCell<H>>,
) -> anyhow::Result<()> {
    let global_object = context
        .global_object()
        .context("Failed to get global object")?;
    let unstable = super::traverse_object(context, global_object, MODULE_NAME)?;
    link_into!(
        context, state, unstable,
        {
            // debug
            "printDebug": __export_print_debug,
            // env
            "print": __export_print,
            "abort": __export_abort,
            @strace(true) "decode_str_utf8": __export_decode_str_utf8,
            "encode_str_utf8": __export_encode_str_utf8,
            @strace(true) "encode_map_urlencode": __export_encode_map_urlencode,
            // messages
            @strace(true) "message_exchange": __export_message_exchange,
            // streams
            @strace(true) "stream_read": __export_stream_read,
            "stream_write": __export_stream_write,
            "stream_close": __export_stream_close
        }
    );

    Ok(())
}

fn __export_message_exchange<H: SfCoreUnstable + 'static>(
    state: &mut H,
    context: &Context,
    _this: &JsValue,
    args: &[JsValue],
) -> Result<JsValue, JSError> {
    let message = ensure_arguments!("message_exchange" args; 0: str);
    let response = unstable::handle_message(state, message.as_bytes());

    Ok(context.value_from_str(&response).unwrap())
}

fn __export_stream_read<H: SfCoreUnstable + 'static>(
    state: &mut H,
    context: &Context,
    _this: &JsValue,
    args: &[JsValue],
) -> Result<JsValue, JSError> {
    let (handle, buf) = ensure_arguments!("stream_read" args; 0: i32, 1: mut_bytes);

    match state.stream_read(handle as usize, buf) {
        Ok(count) => Ok(context.value_from_u64(count as u64).unwrap()),
        Err(err) => Err(JSError::Type(format!("stream_read: {}", err))),
    }
}

fn __export_stream_write<H: SfCoreUnstable + 'static>(
    state: &mut H,
    context: &Context,
    _this: &JsValue,
    args: &[JsValue],
) -> Result<JsValue, JSError> {
    let (handle, buf) = ensure_arguments!("stream_write" args; 0: i32, 1: bytes);

    match state.stream_write(handle as usize, buf) {
        Ok(count) => Ok(context.value_from_u64(count as u64).unwrap()),
        Err(err) => Err(JSError::Type(format!("stream_write: {}", err))),
    }
}

fn __export_stream_close<H: SfCoreUnstable + 'static>(
    state: &mut H,
    context: &Context,
    _this: &JsValue,
    args: &[JsValue],
) -> Result<JsValue, JSError> {
    let handle = ensure_arguments!("stream_close" args; 0: i32);

    match state.stream_close(handle as usize) {
        Ok(()) => Ok(context.undefined_value().unwrap()),
        Err(err) => Err(JSError::Type(format!("stream_close: {}", err))),
    }
}

fn __export_print<H: SfCoreUnstable + 'static>(
    state: &mut H,
    context: &Context,
    _this: &JsValue,
    args: &[JsValue],
) -> Result<JsValue, JSError> {
    let message = ensure_arguments!("print" args; 0: str);
    state.print(message);

    Ok(context.undefined_value().unwrap())
}

fn __export_print_debug<H: SfCoreUnstable + 'static>(
    _state: &mut H,
    context: &Context,
    _this: &JsValue,
    args: &[JsValue],
) -> Result<JsValue, JSError> {
    eprint!("map printDebug:");
    for arg in args {
        eprint!(" {:#?}", JsValueDebug(arg));
    }
    eprintln!();

    Ok(context.undefined_value().unwrap())
}

fn __export_abort<H: SfCoreUnstable + 'static>(
    _state: &mut H,
    _context: &Context,
    _this: &JsValue,
    _args: &[JsValue],
) -> Result<JsValue, JSError> {
    panic!()
}

fn __export_decode_str_utf8<H: SfCoreUnstable + 'static>(
    _state: &mut H,
    context: &Context,
    _this: &JsValue,
    args: &[JsValue],
) -> Result<JsValue, JSError> {
    let bytes = ensure_arguments!("decode_str_utf8" args; 0: bytes);

    match std::str::from_utf8(bytes) {
        Err(err) => Err(JSError::Type(format!(
            "Could not decode bytes at UTF-8: {}",
            err
        ))),
        Ok(s) => Ok(context.value_from_str(s).unwrap()),
    }
}

fn __export_encode_str_utf8<H: SfCoreUnstable + 'static>(
    _state: &mut H,
    context: &Context,
    _this: &JsValue,
    args: &[JsValue],
) -> Result<JsValue, JSError> {
    let string = ensure_arguments!("encode_str_utf8" args; 0: str);

    Ok(context.array_buffer_value(string.as_bytes()).unwrap())
}

fn __export_encode_map_urlencode<H: SfCoreUnstable + 'static>(
    _state: &mut H,
    context: &Context,
    _this: &JsValue,
    args: &[JsValue],
) -> Result<JsValue, JSError> {
    let value = ensure_arguments!("encode_map_urlencode" args; 0: value);

    let mut pairs = Vec::<(String, String)>::new();
    let mut properties = value.properties().unwrap();
    while let (Ok(Some(key)), Ok(value)) = (properties.next_key(), properties.next_value()) {
        if !value.is_array() {
            return Err(JSError::Type("Values must be string arrays".to_string()));
        }

        let length = value
            .get_property("length")
            .unwrap()
            .try_as_integer()
            .unwrap() as u32;
        for i in 0..length {
            let v = value.get_indexed_property(i).unwrap();
            if !v.is_str() {
                return Err(JSError::Type("Values must be string arrays".to_string()));
            }

            pairs.push((
                key.as_str().unwrap().to_string(),
                v.as_str().unwrap().to_string(),
            ));
        }
    }
    let result = serde_urlencoded::to_string(&pairs).unwrap();

    Ok(context.value_from_str(&result).unwrap())
}
