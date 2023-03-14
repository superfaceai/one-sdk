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
      units: (() => {
        with (vars) {
          return input.units;
        }
      })(),
    });
    vars = Object.assign(vars, {
      inputCity: (() => {
        with (vars) {
          return input.city;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/${vars.inputCity}`, {
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
      requestOptions.query = Object.assign({}, { format: 'j1' });
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
          vars = Object.assign(vars, {
            temperatureWrapper: (() => {
              const acc = [];
              {
                const outcome = pickTemperatures(
                  Object.assign(
                    {},
                    {
                      weather: (() => {
                        with (vars) {
                          return body.current_condition[0];
                        }
                      })(),
                    },
                    {
                      units: (() => {
                        with (vars) {
                          return units;
                        }
                      })(),
                    }
                  ),
                  parameters,
                  security
                );
                if (outcome.error !== undefined) {
                  throw new Error(
                    `Unexpected inline call failure: ${outcome.error}`
                  );
                } else {
                  acc.push(outcome.data);
                }
              }
              return acc[0];
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              temperature: (() => {
                with (vars) {
                  return temperatureWrapper.temperature;
                }
              })(),
            },
            {
              feelsLike: (() => {
                with (vars) {
                  return temperatureWrapper.feelsLike;
                }
              })(),
            },
            {
              description: (() => {
                with (vars) {
                  return body.current_condition[0].weatherDesc[0].value;
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
function pickTemperatures(args, parameters, security) {
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
      __outcome.data = Object.assign(
        {},
        {
          temperature: (() => {
            with (vars) {
              return Number(args.weather.temp_F);
            }
          })(),
        },
        {
          feelsLike: (() => {
            with (vars) {
              return Number(args.weather.FeelsLikeF);
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return args.units === 'K';
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        {
          temperature: (() => {
            with (vars) {
              return Number(args.weather.temp_C) + 273.15;
            }
          })(),
        },
        {
          feelsLike: (() => {
            with (vars) {
              return Number(args.weather.FeelsLikeC) + 273.15;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    __outcome.data = Object.assign(
      {},
      {
        temperature: (() => {
          with (vars) {
            return Number(args.weather.temp_C);
          }
        })(),
      },
      {
        feelsLike: (() => {
          with (vars) {
            return Number(args.weather.FeelsLikeC);
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
