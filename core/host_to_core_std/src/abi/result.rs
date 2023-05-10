//! WASI errno definitions.
//!
//! See <https://github.com/WebAssembly/WASI/blob/main/phases/snapshot/docs.md#-errno-variant>.

use super::bits::{AbiPair, AbiPairRepr, Size};

/// ABI result representation.
///
/// The actual type used in FFI to represent result enum.
pub type AbiResultRepr = AbiPairRepr;

/// Enum representing a `Result<Size>` in ABI.
///
/// This is represented as a pair of `(value, tag)`.
/// On 32bit platforms that is 1bit, on 64bit platforms tab is 16 bits.
pub enum AbiResult {
    Ok(Size),
    Err(Size),
}
impl AbiResult {
    #[cfg(target_pointer_width = "32")]
    const LOWER_BITS: usize = 31;
    #[cfg(target_pointer_width = "64")]
    const LOWER_BITS: usize = 48;

    const TAG_OK: Size = 0;
    const TAG_ERR: Size = 1;

    pub fn into_io_result(self) -> std::io::Result<Size> {
        match self {
            Self::Ok(value) => Ok(value),
            Self::Err(err) => Err(err_from_wasi_errno(err)),
        }
    }
}
impl From<AbiResultRepr> for AbiResult {
    fn from(value: AbiResultRepr) -> Self {
        let AbiPair(value, tag) = AbiPair::<{ Self::LOWER_BITS }>::from(value);

        match tag {
            Self::TAG_OK => Self::Ok(value),
            Self::TAG_ERR => Self::Err(value),
            _ => panic!("Invalid tag {} for AbiResult", tag),
        }
    }
}
impl From<AbiResult> for AbiResultRepr {
    fn from(value: AbiResult) -> Self {
        match value {
            AbiResult::Ok(value) => AbiPair::<{ AbiResult::LOWER_BITS }>(value, AbiResult::TAG_OK),
            AbiResult::Err(value) => AbiPair(value, AbiResult::TAG_ERR),
        }
        .into()
    }
}

pub fn err_from_wasi_errno(errno: Size) -> std::io::Error {
    std::io::Error::from_raw_os_error(errno as i32)
}
