use regex::Regex;
use sf_std::unstable::provider::ProviderJson;

use super::{MapValue, MapValueObject};

pub fn prepare_services_map(provider_json: &ProviderJson, parameters: &MapValueObject) -> MapValue {
    let mut services_map = MapValueObject::new();

    for service in &provider_json.services {
        let service_url = replace_parameters(service.base_url.clone(), parameters);
        services_map.insert(service.id.to_string(), MapValue::String(service_url));
    }

    MapValue::Object(services_map)
}

fn replace_parameters(url: String, parameters: &MapValueObject) -> String {
    let re = Regex::new(r"\{\s*([^}\s]*)\s*\}").unwrap();

    let mut result_url = url.clone();

    for cap in re.captures_iter(url.as_str()) {
        let param_name = &cap[1];
        let param_value = parameters.get(param_name).unwrap();

        match param_value {
            MapValue::String(val) => {
                result_url = result_url.as_str().replace(&cap[0], val);
            }
            _ => panic!("Invalid parameter value"),
        }
    }

    result_url
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_params_replacing() {
        let result_url = replace_parameters(
            "http://{ONE}.localhost/{ TWO}/{THREE }/{ FOUR }".to_string(),
            &MapValueObject::from([
                ("ONE".to_string(), MapValue::String("first".to_string())),
                ("TWO".to_string(), MapValue::String("second".to_string())),
                ("THREE".to_string(), MapValue::String("third".to_string())),
                ("FOUR".to_string(), MapValue::String("fourth".to_string())),
            ]),
        );

        assert_eq!(
            result_url,
            "http://first.localhost/second/third/fourth".to_string()
        );
    }
}
