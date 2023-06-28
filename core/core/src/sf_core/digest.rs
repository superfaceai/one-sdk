use hex::ToHex;
use sha2::Digest;

pub fn content_hash(data: &[u8]) -> String {
    let mut hasher = sha2::Sha256::new();
    hasher.update(data);
    hasher.finalize().as_slice().encode_hex::<String>()
}
