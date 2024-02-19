use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub enum PerformExceptionErrorCode {
    DocumentCacheError,
    InputValidationError,
    JsInterpreterError,
    ParametersFormatError,
    PrepareSecurityMapError,
    PrepareServicesMapError,
    ReplacementStdlibError,
    TakeInputError,
}
impl std::fmt::Display for PerformExceptionErrorCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PerformExceptionErrorCode::DocumentCacheError => write!(f, "DocumentCacheError"),
            PerformExceptionErrorCode::InputValidationError => write!(f, "InputValidationError"),
            PerformExceptionErrorCode::JsInterpreterError => write!(f, "JsInterpreterError"),
            PerformExceptionErrorCode::ParametersFormatError => write!(f, "ParametersFormatError"),
            PerformExceptionErrorCode::PrepareSecurityMapError => {
                write!(f, "PrepareSecurityMapError")
            }
            PerformExceptionErrorCode::PrepareServicesMapError => {
                write!(f, "PrepareServicesMapError")
            }
            PerformExceptionErrorCode::ReplacementStdlibError => {
                write!(f, "ReplacementStdlibError")
            }
            PerformExceptionErrorCode::TakeInputError => write!(f, "TakeInputError"),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PerformException {
    pub error_code: PerformExceptionErrorCode,
    pub message: String,
}
impl std::fmt::Display for PerformException {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}]: {}", self.error_code, self.message)
    }
}
