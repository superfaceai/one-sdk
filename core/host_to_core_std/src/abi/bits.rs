//! Here we define bit sizes of types we need.
//!
//! We can mostly rely on rust `usize` which is both pointer- and `size_t`-sized.
//! We use unsigned types to avoid sign extension trouble.
//!
//! These definitions also allow us to compile tests on 64-bit platforms without breaking.

/// ABI pointer-sized type.
pub type Ptr = usize;
/// ABI `size_t`-sized type.
///
/// See <https://en.cppreference.com/w/c/types/size_t>.
pub type Size = usize;
/// ABI pair representation.
///
/// The actual type used in FFI to represent a pair.
pub type PairRepr = u64;

/// Struct representing a pair of `(Size, Size)` in ABI.
///
/// On 32-bit platforms we rely on using `i64` to store two `i32`s. However since `u128` is not
/// FFI-safe, we cannot do the same thing on 64bit platforms (x86_64, wasm64, aarch64), so we split
/// 64 bits to 48/16. This is __usually__ right since sizes are not expected to be greater than 48 bits in practice, and
/// we do not transfer pointers using these pairs.
pub struct AbiPair(pub Size, pub Size);
impl AbiPair {
	#[cfg(target_pointer_width = "32")]
	const LOWER_BITS: usize = 32;
	#[cfg(target_pointer_width = "64")]
	const LOWER_BITS: usize = 48;
	const LOWER_MASK: PairRepr = ((1 as PairRepr) << Self::LOWER_BITS) - 1;
}
impl From<PairRepr> for AbiPair {
	fn from(value: PairRepr) -> Self {
		let lower = (value & Self::LOWER_MASK) as Size;
		let upper = (value >> Self::LOWER_BITS) as Size;

		Self(lower, upper)
	}
}
impl From<AbiPair> for PairRepr {
	fn from(pair: AbiPair) -> Self {
		let lower = pair.0 as PairRepr;
		let upper = (pair.1 as PairRepr) << AbiPair::LOWER_BITS;

		lower | upper
	}
}
impl std::fmt::Debug for AbiPair {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		write!(f, "AbiPair(lower: {}, upper: {})", self.0, self.1)
	}
}