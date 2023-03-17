//! WASI errno definitions.
//!
//! See <https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-errno-variant>.

use super::bits;

/// ABI result representation.
///
/// The actual type used in FFI to represent result enum.
pub type ResultRepr = bits::PairRepr;

/// Enum representing a `Result<Size>` in ABI.
///
/// This is represented as a pair of `(value, tag)` - tag is smaller than the value on 64-bit platforms.
pub enum AbiResult {
	Ok(bits::Size),
	Err(bits::Size),
}
impl AbiResult {
	const TAG_OK: bits::Size = 0;
	const TAG_ERR: bits::Size = 1;

	pub fn into_io_result(self) -> std::io::Result<bits::Size> {
		match self {
			Self::Ok(value) => Ok(value),
			Self::Err(err) => Err(err_from_wasi_errno(err)),
		}
	}
}
impl From<ResultRepr> for AbiResult {
	fn from(value: ResultRepr) -> Self {
		let bits::AbiPair(value, tag) = bits::AbiPair::from(value);

		match tag {
			Self::TAG_OK => Self::Ok(value),
			Self::TAG_ERR => Self::Err(value),
			_ => panic!("Invalid tag {} for AbiResult", tag),
		}
	}
}
impl From<AbiResult> for ResultRepr {
	fn from(value: AbiResult) -> Self {
		match value {
			AbiResult::Ok(value) => bits::AbiPair(value, AbiResult::TAG_OK),
			AbiResult::Err(value) => bits::AbiPair(value, AbiResult::TAG_ERR),
		}
		.into()
	}
}

pub fn err_from_wasi_errno(errno: bits::Size) -> std::io::Error {
	std::io::Error::from_raw_os_error(errno as i32)
}
