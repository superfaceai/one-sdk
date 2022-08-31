use std::io::{self, Read, Write};

use serde::Serialize;

mod wasi;

fn errno_to_ioerror(errno: wasi::Errno) -> io::Error {
	// TODO: make sure this is valid
	io::Error::from_raw_os_error(errno.raw() as i32)
}

pub enum SuperfaceStream {
	Perform,
	Http
}
impl SuperfaceStream {
	fn stream_fd(&self) -> wasi::Fd {
		match self {
			SuperfaceStream::Perform => 100,
			SuperfaceStream::Http => 101
		}
	}

	pub fn read_json(&mut self) -> io::Result<serde_json::Value> {
		let mut reader = io::BufReader::new(self);
		let value = serde_json::from_reader(&mut reader)?;
		
		Ok(value)
	}

	pub fn write_json<T: Serialize>(&mut self, value: &T) -> io::Result<()> {
		// Syscalls are expensive, buffer
		let mut writer = io::BufWriter::new(self);
		serde_json::to_writer(&mut writer, &value)?;
		writer.flush()?;

		Ok(())
	}
}
impl Read for SuperfaceStream {
	fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
		unsafe {
			wasi::sf_read(
				self.stream_fd(),
				buf.as_mut_ptr(),
				buf.len() as wasi::Size
			).map_err(errno_to_ioerror)
		}
	}
}
impl Write for SuperfaceStream {
	fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
		unsafe {
			wasi::sf_write(
				self.stream_fd(),
				buf.as_ptr(),
				buf.len()
			).map_err(errno_to_ioerror)
		}
	}

	fn flush(&mut self) -> io::Result<()> {
		unsafe {
			wasi::sf_flush(
				self.stream_fd()
			).map_err(errno_to_ioerror)
		}
	}
}

#[no_mangle]
pub extern fn test_me() -> i32 {
	eprintln!("[GUEST] Hello world");
	let mut perform = SuperfaceStream::Perform;

	let input = perform.read_json().unwrap();
	eprintln!("[GUEST] Input: {:?}", input);
	
	return -1;
}
