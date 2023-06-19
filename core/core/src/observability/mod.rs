use sf_std::abi::{Ptr, Size};
use tracing::metadata::LevelFilter;
use tracing_subscriber::{
    filter::FilterFn, fmt::format, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter, Layer,
};

use self::buffer::{RingEventBuffer, SharedEventBuffer, TracingEventBuffer, VecEventBuffer};

mod macros;
pub(crate) use macros::log_metric;

mod buffer;

static mut METRICS_BUFFER: Option<SharedEventBuffer<VecEventBuffer>> = None;
static mut DEVELOPER_DUMP_BUFFER: Option<SharedEventBuffer<RingEventBuffer>> = None;

/// SAFETY: must only be called once during initialization of the program
pub unsafe fn init(ring_event_buffer_size: usize) {
    // SAFETY: this is only called once and there is no asynchronous mutation
    unsafe {
        METRICS_BUFFER.replace(SharedEventBuffer::new(VecEventBuffer::new()));
        DEVELOPER_DUMP_BUFFER.replace(SharedEventBuffer::new(RingEventBuffer::new(
            ring_event_buffer_size,
        )));

        init_tracing(
            METRICS_BUFFER.as_ref().cloned().unwrap(),
            DEVELOPER_DUMP_BUFFER.as_ref().cloned().unwrap(),
        );
    }
}

fn init_tracing(
    metrics_buffer: SharedEventBuffer<VecEventBuffer>,
    developer_dump_buffer: SharedEventBuffer<RingEventBuffer>,
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
                .with_env_var("ONESDK_LOG")
                .from_env_lossy(),
        );

    let metrics_layer = tracing_subscriber::fmt::layer()
        .event_format(
            format::json()
                .without_time() // we add our own time as a field
                .with_level(false)
                .flatten_event(true)
                .with_target(false)
                .with_file(false)
                .with_line_number(false)
                .with_current_span(false)
                .with_span_list(false)
                .with_thread_names(false)
                .with_thread_ids(false),
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
                .with_env_var("ONESDK_DEV_LOG")
                .from_env_lossy(),
        );

    let developer_dump_layer = tracing_subscriber::fmt::layer()
        .event_format(
            format::format().with_ansi(false), // disable ansi colors because this will usually go into a file
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

#[repr(C)]
pub struct FatPointer {
    pub ptr: Ptr<u8>,
    pub size: Size,
}
impl FatPointer {
    pub const fn null() -> Self {
        Self {
            ptr: Ptr::null(),
            size: 0,
        }
    }
}
static mut BUFFER_RETURN_ARENA: [FatPointer; 2] = [FatPointer::null(), FatPointer::null()];

#[no_mangle]
#[export_name = "oneclient_core_get_metrics"]
/// Returns two fat pointers to memory where metrics are stored.
///
/// The first one will point to the head of the buffer up to its end.
/// The second one will point from the beginning buffer up to its tail. The second pointer may be null or have zero length.
/// Each metric is a UTF-8 encoded JSON string and is terminated by a null byte.
pub extern "C" fn __export_oneclient_core_get_metrics() -> Ptr<[FatPointer; 2]> {
    let [(ptr, size)] = unsafe { METRICS_BUFFER.as_ref().unwrap().lock().as_raw_parts() };

    unsafe {
        BUFFER_RETURN_ARENA[0].ptr = ptr.into();
        BUFFER_RETURN_ARENA[0].size = size;
        BUFFER_RETURN_ARENA[1].ptr = Ptr::null();
        BUFFER_RETURN_ARENA[1].size = 0;

        Ptr::from((&BUFFER_RETURN_ARENA) as *const [FatPointer; 2])
    }
}

#[no_mangle]
#[export_name = "oneclient_core_clear_metrics"]
/// Clears the metrics buffer.
///
/// This should be called after [__export_oneclient_core_get_metrics] is called and the metrics are processed.
pub extern "C" fn __export_oneclient_core_clear_metrics() {
    unsafe {
        METRICS_BUFFER.as_ref().unwrap().lock().clear();
    }
}

#[no_mangle]
#[export_name = "oneclient_core_get_developer_dump"]
/// Returns two fat pointer to memory where the developer dump is stored.
///
/// The first one will point to the head of the buffer up to its end.
/// The second one will point from the beginning buffer up to its tail. The second pointer may be null or have zero length.
/// Each event is a UTF-8 encoded string and is terminated by a null byte.
pub extern "C" fn __export_oneclient_core_get_developer_dump() -> Ptr<[FatPointer; 2]> {
    let [(ptr1, size1), (ptr2, size2)] = unsafe {
        DEVELOPER_DUMP_BUFFER
            .as_ref()
            .unwrap()
            .lock()
            .as_raw_parts()
    };

    unsafe {
        BUFFER_RETURN_ARENA[0].ptr = ptr1.into();
        BUFFER_RETURN_ARENA[0].size = size1;
        BUFFER_RETURN_ARENA[1].ptr = ptr2.into();
        BUFFER_RETURN_ARENA[1].size = size2;

        Ptr::from((&BUFFER_RETURN_ARENA) as *const [FatPointer; 2])
    }
}
