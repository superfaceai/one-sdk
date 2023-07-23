use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PerformException {
    pub error_code: String, // TODO: should this be an enum?
    pub message: String,
}
impl std::fmt::Display for PerformException {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}]: {}", self.error_code, self.message)
    }
}
