use std::io::{Read, Write};

use crate::sf_core::{HttpResponse, IoStream};

pub enum StreamEntry {
    Io(IoStream),
    /// Buffered streams are currently implemented for body logging
    Peekable(PeekableStream),
}
impl From<IoStream> for StreamEntry {
    fn from(value: IoStream) -> Self {
        Self::Io(value)
    }
}
impl From<PeekableStream> for StreamEntry {
    fn from(value: PeekableStream) -> Self {
        Self::Peekable(value)
    }
}
impl From<HttpResponse> for StreamEntry {
    fn from(value: HttpResponse) -> Self {
        Self::Io(value.into_body())
    }
}
impl Read for StreamEntry {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        match self {
            Self::Io(i) => i.read(buf),
            Self::Peekable(i) => i.read(buf),
        }
    }
}
impl Write for StreamEntry {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        match self {
            Self::Io(i) => i.write(buf),
            Self::Peekable(i) => i.write(buf),
        }
    }

    fn flush(&mut self) -> std::io::Result<()> {
        match self {
            Self::Io(i) => i.flush(),
            Self::Peekable(i) => i.flush(),
        }
    }
}

pub struct PeekableStream {
    buffer: Vec<u8>,
    inner: IoStream,
}
impl PeekableStream {
    pub fn peek(&mut self, count: usize) -> std::io::Result<&[u8]> {
        let count = if self.buffer.len() < count {
            // calculate how many bytes are needed to fill buffer up to `count`
            // and resize the buffer to reserve the memory
            // IDEA: this could be optimized using unsafe, but is it worth it?
            let mut needed = count - self.buffer.len();
            self.buffer.resize(count, 0);

            while needed > 0 {
                let filled = self.buffer.len() - needed;
                match self.inner.read(&mut self.buffer[filled..])? {
                    0 => break,
                    n => {
                        needed -= n;
                    }
                }
            }

            // needed still contains number of bytes needed to fill the buffer up to `count`
            // but we broke out of the loop because of zero read, so calculate the final len
            let final_len = count - needed;
            self.buffer.truncate(final_len);
            final_len
        } else {
            count
        };

        Ok(&self.buffer[..count])
    }
}
impl From<IoStream> for PeekableStream {
    fn from(value: IoStream) -> Self {
        PeekableStream {
            buffer: Vec::new(),
            inner: value,
        }
    }
}
impl Read for PeekableStream {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        if self.buffer.len() > 0 {
            // calculate how much to read from the buffer
            let count = self.buffer.len().min(buf.len());
            buf[..count].copy_from_slice(&self.buffer[..count]);
            // shift the remaining bytes within `buffer` to the front and truncate
            self.buffer.copy_within(count.., 0);
            self.buffer.truncate(self.buffer.len() - count);

            return Ok(count);
        }

        self.inner.read(buf)
    }
}
impl Write for PeekableStream {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        // TODO: we probably don't care about this
        self.inner.write(buf)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        self.inner.flush()
    }
}
