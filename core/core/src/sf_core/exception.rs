use sf_std::unstable::exception::{PerformException, PerformExceptionErrorCode};

use super::{cache::DocumentCacheError, json_schema_validator::JsonSchemaValidatorError};

impl<PostProcessError: std::error::Error> From<DocumentCacheError<PostProcessError>>
    for PerformException
{
    fn from(value: DocumentCacheError<PostProcessError>) -> Self {
        PerformException {
            error_code: PerformExceptionErrorCode::DocumentCacheError,
            message: value.to_string(),
        }
    }
}
impl From<JsonSchemaValidatorError> for PerformException {
    fn from(value: JsonSchemaValidatorError) -> Self {
        PerformException {
            error_code: PerformExceptionErrorCode::InputValidationError,
            message: format!("err: {:?}", value),
        }
    }
}
