use anyhow::Context as AnyhowContext;
use quickjs_wasm_rs::{Context, Value as JsValue};

/// Define `key`s in parent which call given `fn_impl(&mut state, context, this, args)`.
///
/// Optionally enable call tracing with `@strace(true)`.
///
/// ```
/// link_into! {
///     context, state, consoleObject, {
///         @strace(true) "log": log_impl,
///         "debug": debug_impl
///     }
/// }
/// ```
macro_rules! link_into {
    (
        $context: expr, $state: expr, $parent: expr, {
            $(
                $( @strace($enable_strace: literal) )? $key: literal: $fn_impl: expr
            ),+ $(,)?
        }
    ) => {
        $({
            let state = $state.clone();
            let fun = $context.wrap_callback(move |context, this, args| {
                let result = $fn_impl(state.borrow_mut().deref_mut(), context, this, args).map_err(anyhow::Error::from);

                $(
                    if $enable_strace {
                        eprint!("core: [strace] {}(this: {:?}", $key, JsValueDebug(&this));
                        for arg in args {
                            eprint!(", {:?}", JsValueDebug(arg));
                        }
                        eprintln!(") -> {:?}", result.as_ref().map(JsValueDebug));
                    }
                )?

                result
            }).context(concat!("Failed to define ", $key, " callback"))?;
            $parent.set_property($key, fun).context(concat!("Failed to set .", $key))?;
        })+
    };
}
/// Ensure arguments exist in callback or return JSError.
///
/// ```
/// let (a, b): (&str, &[u8]) = ensure_arguments!("log" args; 0: str, 1: bytes);
/// ```
macro_rules! ensure_arguments {
    (
        $fn_name: literal
        $args: expr;
        $(
            $n: literal: $arg_type: ident
        ),+ $(,)?
    ) => {
        (
            $(
                match $args.get($n).and_then(|a| ensure_arguments!(#arg_type($arg_type) a)) {
                    None => return Err(JSError::Type(format!(
                        "{}: argument {} must be {}", $fn_name, $n, stringify!($arg_type)
                    ))),
                    Some(v) => v
                }
            ),+
        )
    };

    (#arg_type(i32) $val: expr) => { $val.try_as_integer().ok() };
    (#arg_type(str) $val: expr) => { $val.as_str().ok() };
    (#arg_type(mut_bytes) $val: expr) => { $val.as_bytes_mut().ok() };
    (#arg_type(bytes) $val: expr) => { $val.as_bytes().ok() };
    (#arg_type(value) $val: expr) => { Some($val) };
}

pub mod unstable;

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

/// Newtype for formatting JsValues in a format suitable for debugging.
struct JsValueDebug<'a>(&'a JsValue);
impl std::fmt::Debug for JsValueDebug<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.0 {
            x if x.is_str() => {
                const MAX_SHOWN: usize = 30 - 2;

                let string = x.as_str().unwrap();

                if string.len() > MAX_SHOWN && !f.alternate() {
                    write!(f, "{}..", &string[..MAX_SHOWN])
                } else {
                    write!(f, "{}", string)
                }
            }
            x if x.is_array_buffer() => {
                const MAX_SHOWN: usize = 5;

                let bytes = x.as_bytes().unwrap();
                write!(f, "<ArrayBuffer byteLength={} ", bytes.len())?;
                if bytes.len() > MAX_SHOWN && !f.alternate() {
                    write!(f, "{:?}...>", &bytes[..bytes.len().min(MAX_SHOWN)])
                } else {
                    write!(f, "{:?}>", bytes)
                }
            }
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
