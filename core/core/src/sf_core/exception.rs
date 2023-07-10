use interpreter_js::JsInterpreterError;
use map_std::unstable::security::PrepareSecurityMapError;
use sf_std::unstable::perform::{PerformException, TakePerformInputError};

use super::cache::DocumentCacheError;

pub struct PerformExceptionError {
    pub error_code: String,
    pub message: String,
}
impl<PostProcessError: std::error::Error> From<DocumentCacheError<PostProcessError>>
    for PerformExceptionError
{
    fn from(value: DocumentCacheError<PostProcessError>) -> Self {
        PerformExceptionError {
            error_code: "DocumentCacheError".to_string(),
            message: value.to_string(),
        }
    }
}
impl From<PrepareSecurityMapError> for PerformExceptionError {
    fn from(value: PrepareSecurityMapError) -> Self {
        PerformExceptionError {
            error_code: "PrepareSecurityMapError".to_string(),
            message: value.to_string(),
        }
    }
}
impl From<JsInterpreterError> for PerformExceptionError {
    fn from(value: JsInterpreterError) -> Self {
        PerformExceptionError {
            error_code: "JsInterpreterError".to_string(),
            message: value.to_string(),
        }
    }
}
impl From<TakePerformInputError> for PerformExceptionError {
    fn from(value: TakePerformInputError) -> Self {
        PerformExceptionError {
            error_code: "TakePerformInputError".to_string(),
            message: value.to_string(),
        }
    }
}
impl From<PerformExceptionError> for PerformException {
    fn from(value: PerformExceptionError) -> Self {
        PerformException {
            error_code: value.error_code,
            message: value.message,
        }
    }
}
