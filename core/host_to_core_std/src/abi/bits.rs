//! Here we define bit sizes of types we need.
//!
//! We can mostly rely on rust `usize` which is both pointer- and `size_t`-sized.
//! We use unsigned types to avoid sign extension trouble.
//!
//! These definitions also allow us to compile tests on 64-bit platforms without breaking.

/// ABI pointer-sized type.
// pub type Ptr = usize;
#[repr(transparent)]
pub struct Ptr<T>(usize, std::marker::PhantomData<*mut T>);
impl<T> Ptr<T> {
    pub const fn null() -> Self {
        Self(0, std::marker::PhantomData)
    }

    pub fn ptr(&self) -> *const T {
        self.0 as *const T
    }

    pub fn mut_ptr(&mut self) -> *mut T {
        self.0 as *mut T
    }
}
impl<T> From<*const T> for Ptr<T> {
    fn from(value: *const T) -> Self {
        Self(value as usize, std::marker::PhantomData)
    }
}
impl<T> From<*mut T> for Ptr<T> {
    fn from(value: *mut T) -> Self {
        Self(value as usize, std::marker::PhantomData)
    }
}
impl<T> std::fmt::Debug for Ptr<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "<{}>0x{:X}", std::any::type_name::<T>(), self.0)
    }
}

/// ABI `size_t`-sized type.
///
/// See <https://en.cppreference.com/w/c/types/size_t>.
pub type Size = usize;
/// ABI pair representation.
///
/// The actual type used in FFI to represent a pair.
pub type AbiPairRepr = Size;

/// Opaque resource identifier.
pub type Handle = u32;

/// Struct representing a pair of `(Size, Size)` in ABI.
///
/// Generic parameters `LOWER_BITS` can be used to choose how many bits to allocate for
/// the lower portion of the pair.
///
/// For example, on 32bit targets it makes sense to allocate only 1 bit
/// for the upper portion and achieve 31/1 split. On 64bit targets we can use 48/16 split, since sizes
/// are usually not bigger than 2^48.
///
/// This encoding is not suitable for transferring pointers.
pub struct AbiPair<const LOWER_BITS: usize>(pub Size, pub Size);
impl<const LOWER_BITS: usize> AbiPair<LOWER_BITS> {
    const LOWER_MASK: AbiPairRepr = ((1 as AbiPairRepr) << LOWER_BITS) - 1;
}
impl<const LOWER_BITS: usize> From<AbiPairRepr> for AbiPair<LOWER_BITS> {
    fn from(value: AbiPairRepr) -> Self {
        let lower = (value & Self::LOWER_MASK) as Size;
        let upper = (value >> LOWER_BITS) as Size;

        Self(lower, upper)
    }
}
impl<const LOWER_BITS: usize> From<AbiPair<LOWER_BITS>> for AbiPairRepr {
    fn from(pair: AbiPair<LOWER_BITS>) -> Self {
        let lower = pair.0 as AbiPairRepr;
        let upper = (pair.1 as AbiPairRepr) << LOWER_BITS;

        lower | upper
    }
}
impl<const LOWER_BITS: usize> std::fmt::Debug for AbiPair<LOWER_BITS> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "AbiPair(lower: {}, upper: {})", self.0, self.1)
    }
}
