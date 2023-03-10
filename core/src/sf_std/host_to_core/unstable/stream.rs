use serde::{Deserialize, Serialize};

use super::STREAM_IO;

/// Stream which can be read from or written to.
///
/// Not all streams can be both read from and written to, those will return an error.
#[derive(Debug, PartialEq, Eq)]
pub struct IoStream(usize);
impl IoStream {
    pub(in crate::sf_std) fn from_raw_handle(handle: usize) -> Self {
        Self(handle)
    }

    // pub(in crate::sf_std) fn to_raw_handle(&self) -> usize {
    //     self.0
    // }
}
impl std::io::Read for IoStream {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        STREAM_IO.read(self.0, buf)
    }
}
impl std::io::Write for IoStream {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        STREAM_IO.write(self.0, buf)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        // this is a no-op right now
        Ok(())
    }
}
impl Drop for IoStream {
    fn drop(&mut self) {
        STREAM_IO.close(self.0).unwrap()
    }
}
impl Serialize for IoStream {
    fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
        self.0.serialize(ser)
    }
}
impl<'de> Deserialize<'de> for IoStream {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<IoStream, D::Error> {
        usize::deserialize(de).map(IoStream::from_raw_handle)
    }
}
