use anyhow::Context as AnyhowContext;
use quickjs_wasm_rs::{JSContextRef, JSValue, JSValueRef};

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
                $key: literal: $fn_impl: expr
            ),+ $(,)?
        }
    ) => {
        $({
            let state = $state.clone();
            let fun = $context.wrap_callback(move |_context, this, args| {
                use $crate::core_to_map_bindings::JSValueDebug;

                let __span = tracing::trace_span!(concat!("map/", $key)).entered();

                let result = $fn_impl(state.borrow_mut().deref_mut(), this, &args).map_err(anyhow::Error::from);

                if tracing::enabled!(tracing::Level::TRACE) {
                    use std::fmt::Write;

                    let mut buffer = String::new();
                    write!(&mut buffer, "{}(this: {:?}", $key, JSValueDebug::Ref(this)).unwrap();
                    for arg in args {
                        write!(&mut buffer, ", {:?}", JSValueDebug::Ref(*arg)).unwrap();
                    }
                    write!(&mut buffer, ") -> {:?}", result.as_ref().map(JSValueDebug::Owned)).unwrap();

                    tracing::trace!("{}", buffer);
                }

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
fn traverse_object<'ctx>(
    context: &'ctx JSContextRef,
    mut current: JSValueRef<'ctx>,
    keys: &[&str],
) -> anyhow::Result<JSValueRef<'ctx>> {
    for &key in keys {
        current = match current.get_property(key) {
            Ok(value) if !value.is_undefined() => value,
            _ => {
                let property = context
                    .object_value()
                    .context("Failed to create property")?;
                current
                    .set_property(key, property)
                    .context("Failed to set newly created property")?;

                property
            }
        };
    }

    Ok(current)
}

/// Enum for formatting JsValues in a format suitable for debugging.
enum JSValueDebug<'a> {
    Ref(JSValueRef<'a>),
    Owned(&'a JSValue),
}
impl<'a> JSValueDebug<'a> {
    fn fmt_ref(rf: JSValueRef<'a>, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if rf.is_function() {
            return write!(f, "<Function>");
        }
        if rf.is_big_int() {
            return match rf.as_big_int_unchecked() {
                Err(_) => write!(f, "{}", rf.as_str().unwrap()),
                Ok(bint) => write!(f, "{:?}", bint),
            };
        }
        if rf.is_array() || rf.is_object() {
            // only show functions when formatted with `{:#?}`
            let show_functions = f.alternate();

            let mut map = f.debug_map();
            let mut properties = rf.properties().unwrap();
            while let (Ok(Some(key)), Ok(value)) = (properties.next_key(), properties.next_value())
            {
                if value.is_function() && !show_functions {
                    continue;
                }

                map.entry(&Self::Ref(key), &Self::Ref(value));
            }
            return map.finish();
        }

        match quickjs_wasm_rs::from_qjs_value(rf) {
            Err(err) => write!(f, "conversion error: {}", err),
            Ok(v) => Self::fmt_owned(&v, f),
        }
    }

    fn fmt_owned(value: &JSValue, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match value {
            JSValue::String(string) => {
                const MAX_SHOWN: usize = 300 - 2;

                if string.len() > MAX_SHOWN && !f.alternate() {
                    // ensure we never cut strings at invalid places
                    let mut end_index = MAX_SHOWN;
                    while !string.is_char_boundary(end_index) {
                        end_index -= 1;
                    }
                    write!(f, "{}..", &string[..end_index])
                } else {
                    write!(f, "{}", string)
                }
            }
            JSValue::ArrayBuffer(bytes) => {
                const MAX_SHOWN: usize = 5;

                write!(f, "<ArrayBuffer byteLength={} ", bytes.len())?;
                if bytes.len() > MAX_SHOWN && !f.alternate() {
                    write!(f, "{:?}...>", &bytes[..bytes.len().min(MAX_SHOWN)])
                } else {
                    write!(f, "{:?}>", bytes)
                }
            }
            JSValue::Float(num) => write!(f, "{}", num),
            JSValue::Int(num) => write!(f, "{}", num),
            JSValue::Bool(b) => write!(f, "{}", b),
            JSValue::Null => write!(f, "null"),
            JSValue::Undefined => write!(f, "undefined"),
            // these are best effort. It is better to format them through `fmt_ref` as that can also show functions and bigint
            JSValue::Array(array) => {
                let mut list = f.debug_list();
                list.entries(array.iter().map(JSValueDebug::Owned));
                list.finish()
            }
            JSValue::Object(object) => {
                let mut map = f.debug_map();
                map.entries(object.iter().map(|(k, v)| (k, JSValueDebug::Owned(v))));
                map.finish()
            }
        }
    }
}
impl std::fmt::Debug for JSValueDebug<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Ref(rf) => Self::fmt_ref(*rf, f),
            Self::Owned(v) => Self::fmt_owned(v, f),
        }
    }
}
