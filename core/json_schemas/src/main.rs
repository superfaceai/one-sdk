use serde_json;
use serde_yaml;
use std::fs;
use std::io::Write;

fn main() {
    for entry in fs::read_dir("./src/schemas").expect("readable folder") {
        if let Ok(entry) = entry {
            if let Some(ext) = entry.path().as_path().extension() {
                if ext == "yaml" || ext == "yml" {
                    let yaml = fs::metadata(entry.path()).expect("Readable file");
                    let mut json = entry.path();
                    json.set_extension("json");
                    let json = match fs::metadata(&json) {
                        Ok(metadata) => Some(metadata),
                        Err(err) => {
                            eprintln!("Getting metadata for {:?} failed: {}", json, err);
                            eprintln!("it will be created from YAML source");
                            None
                        }
                    };

                    if json.is_none()
                        || yaml.modified().unwrap() > json.unwrap().modified().unwrap()
                    {
                        translate(&entry.path());
                    }
                }
            }
        }
    }
}

fn translate(yaml_path: &std::path::PathBuf) {
    println!("Translating {:?}", yaml_path);

    let content = fs::read_to_string(&yaml_path).expect("Readable JSON schema in YAML format");
    let json = translate_to_json(&content);

    let mut json_path = yaml_path.clone();
    json_path.set_extension("json");

    let mut file = fs::File::create(json_path.as_path()).expect("Writable file");
    file.write_all(json.as_bytes()).unwrap();
}

pub fn translate_to_json(content: &str) -> String {
    let yaml: serde_yaml::Value = serde_yaml::from_str(content).expect("Valid YAML");
    serde_json::to_string_pretty(&yaml).unwrap()
}
