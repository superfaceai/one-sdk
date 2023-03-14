// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetWeatherForecastInCity':
      mapFn = GetWeatherForecastInCity;
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

function GetWeatherForecastInCity(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      unit: (() => {
        with (vars) {
          return input.units;
        }
      })(),
    });
    {
      const outcome = fetchWeather(
        Object.assign(
          {},
          {
            units: (() => {
              with (vars) {
                return unit;
              }
            })(),
          },
          {
            city: (() => {
              with (vars) {
                return input.city;
              }
            })(),
          }
        ),
        parameters,
        security
      );
      if (
        (() => {
          with (vars) {
            return outcome.error;
          }
        })()
      ) {
        __outcome.error = (() => {
          with (vars) {
            return outcome.error;
          }
        })();
        /* return */ break FN_BODY;
      }
      __outcome.data = (() => {
        with (vars) {
          return outcome.data;
        }
      })();
      /* return */ break FN_BODY;
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
          avgTemp: (() => {
            with (vars) {
              return Number(args.weather.avgtempF);
            }
          })(),
        },
        {
          maxTemp: (() => {
            with (vars) {
              return Number(args.weather.maxtempF);
            }
          })(),
        },
        {
          minTemp: (() => {
            with (vars) {
              return Number(args.weather.mintempF);
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
          avgTemp: (() => {
            with (vars) {
              return Number(args.weather.avgtempC) + 273;
            }
          })(),
        },
        {
          maxTemp: (() => {
            with (vars) {
              return Number(args.weather.maxtempC) + 273;
            }
          })(),
        },
        {
          minTemp: (() => {
            with (vars) {
              return Number(args.weather.mintempC) + 273;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    __outcome.data = Object.assign(
      {},
      {
        avgTemp: (() => {
          with (vars) {
            return Number(args.weather.avgtempC);
          }
        })(),
      },
      {
        maxTemp: (() => {
          with (vars) {
            return Number(args.weather.maxtempC);
          }
        })(),
      },
      {
        minTemp: (() => {
          with (vars) {
            return Number(args.weather.mintempC);
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function fetchWeather(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/${args.city}`, {
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
        /* response * "*" "*" */
        const statusCode = response.status;
        const headers = response.headers;
        const body = response.bodyAuto();
        if (
          (() => {
            with (vars) {
              return statusCode === 400;
            }
          })()
        ) {
          __outcome.error = Object.assign(
            {},
            { title: 'Bad request' },
            {
              detail: (() => {
                with (vars) {
                  return body;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
        }
        if (
          (() => {
            with (vars) {
              return statusCode === 404;
            }
          })()
        ) {
          __outcome.error = Object.assign(
            {},
            { title: 'Not Found' },
            {
              detail: (() => {
                with (vars) {
                  return body;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
        }
        vars = Object.assign(vars, {
          forecast: (() => {
            const acc = [];
            {
              for (const weather of (() => {
                with (vars) {
                  return body.weather;
                }
              })()) {
                const outcome = mapWeather(
                  Object.assign(
                    {},
                    {
                      units: (() => {
                        with (vars) {
                          return args.unit;
                        }
                      })(),
                    },
                    {
                      weather: (() => {
                        with (vars) {
                          return weather;
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
            }
            return acc;
          })(),
        });
        __outcome.data = (() => {
          with (vars) {
            return forecast;
          }
        })();
        /* return */ break FN_BODY;
        /* end handler */ break HTTP_RESPONSE;
        throw new Error('Unexpected response');
      }
    }
  }
  return __outcome;
}
function mapWeather(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      temperatureWrapper: (() => {
        const acc = [];
        {
          const outcome = pickTemperatures(
            Object.assign(
              {},
              {
                units: (() => {
                  with (vars) {
                    return args.units;
                  }
                })(),
              },
              {
                weather: (() => {
                  with (vars) {
                    return args.weather;
                  }
                })(),
              }
            ),
            parameters,
            security
          );
          if (outcome.error !== undefined) {
            throw new Error(`Unexpected inline call failure: ${outcome.error}`);
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
        averageTemperature: (() => {
          with (vars) {
            return temperatureWrapper.avgTemp;
          }
        })(),
      },
      {
        date: (() => {
          with (vars) {
            return args.weather.date;
          }
        })(),
      },
      {
        maxTemperature: (() => {
          with (vars) {
            return temperatureWrapper.maxTemp;
          }
        })(),
      },
      {
        minTemperature: (() => {
          with (vars) {
            return temperatureWrapper.minTemp;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
