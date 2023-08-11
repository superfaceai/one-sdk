use std::{borrow::Cow, ops::Deref};

use sf_std::abi::{Ptr, Size};
use tracing::metadata::LevelFilter;
use tracing_subscriber::{
    filter::FilterFn, fmt::format, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter, Layer,
};

use self::buffer::{RingEventBuffer, SharedEventBuffer, TracingEventBuffer, VecEventBuffer};
use crate::sf_core::CoreConfiguration;

mod buffer;
pub mod metrics;

static mut METRICS_BUFFER: Option<SharedEventBuffer<VecEventBuffer>> = None;
static mut DEVELOPER_DUMP_BUFFER: Option<SharedEventBuffer<RingEventBuffer>> = None;

/// SAFETY: must only be called once during initialization of the program
pub unsafe fn init(config: &CoreConfiguration) {
    // SAFETY: this is only called once and there is no asynchronous mutation
    unsafe {
        METRICS_BUFFER.replace(SharedEventBuffer::new(VecEventBuffer::new()));
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

    // add panic hook so we can log panics as metrics
    std::panic::set_hook(Box::new(|info| {
        let message: Cow<'_, str> = if let Some(message) = info.payload().downcast_ref::<&str>() {
            (*message).into()
        } else if let Some(message) = info.payload().downcast_ref::<String>() {
            message.as_str().into()
        } else {
            format!("{}", info).into()
        };

        metrics::log_metric!(
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
unsafe fn clear_return_arena() -> Ptr<[FatPointer; 2]> {
    unsafe {
        BUFFER_RETURN_ARENA[0].ptr = Ptr::null();
        BUFFER_RETURN_ARENA[0].size = 0;
        BUFFER_RETURN_ARENA[1].ptr = Ptr::null();
        BUFFER_RETURN_ARENA[1].size = 0;

        Ptr::from((&BUFFER_RETURN_ARENA) as *const [FatPointer; 2])
    }
}
unsafe fn set_return_arena_from(buffer: &impl TracingEventBuffer) -> Ptr<[FatPointer; 2]> {
    let [(ptr1, size1), (ptr2, size2)] = buffer.as_raw_parts();

    unsafe {
        BUFFER_RETURN_ARENA[0].ptr = ptr1.into();
        BUFFER_RETURN_ARENA[0].size = size1;
        BUFFER_RETURN_ARENA[1].ptr = ptr2.into();
        BUFFER_RETURN_ARENA[1].size = size2;

        Ptr::from((&BUFFER_RETURN_ARENA) as *const [FatPointer; 2])
    }
}

#[no_mangle]
#[export_name = "oneclient_core_get_metrics"]
/// Returns two fat pointers to memory where metrics are stored.
///
/// The first one will point to the head of the buffer up to its end.
/// The second one will point from the beginning buffer up to its tail. The second pointer may be null or have zero length.
/// Each metric is a UTF-8 encoded JSON string and is terminated by a null byte.
pub extern "C" fn __export_oneclient_core_get_metrics() -> Ptr<[FatPointer; 2]> {
    tracing::debug!("Getting metrics buffer");

    unsafe {
        match METRICS_BUFFER {
            Some(ref b) => set_return_arena_from(b.lock().deref()),
            None => clear_return_arena(),
        }
    }
}

#[no_mangle]
#[export_name = "oneclient_core_clear_metrics"]
/// Clears the metrics buffer.
///
/// This should be called after [__export_oneclient_core_get_metrics] is called and the metrics are processed.
pub extern "C" fn __export_oneclient_core_clear_metrics() {
    tracing::trace!("Clearing metrics buffer");

    unsafe {
        if let Some(ref buffer) = METRICS_BUFFER {
            buffer.lock().clear();
        }
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
    unsafe {
        match DEVELOPER_DUMP_BUFFER {
            Some(ref b) => set_return_arena_from(b.lock().deref()),
            None => clear_return_arena(),
        }
    }
}
