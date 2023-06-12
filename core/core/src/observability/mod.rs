use tracing::metadata::LevelFilter;
use tracing_subscriber::{
    filter::FilterFn, fmt::format::json, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter,
    Layer,
};

use self::buffer::{SharedEventBuffer, VecEventBuffer};

pub mod buffer;

pub fn init_tracing(
    metrics_buffer: SharedEventBuffer<VecEventBuffer>,
    developer_dump_buffer: SharedEventBuffer<VecEventBuffer>,
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
                .with_env_var("SF_LOG")
                .from_env_lossy(),
        );

    let metrics_layer = tracing_subscriber::fmt::layer()
        .event_format(
            json()
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
                .with_env_var("SF_DEV_LOG")
                .from_env_lossy(),
        );

    let developer_dump_layer = tracing_subscriber::fmt::layer()
        .with_writer(developer_dump_buffer) // TODO: where to write? I'm thinking circular buffer which can be used to dump last logs in case of a panic
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
