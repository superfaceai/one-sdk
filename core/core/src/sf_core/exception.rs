use sf_std::unstable::exception::PerformException;

use super::{cache::DocumentCacheError, json_schema_validator::JsonSchemaValidatorError};

impl<PostProcessError: std::error::Error> From<DocumentCacheError<PostProcessError>>
    for PerformException
{
    fn from(value: DocumentCacheError<PostProcessError>) -> Self {
        PerformException {
            error_code: "DocumentCacheError".to_string(),
            message: value.to_string(),
        }
    }
}
impl From<JsonSchemaValidatorError> for PerformException {
    fn from(value: JsonSchemaValidatorError) -> Self {
        PerformException {
            error_code: "PerformInputValidationError".to_string(),
            message: format!("err: {:?}", value),
        }
    }
}
