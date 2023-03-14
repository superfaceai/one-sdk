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
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/people/`, {
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
            with (vars) {
              return input.characterName;
            }
          })(),
        }
      );
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 200 "application/json" "*" */
        if (
          response.status === 200 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          if (
            (() => {
              with (vars) {
                return body.count === 0;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { message: 'No character found' }
            );
            /* return */ break FN_BODY;
          }
          vars = Object.assign(vars, {
            entries: (() => {
              with (vars) {
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
              with (vars) {
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
                  with (vars) {
                    return body.results.map(result => result.name);
                  }
                })(),
              }
            );
            /* return */ break FN_BODY;
          }
          vars = Object.assign(vars, {
            character: (() => {
              with (vars) {
                return entries[0];
              }
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              height: (() => {
                with (vars) {
                  return character.height;
                }
              })(),
            },
            {
              weight: (() => {
                with (vars) {
                  return character.mass;
                }
              })(),
            },
            {
              yearOfBirth: (() => {
                with (vars) {
                  return character.birth_year;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
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

