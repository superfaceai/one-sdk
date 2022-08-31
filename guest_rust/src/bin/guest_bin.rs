use std::io;

use anyhow::Context;

use guest::SuperfaceStream;

fn main() -> anyhow::Result<()> {
	eprintln!("[GUEST] Hello world");
	let mut perform = SuperfaceStream::Perform;

	let input = perform.read_json().context("Failed to read input")?;
	eprintln!("[GUEST] Input: {:?}", input);

	let result = {
		let mut http = SuperfaceStream::Http;

		let request = serde_json::json!({
			"method": "GET",
			"base": "swapi.dev",
			"path": "/api/people/",
			"request": {
				"query": {
					"search": input["characterName"]
				}
			}
		});
		http.write_json(&request).context("Failed to write http request")?;
		let response = loop {
			match http.read_json() {
				Ok(res) => break res,
				Err(err) if err.kind() == io::ErrorKind::WouldBlock => {
					// yolo
				},
				Err(err) => return Err(err).context("Failed to read http response")
			}
		};

		let body = base64::decode(response["body"].as_str().unwrap()).unwrap();
		let body: serde_json::Value = serde_json::from_slice(&body).unwrap();

		let character = body["results"].as_array().unwrap().iter().filter(
			|res| res["name"].as_str().unwrap().to_lowercase() == input["characterName"].as_str().unwrap().to_lowercase()
		).nth(0);

		match character {
			None => {
				let characters = body["results"].as_array().unwrap().iter().map(
					|res| serde_json::Value::String(
						res["name"].as_str().unwrap().to_string()
					)
				).collect::<Vec<_>>();
	
				serde_json::json!({
					"kind": "error",
					"message": "Specified character name is incorrect, did you mean to enter one of following?",
					"characters": serde_json::Value::Array(characters)
				})
			}
			Some(character) => {
				serde_json::json!({
					"kind": "success",
					"height": character["height"],
					"weight": character["mass"],
					"yearOfBirth": character["birth_year"]
				})
			}
		}
	};

	eprintln!("[GUEST] Result: {:?}", result);
	perform.write_json(&result).context("Failed to write output")?;

	Ok(())
}
