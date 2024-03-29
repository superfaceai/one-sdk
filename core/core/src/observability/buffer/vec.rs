use crate::observability::buffer::EVENT_SEPARATOR;

use super::TracingEventBuffer;

/// Inbounded buffer backed by `Vec<u8>`.
pub struct VecEventBuffer {
    /// Each event is terminated by a null byte. Otherwise there can be no null bytes in the strings because they are utf-8.
    data: Vec<u8>,
}
impl VecEventBuffer {
    pub fn new() -> Self {
        Self { data: Vec::new() }
    }
}
impl TracingEventBuffer for VecEventBuffer {
    fn write(&mut self, data: &[u8]) {
        self.data.extend(data.iter().copied())
    }

    fn as_raw_parts(&self) -> [(*const u8, usize); 2] {
        [(self.data.as_ptr(), self.data.len()), (std::ptr::null(), 0)]
    }

    fn clear(&mut self) {
        self.data.clear();
    }
}
impl std::fmt::Debug for VecEventBuffer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "VecBuffer(<{} events, {} bytes>)",
            self.data.iter().filter(|&&b| b == EVENT_SEPARATOR).count(),
            self.data.len()
        )
    }
}
