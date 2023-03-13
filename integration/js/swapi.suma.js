// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'RetrieveCharacterInformation':
      mapFn = RetrieveCharacterInformation;
      break;

    default:
      throw new Error('Unknown usecase name');
  }

  const { input, parameters, security } = std.unstable.takeInput();
  std.ffi.unstable.printDebug(
    'Running with input:',
    input,
    'parameters:',
    parameters,
    'security:',
    security
  );

  try {
    const result = mapFn(input, parameters, security);
    std.unstable.setOutputSuccess(result);
  } catch (e) {
    if (e instanceof std.unstable.MapError) {
      std.unstable.setOutputFailure(e.output);
    } else {
      throw e;
    }
  }
}

function RetrieveCharacterInformation(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let __variables = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl('/people/', {
        parameters,
        security,
        serviceId: 'default',
      });
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.query = Object.assign(
        {},
        {
          search: (() => {
            with (__variables) {
              return input.characterName;
            }
          })(),
        }
      );
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        if (
          response.status === 200 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const body = response.bodyAuto();
          if (
            (() => {
              with (__variables) {
                return body.count === 0;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { message: 'No character found' }
            );
            break FN_BODY;
          }
          __variables = Object.assign(__variables, {
            entries: (() => {
              with (__variables) {
                return body.results.filter(
                  result =>
                    result.name.toLowerCase() ===
                    input.characterName.toLowerCase()
                );
              }
            })(),
          });
          if (
            (() => {
              with (__variables) {
                return entries.length === 0;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              {
                message:
                  'Specified character name is incorrect, did you mean to enter one of following?',
              },
              {
                characters: (() => {
                  with (__variables) {
                    return body.results.map(result => result.name);
                  }
                })(),
              }
            );
            break FN_BODY;
          }
          __variables = Object.assign(__variables, {
            character: (() => {
              with (__variables) {
                return entries[0];
              }
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              height: (() => {
                with (__variables) {
                  return character.height;
                }
              })(),
            },
            {
              weight: (() => {
                with (__variables) {
                  return character.mass;
                }
              })(),
            },
            {
              yearOfBirth: (() => {
                with (__variables) {
                  return character.birth_year;
                }
              })(),
            }
          );
          break HTTP_RESPONSE;
        }
        throw new Error('Unexpected response');
      }
    }
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}

