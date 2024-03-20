use std::ops::Deref;

use wasm_abi::{Ptr, Size};

use oneclient_core::observability::{
    buffer::TracingEventBuffer, DEVELOPER_DUMP_BUFFER, METRICS_BUFFER,
};

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
