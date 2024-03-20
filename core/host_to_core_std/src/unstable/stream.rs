use serde::{Deserialize, Serialize};

use crate::abi::{Handle, StaticStreamExchange, StreamExchange};
#[cfg(feature = "global_exchange")]
use crate::global_exchange::GlobalStreamExchange;

/// Represents an IoStream handle without an exchange.
///
/// This is used to represent a state where a handle has been deserialized but the deserialized cannot know what exchange should be associated with it.
#[derive(Debug, PartialEq, Eq)]
pub struct IoStreamHandle(Handle);
impl IoStreamHandle {
    #[cfg(test)]
    pub(crate) fn from_raw_handle(handle: Handle) -> Self {
        Self(handle)
    }
}
impl Serialize for IoStreamHandle {
    fn serialize<S: serde::Serializer>(&self, ser: S) -> Result<S::Ok, S::Error> {
        self.0.serialize(ser)
    }
}
impl<'de> Deserialize<'de> for IoStreamHandle {
    fn deserialize<D: serde::Deserializer<'de>>(de: D) -> Result<Self, D::Error> {
        Handle::deserialize(de).map(Self)
    }
}

#[cfg(feature = "global_exchange")]
pub type GlobalIoStream = IoStream<GlobalStreamExchange>;

/// Stream which can be read from or written to.
///
/// Not all streams can be both read from and written to, those will return an error.
pub struct IoStream<E: StreamExchange>(Handle, E);
impl<E: StaticStreamExchange> IoStream<E> {
    pub fn from_handle(handle: IoStreamHandle) -> Self {
        Self::from_handle_in(handle, E::instance())
    }
}
impl<E: StreamExchange> IoStream<E> {
    pub fn from_handle_in(handle: IoStreamHandle, exchange: E) -> Self {
        Self(handle.0, exchange)
    }

    pub fn into_handle(self) -> IoStreamHandle {
        IoStreamHandle(self.0)
    }
}
impl<E: StreamExchange> std::io::Read for IoStream<E> {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        self.1.read(self.0, buf)
    }
}
impl<E: StreamExchange> std::io::Write for IoStream<E> {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        self.1.write(self.0, buf)
    }

    fn flush(&mut self) -> std::io::Result<()> {
        // TODO: this is a no-op right now
        Ok(())
    }
}
impl<E: StreamExchange> Drop for IoStream<E> {
    fn drop(&mut self) {
        self.1.close(self.0).unwrap()
    }
}
impl<E: StreamExchange> std::fmt::Debug for IoStream<E> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_tuple("IoStream").field(&self.0).finish()
    }
}
impl<E: StreamExchange> PartialEq for IoStream<E> {
    fn eq(&self, other: &Self) -> bool {
        self.0 == other.0
    }
}
impl<E: StreamExchange> Eq for IoStream<E> {}
