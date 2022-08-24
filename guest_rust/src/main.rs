use anyhow::Context;

#[link(wasm_import_module = "superface_unstable")]
extern "C" {
	// pub fn http_send();
	// pub fn http_recv();

	/// Read input in JSON format.
	///
	/// Args: &mut str (json)
	pub fn input_read(str_offset: i32, str_size: i32, read_offset: i32) -> i32;
	/// Write result in JSON format.
	/// 
	/// Args: &str
	pub fn result_write(str_offset: i32, str_size: i32);
}

fn main() -> anyhow::Result<()> {
	eprintln!("[GUEST] Hello world");

	let input = read_input();
	eprintln!("[GUEST] Input: {:?}", input);

	Ok(())
}

fn read_input() -> anyhow::Result<serde_json::Value> {
	// 16 to test the process
	const BUFFER_SIZE_STEP: usize = 16;

	let mut buffer: Vec<u8> = Vec::with_capacity(BUFFER_SIZE_STEP);
	let mut read_count: wasi::Size = 0;

	loop {
		if buffer.len() == buffer.capacity() {
			buffer.reserve(BUFFER_SIZE_STEP);
		}
		let buffer_offset = unsafe { buffer.as_mut_ptr().add(buffer.len()) } as i32;
		let buffer_size = (buffer.capacity() - buffer.len()) as i32;

		match unsafe {
			input_read(
				buffer_offset,
				buffer_size,
				&mut read_count as *mut _ as i32
			)
		} {
			0 => match read_count {
				0 => break,
				n => {
					unsafe { buffer.set_len(buffer.len() + n) }
				}
			},
			code => anyhow::bail!("Failed to read input: {}", code)
		}
	}

	Ok(
		serde_json::from_slice(&buffer).context("Failed to parse JSON string")?
	)
}