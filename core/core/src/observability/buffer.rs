use std::{
    io::Write,
    ops::DerefMut,
    sync::{Arc, Mutex, MutexGuard},
};

use tracing_subscriber::fmt::MakeWriter;

/// Event buffer implementation.
///
/// For example it can be an unbounded buffer or a ring buffer.
pub trait TracingEventBuffer: Sized {
    /// Writes data into the buffer.
    ///
    /// Writing a null byte marks an event boundary.
    fn write(&mut self, data: &[u8]);

    /// Returns the bytes of the events starting at `start` including the trailing null byte.
    fn next_event_line(&self, start: usize) -> Option<&'_ [u8]>;

    /// Clears the internal buffer and removes all events.
    fn clear(&mut self);

    /// Returns an iterator over events in this buffer.
    ///
    /// This iterator does not consume the events. To clear the buffer afterwards call [TracingEventBuffer::clear].
    fn events<'a>(&'a self) -> TracingEventBufferEventsIter<'a, Self> {
        TracingEventBufferEventsIter {
            buffer: self,
            index: 0,
        }
    }
}

/// This is a tracing event buffer writer, which handles writing events and marking boundaries.
///
/// The event boundary is mentioned by this comment <https://github.com/tokio-rs/tracing/issues/1931#issuecomment-1042340765>
/// and also mentioned in the docs <https://docs.rs/tracing-subscriber/latest/tracing_subscriber/fmt/trait.MakeWriter.html#implementer-notes>,
/// so it should be valid approach to add the boundary on drop.
pub struct TracingEventBufferWriter<'a, B: TracingEventBuffer, R: DerefMut<Target = B> + 'a> {
    buffer: R,
    _phantom: std::marker::PhantomData<&'a mut B>,
}
impl<'a, B: TracingEventBuffer, R: DerefMut<Target = B> + 'a> TracingEventBufferWriter<'a, B, R> {
    pub fn new(buffer: R) -> Self {
        Self {
            buffer,
            _phantom: std::marker::PhantomData,
        }
    }
}
impl<'a, B: TracingEventBuffer, R: DerefMut<Target = B> + 'a> Write
    for TracingEventBufferWriter<'a, B, R>
{
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        debug_assert!(std::str::from_utf8(buf).is_ok());
        // IDEA: possibly trim newlines from `buf` here
        self.buffer.write(buf);

        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}
impl<'a, B: TracingEventBuffer, R: DerefMut<Target = B> + 'a> Drop
    for TracingEventBufferWriter<'a, B, R>
{
    fn drop(&mut self) {
        self.buffer.write(&[b'\0'])
    }
}

pub struct TracingEventBufferEventsIter<'a, B: TracingEventBuffer> {
    buffer: &'a B,
    index: usize,
}
impl<'a, B: TracingEventBuffer> Iterator for TracingEventBufferEventsIter<'a, B> {
    type Item = &'a str;

    fn next(&mut self) -> Option<Self::Item> {
        match self.buffer.next_event_line(self.index) {
            None => None,
            Some(event) => {
                self.index += event.len();

                Some(std::str::from_utf8(&event[..event.len() - 1]).unwrap())
            }
        }
    }
}

/// Wrapper around a [`TracingEventBuffer`](TracingEventBuffer) that can be shared between tracing and a consumer.
#[derive(Debug)]
pub struct SharedEventBuffer<B: TracingEventBuffer + 'static>(Arc<Mutex<B>>);
impl<B: TracingEventBuffer> SharedEventBuffer<B> {
    pub fn new(inner: B) -> Self {
        Self(Arc::new(Mutex::new(inner)))
    }

    pub fn lock(&self) -> MutexGuard<'_, B> {
        self.0.lock().unwrap()
    }
}
impl<B: TracingEventBuffer> Clone for SharedEventBuffer<B> {
    fn clone(&self) -> Self {
        Self(self.0.clone())
    }
}
impl<'a, B: TracingEventBuffer + 'static> MakeWriter<'a> for SharedEventBuffer<B> {
    type Writer = TracingEventBufferWriter<'a, B, MutexGuard<'a, B>>;

    fn make_writer(&'a self) -> Self::Writer {
        TracingEventBufferWriter::new(self.lock())
    }
}

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
        self.data.extend(data.into_iter().copied())
    }

    fn next_event_line(&self, start: usize) -> Option<&'_ [u8]> {
        if start >= self.data.len() {
            return None;
        }

        let sub_data = &self.data[start..];
        let end_offset = sub_data
            .iter()
            .position(|&b| b == b'\0')
            .map(|p| p + 1)
            .unwrap();

        Some(&sub_data[..end_offset])
    }

    fn clear(&mut self) {
        self.data.clear()
    }
}
impl std::fmt::Debug for VecEventBuffer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "VecBuffer(<{} events, {} bytes>)",
            self.data.iter().filter(|&&b| b == b'\0').count(),
            self.data.len()
        )
    }
}

#[cfg(test)]
mod test {
    use std::io::Write;

    use super::{TracingEventBuffer, TracingEventBufferWriter, VecEventBuffer};

    #[test]
    fn test_event_buffer_writer() {
        let mut buffer = VecEventBuffer::new();
        let event =
            "bananas are nice, this is a string\nwith a newline and 67 characters".to_string();

        // this is the pattern of usage in tracing_subscriber
        {
            let mut writer = TracingEventBufferWriter::new(&mut buffer);
            writer.write_all(event.as_bytes()).unwrap();
        }
        {
            let mut writer = TracingEventBufferWriter::new(&mut buffer);
            writer.write_all(event.as_bytes()).unwrap();
        }
        {
            let mut writer = TracingEventBufferWriter::new(&mut buffer);
            writer.write_all(event.as_bytes()).unwrap();
        }

        assert_eq!(buffer.data.len(), (event.len() + 1) * 3);
        {
            let events: Vec<&str> = buffer.events().collect();
            assert_eq!(events, vec![event.as_str(), event.as_str(), event.as_str()]);
        }

        buffer.clear();
        assert_eq!(buffer.data.len(), 0);
    }

    #[test]
    fn test_vec_buffer_next_event_line() {
        let mut buffer = VecEventBuffer::new();
        assert_eq!(buffer.next_event_line(0), None);
        assert_eq!(buffer.next_event_line(2), None);

        buffer.write(b"abcd\0efgh\0");
        assert_eq!(buffer.next_event_line(0).unwrap(), b"abcd\0");
        assert_eq!(buffer.next_event_line(5).unwrap(), b"efgh\0");
        assert_eq!(buffer.next_event_line(10), None);
    }
}
