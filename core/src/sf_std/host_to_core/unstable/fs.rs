use std::io;

use serde::{Deserialize, Serialize};

use super::{IoStream, MessageExchange, EXCHANGE_MESSAGE};
use crate::sf_std::abi::{err_from_wasi_errno, Size};

// Initial idea was to use the file-open message to obtain a fd from the host
// the use it with `std::fs::File::from_raw_fd`, but the ability to allocate/inject fds into
// wasi context is not available in all host runtimes (i.e. wasmtime-py does not expose this
// even though wasmtime rust crate has this API, wasmer is more complex).
//
// Instead we rely on our own read/write/close methods and only expose `Read` and `Write` for now. the `fs::File` API will still work
// but only for files which have been preopened through WASI, otherwise we'll rely on out messages and streams.

define_exchange! {
    struct InFileOpen<'a> {
        kind: "file-open",
        path: &'a str,
        // Flags same as in <https://doc.rust-lang.org/std/fs/struct.OpenOptions.html>.
        read: bool,
        write: bool,
        append: bool,
        truncate: bool,
        create: bool,
        create_new: bool,
    } -> enum OutFileOpen {
        Ok {
            stream: IoStream
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

    pub fn open(&self, path: &str) -> Result<IoStream, io::Error> {
        let response = InFileOpen {
            kind: InFileOpen::KIND,
            path,
            read: self.read,
            write: self.write,
            append: self.append,
            truncate: self.truncate,
            create: self.create,
            create_new: self.create_new,
        }
        .send_json(&EXCHANGE_MESSAGE)
        .unwrap();

        match response {
            OutFileOpen::Ok { stream } => Ok(stream),
            OutFileOpen::Err { errno } => Err(err_from_wasi_errno(errno)),
        }
    }
}
