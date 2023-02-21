use std::sync::Mutex;

mod sf_core;
mod sf_std;

use sf_core::SuperfaceCore;

static GLOBAL_STATE: Mutex<Option<SuperfaceCore>> = Mutex::new(None);

extern "C" {
    fn __wasm_call_ctors();
    fn __wasm_call_dtors();
}

#[no_mangle]
#[export_name = "superface_core_setup"]
/// Initializes persistent core state.
///
/// This function must not be called twice without calling teardown in between.
pub extern "C" fn __export_superface_core_setup() {
    unsafe { __wasm_call_ctors() };
    println!("core: superface_core_setup called");

    let mut lock = GLOBAL_STATE.lock().unwrap();
    if lock.is_some() {
        panic!("Already setup");
    }

    // here we panic on error because there is nothing to teardown
    lock.replace(SuperfaceCore::new().unwrap());
}

#[no_mangle]
#[export_name = "superface_core_teardown"]
/// Tears down persistent core state.
///
/// This function must be called exactly once after calling core setup.
pub extern "C" fn __export_superface_core_teardown() {
    println!("core: superface_core_teardown called");
    unsafe { __wasm_call_dtors() };

    let mut lock = GLOBAL_STATE.lock().unwrap(); // TODO: this will usually fail if perform panicked - decide what to do
    if lock.is_none() {
        panic!("Not setup or already teardown");
    }

    let state = lock.take();
    std::mem::drop(state); // just to be explicit, would be dropped implicitly anyway
}

#[no_mangle]
#[export_name = "superface_core_perform"]
/// Executes perform.
///
/// All information about map to be performed will be retrieved through messages.
pub extern "C" fn __export_superface_core_perform() {
    let mut lock = GLOBAL_STATE.lock().unwrap();
    let state: &mut SuperfaceCore = lock.as_mut().unwrap();

    let result = state.perform();
    if let Err(err) = result {
        // if there is an error here that means the core couldn't send a message
        // to the host
        // TODO: should be call teardown and abort or let the host call teardown?
        println!("core: perform error: {}", err);
    }
}
