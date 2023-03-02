//! # Core <-> Integration communication
//!
//! This can be understood as the standard library provided by Core to the Integration.

/// Macro which defines known the message exchanges.
///
/// Defines an enum with tuple variants, each variant carrying the message struct.
///
/// ```
/// define_exchanges! {
///
/// }
/// ```
macro_rules! define_exchanges {
    (
        pub enum $name: ident {

        }
    ) => {};
}

pub mod unstable;

fn mem_as_str(memory: &[u8], ptr: i32, len: i32) -> &str {
    // TODO: error handling
    std::str::from_utf8(&memory[ptr as usize..][..len as usize]).unwrap()
}

// Because it is prone to bugs, Wasmi does not implement trait `WasmType` for `usize` - which is the backing type of our `Ptr` and `Size`.
//
// We however do want to tie them together. We are assuming the core runs in WASM and that if it is wasm64 so is wasmi.
// If this assumption changes later we need to figure out where to split the definitions.
#[cfg(target_pointer_width = "32")]
type PtrWasmi = u32;
#[cfg(target_pointer_width = "64")]
type PtrWasmi = u64;

#[cfg(target_pointer_width = "32")]
type SizeWasmi = u32;
#[cfg(target_pointer_width = "64")]
type SizeWasmi = u64;
