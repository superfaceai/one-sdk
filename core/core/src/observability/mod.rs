use std::borrow::Cow;

use tracing_subscriber::{
    filter::{FilterFn, LevelFilter},
    fmt::format,
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter, Layer,
};

use self::buffer::{RingEventBuffer, SharedEventBuffer, VecEventBuffer};
use crate::CoreConfiguration;
pub(crate) use metrics::log_metric;

pub mod buffer;
pub mod metrics;

pub static mut METRICS_BUFFER: Option<SharedEventBuffer<VecEventBuffer>> = None;
pub static mut DEVELOPER_DUMP_BUFFER: Option<SharedEventBuffer<RingEventBuffer>> = None;

#[cfg_attr(feature = "core_mock", allow(unused_variables))]
/// SAFETY: must only be called once during initialization of the program
pub unsafe fn init(config: &CoreConfiguration) {
    unsafe {
        // metrics buffer is not used through tracing
        METRICS_BUFFER.replace(SharedEventBuffer::new(VecEventBuffer::new()));
    }

    #[cfg(feature = "core_mock")]
    {
        crate::mock::init_tracing();
    }
    #[cfg(not(feature = "core_mock"))]
    {
        // SAFETY: this is only called once and there is no asynchronous mutation
        unsafe {
            DEVELOPER_DUMP_BUFFER.replace(SharedEventBuffer::new(RingEventBuffer::new(
                config.developer_dump_buffer_size,
            )));

            init_tracing(
                // METRICS_BUFFER.as_ref().cloned().unwrap(),
                DEVELOPER_DUMP_BUFFER.as_ref().cloned().unwrap(),
                config.user_log,
                &config.developer_log,
            );
        }
    }

    // add panic hook so we can log panics as metrics
    std::panic::set_hook(Box::new(|info| {
        let message: Cow<'_, str> = if let Some(message) = info.payload().downcast_ref::<&str>() {
            (*message).into()
        } else if let Some(message) = info.payload().downcast_ref::<String>() {
            message.as_str().into()
        } else {
            format!("{}", info).into()
        };

        log_metric!(
            Panic
            message = message.as_ref(),
            location = info.location().map(|l| (l.file(), l.line(), l.column()))
        );
        tracing::error!(
            target: "panic",
            message = message.as_ref(),
            location = ?info.location().map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
        );
    }));
}

#[cfg_attr(feature = "core_mock", allow(dead_code))]
fn init_tracing(
    // TODO: we don't use tracing to store metrics in the metrics buffer because we need more complex fields than tracing currently supports
    // _metrics_buffer: SharedEventBuffer<VecEventBuffer>,
    developer_dump_buffer: SharedEventBuffer<RingEventBuffer>,
    user_log: bool,
    developer_log: &str,
) {
    // we set up these layers:
    // * user layer (@user) - output intended/relevant for users of the sdk
    // * metrics layer (@metrics) - metrics sent to the dashboard
    // * developer layer (everything) - output not relevant for normal users, but relevant when debugging and during development
    // * dump layer (not @metrics) - output dumped after a panic, excluding metrics which are dumped separately

    let user_layer = tracing_subscriber::fmt::layer()
        .event_format(format::format().with_target(false).with_level(false))
        .with_writer(std::io::stdout)
        .with_filter(FilterFn::new(move |metadata| {
            user_log && metadata.target().starts_with("@user")
        }));

    let developer_layer = tracing_subscriber::fmt::layer()
        .with_writer(std::io::stderr)
        .with_filter(
            EnvFilter::builder()
                .with_default_directive(LevelFilter::OFF.into())
                .parse_lossy(developer_log),
        );

    let developer_dump_layer = tracing_subscriber::fmt::layer()
        .with_writer(developer_dump_buffer)
        .event_format(
            format::format().with_ansi(false), // disable ansi colors because this will usually go into a file
        )
        .with_filter(LevelFilter::DEBUG);

    tracing_subscriber::registry()
        .with(user_layer)
        .with(developer_layer)
        .with(developer_dump_layer)
        .init();
}
