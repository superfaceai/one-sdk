use std::os::wasi::prelude::{FromRawFd, AsRawFd};

use anyhow::Context;
use tokio::{
	net::{TcpListener, TcpStream}, io::AsyncReadExt
};

#[link(wasm_import_module = "superface_unstable")]
extern "C" {
	pub fn sock_open(arg0: i32, arg1: i32) -> i32;
}

#[tokio::main(flavor = "current_thread")]
async fn main() -> anyhow::Result<()> {
	eprintln!("[GUEST] Hello world");

	let listener = {
		let raw_fd = unsafe { sock_open(1, -5432) };
		let listener = unsafe { std::net::TcpListener::from_raw_fd(raw_fd) };
		listener.set_nonblocking(true).context("Failed to set non-blocking")?;

		TcpListener::from_std(listener).context("Failed to create tokio tcp listener")?
	};

	loop {
		eprintln!("[GUEST] Waiting for connection");
		let (stream, _) = listener.accept().await?;
		eprintln!("[GUEST] Accepted connection {}", stream.as_raw_fd());

		tokio::spawn(
			async move {
				process_stream(stream).await.unwrap()
			}
		);
	}
}

async fn process_stream(mut stream: TcpStream) -> anyhow::Result<()> {
	let mut buffer = [0u8; 256];
	loop {
		eprintln!("[GUEST] Reading from {}", stream.as_raw_fd());
		match stream.read(&mut buffer[..]).await.context("Failed to read stream")? {
			0 => break,
			n => {
				let slice = &buffer[..n];

				match std::str::from_utf8(slice) {
					Ok(string) => eprintln!("[GUEST] Read {} utf-8 bytes: {}", n, string),
					Err(_) => eprintln!("[GUEST] Read {} bytes: {:?}", n, slice)
				}
			}
		}
	}
	
	eprintln!("[GUEST] Finished with {}", stream.as_raw_fd());
	Ok(())
}
