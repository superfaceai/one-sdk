function _start(usecase_name) {
  if (usecase_name === 'RetrieveCharacterInformation') {
    const { input, parameters, security } = std.unstable.takeInput();
    std.ffi.unstable.printDebug("Running RetrieveCharacterInformation with input:", input, "parameters:", parameters, "security:", security);
    
    try {
      const result = RetrieveCharacterInformation(input, parameters, security);
      std.unstable.setOutputSuccess(result);
    } catch (e) {
      if (e instanceof std.unstable.MapError) {
        std.unstable.setOutputFailure(e.output);
      } else {
        throw e;
      }
    }
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

function RetrieveCharacterInformation(input, parameters, security) {
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
    throw new std.unstable.MapError({ message: 'no character found' });
  }

  const entries = body.results.filter(result => result.name.toLowerCase() === input.characterName.toLowerCase());
  if (entries.length === 0) {
    throw new std.unstable.MapError({ message: 'Specified character name is incorrect, did you mean to enter one of following?', characters: body.results.map(result => result.name) });
  }

  const character = entries[0];
  return {
    height: character.height,
    weight: character.mass,
    yearOfBirth: character.birth_year
  };
}
