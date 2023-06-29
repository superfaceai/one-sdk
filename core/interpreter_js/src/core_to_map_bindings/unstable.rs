use std::{cell::RefCell, collections::HashMap, ops::DerefMut, rc::Rc};

use anyhow::Context as AnyhowContext;
use base64::Engine;
use quickjs_wasm_rs::{JSContextRef, JSError, JSValue, JSValueRef};

use map_std::unstable::{url::UrlParts, MapStdUnstable};
use sf_std::MultiMap;

use super::JSValueDebug;

pub const MODULE_NAME: &[&str] = &["__ffi", "unstable"];

pub fn link<H: MapStdUnstable + 'static>(
    context: &mut JSContextRef,
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
            "print": __export_print,
            // env
            "bytes_to_utf8": __export_bytes_to_utf8,
            "utf8_to_bytes": __export_utf8_to_bytes,
            "bytes_to_base64": __export_bytes_to_base64,
            "base64_to_bytes": __export_base64_to_bytes,
            "record_to_urlencoded": __export_record_to_urlencoded,
            // messages
            "message_exchange": __export_message_exchange,
            // streams
            "stream_read": __export_stream_read,
            "stream_write": __export_stream_write,
            "stream_close": __export_stream_close,
            // url
            "url_parse": __export_url_parse,
        }
    );

    Ok(())
}

