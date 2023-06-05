use sf_std::unstable::{perform::set_perform_output_result_in, HostValue};
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
    unsafe { __wasm_call_dtors() };
    tracing::debug!("mocked superface core teardown");
}

pub fn __export_superface_core_perform() {
    let val = std::env::var("CORE_PERFORM").unwrap_or_default();
    tracing::debug!("mocked superface core perform {}", val);

    match val.as_str() {
        "panic" => panic!("Requested panic!"),
        _ => set_perform_output_result_in(HostValue::Bool(true), MessageExchangeFfi),
    };
}

pub fn __export_superface_core_send_metrics() {
    tracing::debug!("mocked superface core send metrics");
}
