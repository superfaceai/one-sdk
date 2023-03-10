function sf_entry(usecase_name) {
  if (usecase_name === 'RetrieveCharacterInformation') {
    const input = std.unstable.getInput();
    const result = RetrieveCharacterInformation(input);
    std.unstable.setOutput(result);
    return result;
  } else {
    throw new Error('Unknown usecase name');
  }
}

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

function RetrieveCharacterInformation(input) {
  std.unstable.print(`typeof HttpRequest ${typeof HttpRequest}, typeof std ${typeof std}, typeof sf ${typeof sf}`);

  const url = `https://swapi.dev/api/people/${input.person}`;
  const headers = {
    'foo': ['bar'],
    'accept': ['application/json', 'application/xml']
  };

  const response = std.unstable.HttpRequest.fire('GET', url, headers, null).response();
  std.unstable.print(`test ${response.status}`);

  const body = response.bodyBytes();

  return body.length;
}
