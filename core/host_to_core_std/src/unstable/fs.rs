use std::io;

use super::stream::{IoStream, IoStreamHandle};
use crate::abi::{err_from_wasi_errno, MessageExchange, Size, StreamExchange};
#[cfg(feature = "global_exchange")]
use crate::{
    abi::{StaticMessageExchange, StaticStreamExchange},
    global_exchange::{GlobalMessageExchange, GlobalStreamExchange},
};

// Initial idea was to use the file-open message to obtain a fd from the host
// the use it with `std::fs::File::from_raw_fd`, but the ability to allocate/inject fds into
// wasi context is not available in all host runtimes (i.e. wasmtime-py does not expose this
// even though wasmtime rust crate has this API, wasmer is more complex).
//
// Instead we rely on our own read/write/close methods and only expose `Read` and `Write` for now. the `fs::File` API will still work
// but only for files which have been preopened through WASI, otherwise we'll rely on our messages and streams.

crate::abi::define_exchange! {
    struct FileOpenRequest<'a> {
        kind: "file-open",
        path: &'a str,
        // Flags same as in <https://doc.rust-lang.org/std/fs/struct.OpenOptions.html>.
        read: bool,
        write: bool,
        append: bool,
        truncate: bool,
        create: bool,
        create_new: bool,
    } -> enum FileOpenResponse {
        Ok {
            stream: IoStreamHandle
        },
        Err { errno: Size }
    }
}

/// File open options.
///
/// See [std::fs::OpenOptions].
pub struct OpenOptions {
    read: bool,
    write: bool,
    append: bool,
    truncate: bool,
    create: bool,
    create_new: bool,
}
impl Default for OpenOptions {
    fn default() -> Self {
        Self::new()
    }
}
#[allow(dead_code)]
impl OpenOptions {
    pub fn new() -> Self {
        Self {
            read: true,
            write: false,
            append: false,
            truncate: false,
            create: false,
            create_new: false,
        }
    }

    pub fn read(&mut self, read: bool) -> &mut Self {
        self.read = read;
        self
    }

    pub fn write(&mut self, write: bool) -> &mut Self {
        self.write = write;
        self
    }

    pub fn append(&mut self, append: bool) -> &mut Self {
        self.append = append;
        self
    }

    pub fn truncate(&mut self, truncate: bool) -> &mut Self {
        self.truncate = truncate;
        self
    }

    pub fn create(&mut self, create: bool) -> &mut Self {
        self.create = create;
        self
    }

    pub fn create_new(&mut self, create_new: bool) -> &mut Self {
        self.create_new = create_new;
        self
    }

    pub fn open_in<Me: MessageExchange, Se: StreamExchange>(
        &self,
        path: &str,
        message_exchange: Me,
        stream_exchange: Se,
    ) -> Result<IoStream<Se>, io::Error> {
        let response = FileOpenRequest {
            kind: FileOpenRequest::KIND,
            path,
            read: self.read,
            write: self.write,
            append: self.append,
            truncate: self.truncate,
            create: self.create,
            create_new: self.create_new,
        }
        .send_json_in(message_exchange)
        .unwrap();

        match response {
            FileOpenResponse::Ok { stream } => {
                Ok(IoStream::from_handle_in(stream, stream_exchange))
            }
            FileOpenResponse::Err { errno } => Err(err_from_wasi_errno(errno)),
        }
    }
}

#[cfg(feature = "global_exchange")]
/// Like [std::fs::read].
pub fn read(path: &str) -> Result<Vec<u8>, io::Error> {
    use std::io::Read;

    let mut file = OpenOptions::new().read(true).open_in(
        path.as_ref(),
        GlobalMessageExchange::instance(),
        GlobalStreamExchange::instance(),
    )?;

    let mut data = Vec::new();
    file.read_to_end(&mut data)?;

    Ok(data)
}

#[cfg(feature = "global_exchange")]
/// Like [std::fs::read_to_string].
pub fn read_to_string(path: &str) -> Result<String, io::Error> {
    use std::io::Read;

    let mut file = OpenOptions::new().read(true).open_in(
        path.as_ref(),
        GlobalMessageExchange::instance(),
        GlobalStreamExchange::instance(),
    )?;

    let mut data = String::new();
    file.read_to_string(&mut data)?;

    Ok(data)
}
