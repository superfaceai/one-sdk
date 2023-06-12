//! Mocked behaviour of core to test Host applications
//!
//! Use usecase to request some behaviour for perform:
//! - CORE_PERFORM_PANIC
//! - CORE_PERFORM_TRUE

use sf_std::unstable::{
    perform::{set_perform_output_result_in, PerformInput},
    HostValue,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::bindings::MessageExchangeFfi;

extern "C" {
    fn __wasm_call_ctors();
    fn __wasm_call_dtors();
}

pub fn __export_superface_core_setup() {
    unsafe { __wasm_call_ctors() };

    // initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::from_env("SF_LOG"))
        .init();

    tracing::debug!("mocked superface core setup");
}

pub fn __export_superface_core_teardown() {
    tracing::debug!("mocked superface core teardown");
    unsafe { __wasm_call_dtors() };
}

pub fn __export_superface_core_perform() {
    let perform_input = PerformInput::take_in(MessageExchangeFfi);

    tracing::debug!("mocked superface core perform {}", perform_input.usecase);

    match perform_input.usecase.as_str() {
        "CORE_PERFORM_PANIC" => panic!("Requested panic!"),
        "CORE_PERFORM_TRUE" => {
            set_perform_output_result_in(HostValue::Bool(true), MessageExchangeFfi)
        }
        _ => panic!("Unknown usecase: {}", perform_input.usecase),
    };
}

pub fn __export_superface_core_send_metrics() {
    tracing::debug!("mocked superface core send metrics");
}
