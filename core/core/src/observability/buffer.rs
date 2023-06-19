use std::{
    borrow::Borrow,
    io::Write,
    ops::DerefMut,
    sync::{Arc, Mutex, MutexGuard},
};

use tracing_subscriber::fmt::MakeWriter;

mod ring;
mod vec;

pub use self::{ring::RingEventBuffer, vec::VecEventBuffer};

const EVENT_SEPARATOR: u8 = b'\0';

/// Event buffer implementation.
///
/// For example it can be an unbounded buffer or a ring buffer.
pub trait TracingEventBuffer: Sized {
    type RawParts: Borrow<[(*const u8, usize)]>;

    /// Writes data into the buffer.
    ///
    /// Writing a null byte marks an event boundary.
    fn write(&mut self, data: &[u8]);

    /// Returns raw pointer and size tuples which represent the memory of the buffer.
    fn as_raw_parts(&self) -> Self::RawParts;

    /// Clears the internal buffer and removes all events.
    fn clear(&mut self);
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
        self.buffer.write(&[EVENT_SEPARATOR])
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
