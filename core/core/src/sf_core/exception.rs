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

pub trait FromJsonSchemaValidationError {
    fn from_json_schema_validation_error(
        value: JsonSchemaValidatorError,
        source: Option<&str>,
    ) -> Self;
}

impl FromJsonSchemaValidationError for PerformException {
    fn from_json_schema_validation_error(
        value: JsonSchemaValidatorError,
        source: Option<&str>,
    ) -> Self {
        let message = match source {
            Some(source) => format!("For {} {}", source, value.to_string()),
            None => value.to_string(),
        };

        PerformException {
            error_code: PerformExceptionErrorCode::InputValidationError,
            message,
        }
    }
}