fn __export_message_exchange<'ctx, H: MapStdUnstable + 'static>(
    state: &mut H,
    _this: JSValueRef<'ctx>,
    args: &[JSValueRef<'ctx>],
) -> Result<JSValue, JSError> {
    let message = ensure_arguments!("message_exchange" args; 0: str);
    let response = map_std::unstable::handle_message(state, message.as_bytes());

    Ok(JSValue::String(response))
}

fn __export_stream_read<'ctx, H: MapStdUnstable + 'static>(
    state: &mut H,
    _this: JSValueRef<'ctx>,
    args: &[JSValueRef<'ctx>],
) -> Result<JSValue, JSError> {
    let (handle, buf) = ensure_arguments!("stream_read" args; 0: i32, 1: mut_bytes);

    match state.stream_read(handle as _, buf) {
        Ok(count) => Ok(count.into()),
        Err(err) => Err(JSError::Type(format!("stream_read: {}", err))),
    }
}

fn __export_stream_write<'ctx, H: MapStdUnstable + 'static>(
    state: &mut H,
    _this: JSValueRef<'ctx>,
    args: &[JSValueRef<'ctx>],
) -> Result<JSValue, JSError> {
    let (handle, buf) = ensure_arguments!("stream_write" args; 0: i32, 1: bytes);

    match state.stream_write(handle as _, buf) {
        Ok(count) => Ok(count.into()),
        Err(err) => Err(JSError::Type(format!("stream_write: {}", err))),
    }
}

fn __export_stream_close<'ctx, H: MapStdUnstable + 'static>(
    state: &mut H,
    _this: JSValueRef<'ctx>,
    args: &[JSValueRef<'ctx>],
) -> Result<JSValue, JSError> {
    let handle = ensure_arguments!("stream_close" args; 0: i32);

    match state.stream_close(handle as _) {
        Ok(()) => Ok(JSValue::Undefined),
        Err(err) => Err(JSError::Type(format!("stream_close: {}", err))),
    }
}

fn __export_print<'ctx, H: MapStdUnstable + 'static>(
    state: &mut H,
    _this: JSValueRef<'ctx>,
    args: &[JSValueRef<'ctx>],
) -> Result<JSValue, JSError> {
    let message = ensure_arguments!("print" args; 0: str);
    state.print(message);

    Ok(JSValue::Undefined)
}

fn __export_print_debug<'ctx, H: MapStdUnstable + 'static>(
    _state: &mut H,
    _this: JSValueRef<'ctx>,
    args: &[JSValueRef<'ctx>],
) -> Result<JSValue, JSError> {
    use std::fmt::Write;

    let mut buffer = String::new();
    for arg in args {
        write!(&mut buffer, "{:#?} ", JSValueDebug::Ref(*arg)).unwrap();
    }
    tracing::debug!("{}", buffer);

    Ok(JSValue::Undefined)
}

fn __export_bytes_to_utf8<'ctx, H: MapStdUnstable + 'static>(
    _state: &mut H,
    _this: JSValueRef<'ctx>,
    args: &[JSValueRef<'ctx>],
) -> Result<JSValue, JSError> {
    let bytes = ensure_arguments!("bytes_to_utf8" args; 0: bytes);

    match std::str::from_utf8(bytes) {
        Err(err) => Err(JSError::Type(format!(
            "Could not decode bytes at UTF-8: {}",
            err
        ))),
        Ok(s) => Ok(s.into()),
    }
}

fn __export_utf8_to_bytes<'ctx, H: MapStdUnstable + 'static>(
    _state: &mut H,
    _this: JSValueRef<'ctx>,
    args: &[JSValueRef<'ctx>],
) -> Result<JSValue, JSError> {
    let string = ensure_arguments!("utf8_to_bytes" args; 0: str);

    Ok(JSValue::ArrayBuffer(string.into()))
}

fn __export_bytes_to_base64<'ctx, H: MapStdUnstable + 'static>(
    _state: &mut H,
    _this: JSValueRef<'ctx>,
    args: &[JSValueRef<'ctx>],
) -> Result<JSValue, JSError> {
    let bytes = ensure_arguments!("bytes_to_base64" args; 0: bytes);

    let result = base64::engine::general_purpose::STANDARD.encode(bytes);

    Ok(result.into())
}

fn __export_base64_to_bytes<'ctx, H: MapStdUnstable + 'static>(
    _state: &mut H,
    _this: JSValueRef<'ctx>,
    args: &[JSValueRef<'ctx>],
) -> Result<JSValue, JSError> {
    let string = ensure_arguments!("base64_to_bytes" args; 0: str);

    match base64::engine::general_purpose::STANDARD.decode(string) {
        Err(err) => Err(JSError::Type(format!(
            "Could not decode string as base64: {}",
            err
        ))),
        Ok(bytes) => Ok(JSValue::ArrayBuffer(bytes)),
    }
}

fn __export_record_to_urlencoded<'ctx, H: MapStdUnstable + 'static>(
    _state: &mut H,
    _this: JSValueRef<'ctx>,
    args: &[JSValueRef<'ctx>],
) -> Result<JSValue, JSError> {
    let value = ensure_arguments!("record_to_urlencoded" args; 0: value);
    let mut properties = value.properties().unwrap();

    let mut multimap = MultiMap::new();
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

            let key = key.as_str().unwrap().to_string();
            let value = v.as_str().unwrap().to_string();
            multimap.entry(key).or_default().push(value);
        }
    }
    let result = sf_std::encode_query(&multimap);

    Ok(result.into())
}

fn __export_url_parse<'ctx, H: MapStdUnstable + 'static>(
    _state: &mut H,
    _this: JSValueRef<'ctx>,
    args: &[JSValueRef<'ctx>],
) -> Result<JSValue, JSError> {
    let url = ensure_arguments!("url_parse" args; 0: str);

    // TODO: better way how to handle optional argument?
    let mut base: Option<&str> = None;
    if let Some(b) = args.get(1) {
        if b.is_str() {
            base = Some(b.as_str().unwrap());
        }
    }

    let url_parts = UrlParts::parse(url, base);
    match url_parts {
        Err(err) => Err(JSError::Type(format!("Invalid URL: {}", err))),
        Ok(url_parts) => {
            let mut result: HashMap<String, JSValue> = HashMap::new();

            result.insert("hostname".to_string(), JSValue::String(url_parts.hostname));
            result.insert("host".to_string(), JSValue::String(url_parts.host));
            result.insert("origin".to_string(), JSValue::String(url_parts.origin));
            result.insert("protocol".to_string(), JSValue::String(url_parts.protocol));
            result.insert("pathname".to_string(), JSValue::String(url_parts.pathname));

            if let Some(username) = url_parts.username {
                result.insert("username".to_string(), JSValue::String(username));
            }
            if let Some(password) = url_parts.password {
                result.insert("password".to_string(), JSValue::String(password));
            }
            if let Some(port) = url_parts.port {
                result.insert("port".to_string(), JSValue::String(port));
            }
            if let Some(search) = url_parts.search {
                result.insert("search".to_string(), JSValue::String(search));
            }
            if let Some(hash) = url_parts.hash {
                result.insert("hash".to_string(), JSValue::String(hash));
            }

            Ok(JSValue::Object(result))
        }
    }
}

fn __export_url_format<'ctx, H: MapStdUnstable + 'static>(
    _state: &mut H,
    _this: JSValueRef<'ctx>,
    args: &[JSValueRef<'ctx>],
) -> Result<JSValue, JSError> {
    let _parts = ensure_arguments!("url_format" args; 0: value);

    Ok(JSValue::String("tbd".to_string()))
}
