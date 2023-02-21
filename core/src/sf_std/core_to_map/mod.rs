//! # Core <-> Integration communication
//!
//! This can be understood as the standard library provided by Core to the Integration.

pub mod unstable;

fn mem_as_str(memory: &[u8], ptr: i32, len: i32) -> &str {
    // TODO: error handling
    std::str::from_utf8(&memory[ptr as usize..][..len as usize]).unwrap()
}
