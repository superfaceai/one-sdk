use tracing::metadata::LevelFilter;
use tracing_subscriber::{
    filter::FilterFn, fmt::format, layer::SubscriberExt, EnvFilter,
    Layer, util::SubscriberInitExt,
};

use self::buffer::{SharedEventBuffer, VecEventBuffer, RingEventBuffer};

pub mod buffer;

static mut METRICS_BUFFER: Option<SharedEventBuffer<VecEventBuffer>> = None;
static mut DEVELOPER_DUMP_BUFFER: Option<SharedEventBuffer<RingEventBuffer>> = None;

/// SAFETY: must only be called once during initialization of the program
pub unsafe fn init(ring_event_buffer_size: usize) {
    // SAFETY: this is only called once and there is no asynchronous mutation
    unsafe {
        METRICS_BUFFER.replace(SharedEventBuffer::new(VecEventBuffer::new()));
        DEVELOPER_DUMP_BUFFER.replace(SharedEventBuffer::new(RingEventBuffer::new(ring_event_buffer_size)));

        init_tracing(
            METRICS_BUFFER.as_ref().cloned().unwrap(),
            DEVELOPER_DUMP_BUFFER.as_ref().cloned().unwrap()
        );
    }
}

fn init_tracing(
    metrics_buffer: SharedEventBuffer<VecEventBuffer>,
    developer_dump_buffer: SharedEventBuffer<RingEventBuffer>
) {
    // we set up these layers:
    // * user layer (@user) - output intended/relevant for users of the sdk
    // * metrics layer (@metrics) - metrics sent to the dashboard
    // * developer layer (everything) - output not relevant for normal users, but relevant when debugging and during development
    // * dump layer (not @metrics) - output dumped after a panic, excluding metrics which are dumped separately

    let user_layer = tracing_subscriber::fmt::layer()
        .with_target(false)
        .with_writer(std::io::stdout)
        .with_filter(FilterFn::new(|metadata| {
            metadata.target().starts_with("@user")
        }))
        .with_filter(
            EnvFilter::builder()
                .with_default_directive(LevelFilter::WARN.into())
                .with_env_var("OSDK_LOG")
                .from_env_lossy(),
        );

    let metrics_layer = tracing_subscriber::fmt::layer()
        .event_format(
            format::json()
                .flatten_event(true)
                .with_target(false)
                .with_level(false),
        )
        .with_writer(metrics_buffer)
        .with_filter(FilterFn::new(|metadata| {
            metadata.target().starts_with("@metrics")
        }));

    let developer_layer = tracing_subscriber::fmt::layer()
        .with_writer(std::io::stderr)
        .with_filter(
            EnvFilter::builder()
                .with_default_directive(LevelFilter::OFF.into())
                .with_env_var("OSDK_DEV_LOG")
                .from_env_lossy(),
        );

    let developer_dump_layer = tracing_subscriber::fmt::layer()
        .event_format(
            format::format().with_ansi(false) // disable ansi colors because this will usually go into a file
        )
        .with_writer(developer_dump_buffer)
        .with_filter(FilterFn::new(|metadata| {
            !metadata.target().starts_with("@metrics")
        }));

    tracing_subscriber::registry()
        .with(user_layer)
        .with(metrics_layer)
        .with(developer_layer)
        .with(developer_dump_layer)
        .init();
}
