// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetCurrentWeatherInCity':
      mapFn = GetCurrentWeatherInCity;
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

function GetCurrentWeatherInCity(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      mappedUnits: (() => {
        with (vars) {
          return null;
        }
      })(),
    });
    {
      const outcome = mapUnits(
        Object.assign(
          {},
          {
            units: (() => {
              with (vars) {
                return input.units;
              }
            })(),
          }
        ),
        parameters,
        security
      );
      vars = Object.assign(vars, {
        mappedUnits: (() => {
          with (vars) {
            return outcome.data.result;
          }
        })(),
      });
    }
    {
      const url = std.unstable.resolveRequestUrl(`/data/2.5/weather`, {
        parameters,
        security,
        serviceId: undefined,
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
          q: (() => {
            with (vars) {
              return input.city;
            }
          })(),
        },
        {
          units: (() => {
            with (vars) {
              return mappedUnits;
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
          __outcome.data = Object.assign(
            {},
            {
              temperature: (() => {
                with (vars) {
                  return body.main.temp;
                }
              })(),
            },
            {
              feelsLike: (() => {
                with (vars) {
                  return body.main.feels_like;
                }
              })(),
            },
            {
              description: (() => {
                with (vars) {
                  return body.weather[0].description;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 400 "*" "*" */
        if (response.status === 400) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: '400 - Bad Request' },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 401 "*" "*" */
        if (response.status === 401) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: '401 - Unauthorized' },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 404 "*" "*" */
        if (response.status === 404) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: '404 - Not Found' },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
function mapUnits(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    if (
      (() => {
        with (vars) {
          return args.units === 'F';
        }
      })()
    ) {
      __outcome.data = Object.assign({}, { result: 'imperial' });
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return args.units === 'K';
        }
      })()
    ) {
      __outcome.data = Object.assign({}, { result: 'standard' });
      /* return */ break FN_BODY;
    }
    __outcome.data = Object.assign({}, { result: 'metric' });
    /* return */ break FN_BODY;
  }
  return __outcome;
}
