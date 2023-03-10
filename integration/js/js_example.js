function sf_entry(usecase_name) {
  if (usecase_name === 'RetrieveCharacterInformation') {
    const input = std.unstable.takeInput();
    const result = RetrieveCharacterInformation(input);
    std.unstable.setOutput(result);
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
  const url = `https://swapi.dev/api/people/`;
  const headers = {
    'foo': ['bar'],
    'accept': ['application/json', 'application/xml']
  };
  const query = {
    'search': [input.characterName]
  };

  const response = std.unstable.fetch(url, {
    method: 'GET',
    headers,
    query
  }).response();
  std.unstable.print(`response: ${response.status}`);

  if (response.status !== 200 || response.headers['content-type']?.indexOf('application/json') === -1) {
    throw new Error('Unexpected response');
  }

  const body = response.bodyJson();
  if (body.count === 0) {
    // TODO: probably should be an exception too, just of a different kind
    return { kind: 'err', message: 'no character found' };
  }

  const entries = body.results.filter(result => result.name.toLowerCase() === input.characterName.toLowerCase());
  if (entries.length === 0) {
    // TODO: probably should be an exception too, just of a different kind
    return { kind: 'err', message: 'Specified character name is incorrect, did you mean to enter one of following?', characters: body.results.map(result => result.name) };
  }

  const character = entries[0];
  return {
    height: character.height,
    weight: character.mass,
    yearOfBirth: character.birth_year
  };
}
