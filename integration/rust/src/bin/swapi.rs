/*
profile = "starwars/character-information@1.0"
provider = "swapi"

map RetrieveCharacterInformation {
    http GET "/people/" {
        request {
            query {
                search = input.characterName
            }
        }

        response 200 "application/json" {
            return map error if (body.count === 0) {
                message = "No character found"
            }

            entries = body.results.filter(result => result.name.toLowerCase() === input.characterName.toLowerCase())

            return map error if (entries.length === 0) {
                message = "Specified character name is incorrect, did you mean to enter one of following?"
                characters = body.results.map(result => result.name)
            }

            character = entries[0]

            map result {
                height = character.height
                weight = character.mass
                yearOfBirth = character.birth_year
            }
        }
    }
}
*/

use map::{http_request, HttpRequestError, StructuredValue, StructuredValueIterator};

fn main() {
    let input = map::get_input();
    map::set_output(retrieve_character_information(input));
}

fn retrieve_character_information(
    input: StructuredValue,
) -> Result<StructuredValue, StructuredValue> {
    let response = http_request(
        "GET",
        "http://swapi.dev/people/",
        map::multimap! {
            "accept" => ["application/json"]
        },
        map::multimap! {
            "search" => [input["characterName"].unwrap_str()]
        },
        None,
    )
    .map_err(|err| {
        map::object! {
            "message" => match err {
                HttpRequestError::Timeout => "timeout"
            }
        }
    })?;

    match (response.status(), response.content_type()) {
        (200, Some("application/json")) => {
            let body = response.body().unwrap();

            if body["count"].unwrap_number() == 0 {
                return Err(map::object! {
                    "message" => "No character found"
                });
            }

            let character_name = input["characterName"].unwrap_str().to_lowercase();
            let results = body["results"].unwrap_array();

            let first_entry = results
                .iter()
                .filter(|result| result["name"].unwrap_str().to_lowercase() == character_name)
                .next();

            match first_entry {
                None => Err(map::object! {
                    "message" => "Specified character name is incorrect, did you mean to enter one of following?",
                    "characters" => results.iter().map(|r| r["name"].unwrap_str()).collect_array()
                }),
                Some(character) => Ok(map::object! {
                    "height" => &character["height"],
                    "weight" => &character["mass"],
                    "yearOfBirth" => &character["birth_year"],
                }),
            }
        }
        _ => unimplemented!(),
    }
}
