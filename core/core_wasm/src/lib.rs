use std::sync::Mutex;

use oneclient_core::{CoreConfiguration, OneClientCore};
use wasm_abi::{Ptr, Size};

mod bindings;
mod observability;

static GLOBAL_STATE: Mutex<Option<OneClientCore>> = Mutex::new(None);

// WASI functions which would be automatically called from `_start`, but we need to explicitly call them since we are a lib.
extern "C" {
    fn __wasm_call_ctors();
    fn __wasm_call_dtors();
}

#[no_mangle]
#[export_name = "oneclient_core_setup"]
#[cfg_attr(feature = "core_mock", allow(unreachable_code))]
/// Initializes persistent core state.
///
/// This function must not be called twice without calling teardown in between.
pub extern "C" fn __export_oneclient_core_setup() {
    // call ctors first
    unsafe { __wasm_call_ctors() };
    // then set up standard library
    unsafe {
        sf_std::global_exchange::set_global_message_exchange(bindings::MessageExchangeFfi);
        sf_std::global_exchange::set_global_stream_exchange(bindings::StreamExchangeFfi);
    }

    let mut lock = GLOBAL_STATE.lock().unwrap();
    if lock.is_some() {
        panic!("Already setup");
    }

    // load config, but don't display the error yet since we haven't initialize logging yet
    let (config, config_err) = match CoreConfiguration::from_env() {
        Ok(c) => (c, None),
        Err(err) => (CoreConfiguration::default(), Some(err)),
    };

    // initialize observability
    // SAFETY: setup is only allowed to be called once
    unsafe { oneclient_core::observability::init(&config) };

    // now that we have logging we can start printing stuff
    tracing::debug!(target: "@user", "oneclient_core_setup called");
    if let Some(err) = config_err {
        tracing::error!(
            target: "@user",
            "Failed to load core configuration from environment: {}",
            err
        );
    }

    // here we panic on error because there is nothing to teardown
    lock.replace(OneClientCore::new(&config).unwrap());
}

#[no_mangle]
#[export_name = "oneclient_core_teardown"]
#[cfg_attr(feature = "core_mock", allow(unreachable_code))]
/// Tears down persistent core state.
///
/// This function must be called exactly once after calling core setup.
pub extern "C" fn __export_oneclient_core_teardown() {
    tracing::debug!(target: "@user", "oneclient_core_teardown called");

    match GLOBAL_STATE.try_lock() {
        Err(_) => panic!("Global state lock already locked: perform most likely panicked"),
        Ok(lock) if lock.is_none() => panic!("Not setup or already torn down"),
        Ok(mut lock) => {
            let state = lock.take();
            std::mem::drop(state); // just to be explicit, would be dropped implicitly anyway

            // call dtors last
            unsafe { __wasm_call_dtors() };
        }
    }
}

#[no_mangle]
#[export_name = "oneclient_core_perform"]
#[cfg_attr(feature = "core_mock", allow(unreachable_code))]
/// Executes perform.
///
/// Must be called after [__export_oneclient_core_setup] and before [__export_oneclient_core_teardown].
///
/// All information about map to be performed will be retrieved through messages.
pub extern "C" fn __export_oneclient_core_perform() {
    let mut lock = GLOBAL_STATE.lock().unwrap();
    let state: &mut OneClientCore = lock
        .as_mut()
        .expect("Global state missing: has oneclient_core_setup been called?");

    state.perform()
}

#[cfg(feature = "asyncify")]
#[no_mangle]
#[export_name = "asyncify_alloc_stack"]
pub extern "C" fn __export_oneclient_core_async_init(mut data_ptr: Ptr<Size>, stack_size: Size) {
    // We allocate Size elements to ensure correct alignment, but size is in bytes.
    let len = stack_size / std::mem::size_of::<Size>();

    let mut asyncify_stack = Vec::<Size>::new();
    asyncify_stack.reserve_exact(len);
    asyncify_stack.resize(len, 0);
    // leak the stack so deallocation doesn't happen
    let asyncify_stack = asyncify_stack.leak();

    // part of the data contract is that we write the resulting range to the data struct ourselves
    let stack = asyncify_stack.as_mut_ptr_range();
    unsafe {
        data_ptr.mut_ptr().write(stack.start as Size);
        data_ptr.mut_ptr().offset(1).write(stack.end as Size)
    }

    // TODO: if we allocate the stack so that the data structure is at its beginning we get the possibility of having multiple stacks without relying on undocumented compiler behavior
}
