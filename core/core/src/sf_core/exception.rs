use interpreter_js::JsInterpreterError;
use map_std::unstable::security::PrepareSecurityMapError;
use sf_std::unstable::perform::{TakePerformInputError, PerformException};

use super::cache::DocumentCacheError;

pub struct PerformExceptionError {
    pub error_core: String,
    pub message: String,
}
impl<PostProcessError: std::error::Error> From<DocumentCacheError<PostProcessError>> for PerformExceptionError {
    fn from(value: DocumentCacheError<PostProcessError>) -> Self {
        PerformExceptionError {
            error_core: "DocumentCacheError".to_string(),
            message: value.to_string(),
        }
    }
}
impl From<PrepareSecurityMapError> for PerformExceptionError {
    fn from(value: PrepareSecurityMapError) -> Self {
        PerformExceptionError {
            error_core: "PrepareSecurityMapError".to_string(),
            message: value.to_string(),
        }
    }
}
impl From<JsInterpreterError> for PerformExceptionError {
    fn from(value: JsInterpreterError) -> Self {
        PerformExceptionError {
            error_core: "JsInterpreterError".to_string(),
            message: value.to_string(),
        }
    }
}
impl From<TakePerformInputError> for PerformExceptionError {
    fn from(value: TakePerformInputError) -> Self {
        PerformExceptionError {
            error_core: "TakePerformInputError".to_string(),
            message: value.to_string(),
        }
    }
}
impl From<PerformExceptionError> for PerformException {
    fn from(value: PerformExceptionError) -> Self {
        PerformException {
            error_code: value.error_core,
            message: value.message,
        }
    }
}
