use anyhow::Context as AnyhowContext;
use quickjs_wasm_rs::{Context, Value as JsValue};

/// Returns the end of the `keys` chain by recursively traversing into objects, creating properties along the way if they don't exist.
fn traverse_object(
    context: &Context,
    mut current: JsValue,
    keys: &[&str],
) -> anyhow::Result<JsValue> {
    for &key in keys {
        current = match current.get_property(key) {
            Ok(value) if !value.is_undefined() => value,
            _ => {
                let property = context
                    .object_value()
                    .context("Failed to create property")?;
                current
                    .set_property(key, property.clone())
                    .context("Failed to set newly created property")?;

                property
            }
        };
    }

    Ok(current)
}
macro_rules! link_into {
    (
        $context: expr, $state: expr, $parent: expr, {
            $(
                $key: literal: $fn_impl: expr
            ),+ $(,)?
        }
    ) => {
        $({
            let state = $state.clone();
            let fun = $context.wrap_callback(move |context, this, args| {
                let result = $fn_impl(state.borrow_mut().deref_mut(), context, this, args).map_err(anyhow::Error::from);

                eprint!("core: {}(this: {:?}", $key, JsValueDebug(&this));
                for arg in args {
                    eprint!(", {:?}", JsValueDebug(arg));
                }
                eprintln!(") -> {:?}", result.as_ref().map(JsValueDebug));

                result
            }).context(concat!("Failed to define ", $key, " callback"))?;
            $parent.set_property($key, fun).context(concat!("Failed to set .", $key))?;
        })+
    };
}
macro_rules! ensure_arguments {
    (
        $fn_name: literal
        $args: expr;
        $(
            $n: literal: $arg_fn: ident
        ),+ $(,)?
    ) => {
        (
            $(
                match $args.get($n).and_then(|a| a.$arg_fn().ok()) {
                    None => return Err(JSError::Type(format!(
                        "{}: argument {} must be {}", $fn_name, $n, stringify!($arg_fn)
                    ))),
                    Some(v) => v
                }
            ),+
        )
    };
}

struct JsValueDebug<'a>(&'a JsValue);
impl std::fmt::Debug for JsValueDebug<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.0 {
            x if x.is_str() => write!(f, "{:?}", x.as_str().unwrap()),
            x if x.is_array_buffer() => write!(f, "<ArrayBuffer>"),
            x if x.is_number() => write!(f, "{}", x.as_f64().unwrap()),
            x if x.is_bool() => write!(f, "{}", x.as_bool().unwrap()),
            x if x.is_null() => write!(f, "null"),
            x if x.is_undefined() => write!(f, "undefined"),
            x if x.is_big_int() => write!(f, "{:?}", x.as_big_int_unchecked().unwrap()),
            x if x.is_function() => write!(f, "<Function>"),
            x => {
                // only show functions when formatted with `{:#?}`
                let show_functions = f.alternate();

                let mut properties = x.properties().unwrap();
                let mut map = f.debug_map();
                while let (Ok(Some(key)), Ok(value)) =
                    (properties.next_key(), properties.next_value())
                {
                    if value.is_function() && !show_functions {
                        continue;
                    }

                    map.entry(&JsValueDebug(&key), &JsValueDebug(&value));
                }
                return map.finish();
            }
        }
    }
}

pub mod unstable {
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
                // env
                "print": __export_print,
                "abort": __export_abort,
                "decode_utf8": __export_decode_utf8,
                // messages
                "message_exchange": __export_message_exchange,
                // streams
                "stream_read": __export_stream_read,
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
        let message = ensure_arguments!("message_exchange" args; 0: as_str);
        let response = unstable::handle_message(state, message.as_bytes());

        Ok(context.value_from_str(&response).unwrap())
    }

    fn __export_stream_read<H: SfCoreUnstable + 'static>(
        state: &mut H,
        context: &Context,
        _this: &JsValue,
        args: &[JsValue],
    ) -> Result<JsValue, JSError> {
        let (handle, buf) =
            ensure_arguments!("stream_read" args; 0: try_as_integer, 1: as_bytes_mut);

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
        let (handle, buf) = ensure_arguments!("stream_write" args; 0: try_as_integer, 1: as_bytes);

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
        let handle = ensure_arguments!("stream_close" args; 0: try_as_integer);

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
        let message = ensure_arguments!("print" args; 0: as_str);
        state.print(message);

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

    fn __export_decode_utf8<H: SfCoreUnstable + 'static>(
        _state: &mut H,
        _context: &Context,
        _this: &JsValue,
        _args: &[JsValue],
    ) -> Result<JsValue, JSError> {
        panic!()
    }
}
