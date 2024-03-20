//! Mocked behaviour of core to test Host applications
//!
//! Use usecase to request some behaviour for perform:
//! - CORE_PERFORM_PANIC
//! - CORE_PERFORM_TRUE
//! - CORE_PERFORM_INPUT_VALIDATION_ERROR

use sf_std::unstable::{
    exception::{PerformException, PerformExceptionErrorCode},
    perform::{set_perform_output_exception, set_perform_output_result, PerformInput},
    HostValue,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub fn init_tracing() {
    // initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer().with_writer(std::io::stderr))
        .init();

    tracing::debug!("mocked oneclient core setup");
}

pub fn perform() {
    let perform_input = PerformInput::take().unwrap();

    tracing::debug!("mocked oneclient core perform {}", perform_input.usecase);

    match perform_input.usecase.as_str() {
        "CORE_PERFORM_PANIC" => panic!("Requested panic!"),
        "CORE_PERFORM_TRUE" => set_perform_output_result(HostValue::Bool(true)),
        "CORE_PERFORM_INPUT_VALIDATION_ERROR" => set_perform_output_exception(PerformException {
            error_code: PerformExceptionErrorCode::InputValidationError,
            message: "Test validation error".to_string(),
        }),
        _ => panic!("Unknown usecase: {}", perform_input.usecase),
    };
}
