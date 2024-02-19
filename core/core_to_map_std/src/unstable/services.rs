use std::fmt::Write;

use regex::{Regex, Captures};
use sf_std::unstable::{provider::ProviderJson, exception::{PerformException, PerformExceptionErrorCode}};

use super::{MapValue, MapValueObject};

#[derive(Debug, thiserror::Error)]
pub enum PrepareServicesMapError {
    #[error("Service is misconfigured:\n{}", ServiceMisconfiguredError::format_errors(.0.as_slice()))]
    ServicesMisconfigured(Vec<ServiceMisconfiguredError>)
}
impl From<PrepareServicesMapError> for PerformException {
    fn from(value: PrepareServicesMapError) -> Self {
        PerformException {
            error_code: PerformExceptionErrorCode::PrepareServicesMapError,
            message: value.to_string(),
        }
    }
}

#[derive(Debug)]
#[cfg_attr(test, derive(PartialEq))]
pub struct ServiceMisconfiguredError {
    pub id: String,
    pub expected: String,
}
impl ServiceMisconfiguredError {
    pub fn format_errors(errors: &[Self]) -> String {
        let mut res = String::new();

        for err in errors {
            writeln!(
                &mut res,
                "Service {} is misconfigured. Expected {}",
                err.id, err.expected
            )
            .unwrap();
        }

        res
    }
}

pub fn prepare_services_map(provider_json: &ProviderJson, parameters: &MapValueObject) -> Result<MapValue, PrepareServicesMapError> {
    let mut services_map = MapValueObject::new();
    let mut errors = Vec::new();

    for service in &provider_json.services {
        match replace_parameters(&service.base_url, parameters) {
            Ok(service_url) => { services_map.insert(service.id.to_string(), MapValue::String(service_url)); }
            Err(errs) => errors.extend(
                errs.into_iter().map(|expected| ServiceMisconfiguredError {
                    id: service.id.to_owned(),
                    expected
                })
            )
        }
    }

    if !errors.is_empty() {
        Err(PrepareServicesMapError::ServicesMisconfigured(errors))
    } else {
        Ok(MapValue::Object(services_map))
    }
}

fn replace_parameters(url: &str, parameters: &MapValueObject) -> Result<String, Vec<String>> {
    let re = Regex::new(r"\{\s*([^}\s]*)\s*\}").unwrap();

    let mut errors = Vec::new();
    let result_url = re.replace_all(url, |cap: &Captures| {
        let param_name = &cap[1];

        match parameters.get(param_name) {
            Some(MapValue::String(val)) => val,
            _ => {
                errors.push(format!("String parameter {} is missing", param_name));
                ""
            }
        }
    });

    if !errors.is_empty() {
        Err(errors)
    } else {
        Ok(result_url.into_owned())
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_params_replacing() {
        let result_url = replace_parameters(
            "http://{ONE}.localhost/{ TWO}/{THREE }/{ FOUR }",
            &MapValueObject::from([
                ("ONE".to_string(), MapValue::String("first".to_string())),
                ("TWO".to_string(), MapValue::String("second".to_string())),
                ("THREE".to_string(), MapValue::String("third".to_string())),
                ("FOUR".to_string(), MapValue::String("fourth".to_string())),
            ]),
        ).unwrap();

        assert_eq!(
            result_url,
            "http://first.localhost/second/third/fourth".to_string()
        );
    }

    #[test]
    fn test_params_replacing_wrong_params() {
        let err = replace_parameters(
            "http://{ONE}.localhost/{ TWO}/{THREE }/{ FOUR }",
            &MapValueObject::from([
                ("ONE".to_string(), MapValue::String("first".to_string())),
                ("TWO".to_string(), MapValue::String("second".to_string())),
                ("THREE".to_string(), MapValue::None),
            ]),
        ).unwrap_err();

        assert_eq!(err, vec![
            "String parameter THREE".to_string(),
            "String parameter FOUR".to_string()
        ]);
    }
}
