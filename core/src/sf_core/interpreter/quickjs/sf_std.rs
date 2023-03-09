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
                $fn_impl(state.borrow_mut().deref_mut(), context, this, args).map_err(anyhow::Error::from)
            }).context(concat!("Failed to define ", $key, " callback"))?;
            $parent.set_property($key, fun).context(concat!("Failed to set .", $key))?;
        })+
    };
}

pub mod unstable {
    use std::{cell::RefCell, ops::DerefMut, rc::Rc};

    use anyhow::Context as AnyhowContext;
    use quickjs_wasm_rs::{Context, JSError, Value as JsValue};

    use crate::sf_std::core_to_map::unstable::SfCoreUnstable;

    pub const MODULE_NAME: &[&str] = &["sf_std", "ffi", "unstable"];

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
                "print": __export_print,
                "abort": __export_abort
            }
        );

        Ok(())
    }

    fn __export_print<H: SfCoreUnstable + 'static>(
        state: &mut H,
        context: &Context,
        _this: &JsValue,
        args: &[JsValue],
    ) -> Result<JsValue, JSError> {
        let message = match args.get(0).and_then(|a| a.as_str().ok()) {
            None => {
                return Err(JSError::Type(
                    "print must have exactly one string argument".to_string(),
                ))
            }
            Some(m) => m,
        };

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
}
