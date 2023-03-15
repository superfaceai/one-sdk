// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'IpGeolocation':
      mapFn = IpGeolocation;
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

function IpGeolocation(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/ipgeo`, {
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
          ip: (() => {
            with (vars) {
              return input.ipAddress;
            }
          })(),
        },
        {
          fields:
            'country_code2,country_name,state_prov,city,zipcode,time_zone,latitude,longitude',
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
          vars = Object.assign(vars, {
            timezone: (() => {
              with (vars) {
                return undefined;
              }
            })(),
          });
          vars = Object.assign(vars, {
            timezone: (() => {
              with (vars) {
                return body.time_zone.name;
              }
            })(),
          });
          vars = Object.assign(vars, {
            latitude: (() => {
              with (vars) {
                return parseFloat(body.latitude, 10);
              }
            })(),
          });
          vars = Object.assign(vars, {
            longitude: (() => {
              with (vars) {
                return parseFloat(body.longitude, 10);
              }
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              ipAddress: (() => {
                with (vars) {
                  return body.ip;
                }
              })(),
            },
            {
              addressCountryCode: (() => {
                with (vars) {
                  return body.country_code2;
                }
              })(),
            },
            {
              addressCountry: (() => {
                with (vars) {
                  return body.country_name;
                }
              })(),
            },
            {
              addressRegion: (() => {
                with (vars) {
                  return body.state_prov;
                }
              })(),
            },
            {
              addressLocality: (() => {
                with (vars) {
                  return body.city;
                }
              })(),
            },
            {
              postalCode: (() => {
                with (vars) {
                  return body.zipcode;
                }
              })(),
            },
            {
              timeZone: (() => {
                with (vars) {
                  return timezone;
                }
              })(),
            },
            {
              latitude: (() => {
                with (vars) {
                  return !isNaN(latitude) ? latitude : undefined;
                }
              })(),
            },
            {
              longitude: (() => {
                with (vars) {
                  return !isNaN(longitude) ? longitude : undefined;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response * "*" "*" */
        const statusCode = response.status;
        const headers = response.headers;
        const body = response.bodyAuto();
        vars = Object.assign(vars, {
          error: (() => {
            const acc = [];
            {
              const outcome = MapError(
                Object.assign(
                  {},
                  {
                    statusCode: (() => {
                      with (vars) {
                        return statusCode;
                      }
                    })(),
                  },
                  {
                    body: (() => {
                      with (vars) {
                        return body;
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
        __outcome.error = (() => {
          with (vars) {
            return error;
          }
        })();
        /* end handler */ break HTTP_RESPONSE;
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
function MapError(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      statusCode: (() => {
        with (vars) {
          return args.statusCode;
        }
      })(),
    });
    vars = Object.assign(vars, {
      body: (() => {
        with (vars) {
          return args.body;
        }
      })(),
    });
    vars = Object.assign(vars, {
      detail: (() => {
        with (vars) {
          return body.message;
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return statusCode === 400 || statusCode === 423;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Bad request' },
        {
          detail: (() => {
            with (vars) {
              return detail;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return statusCode === 401;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Unauthenticated' },
        {
          detail: (() => {
            with (vars) {
              return detail;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return statusCode === 403;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Unauthorized' },
        {
          detail: (() => {
            with (vars) {
              return detail;
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
      __outcome.data = Object.assign(
        {},
        { title: 'Not found' },
        {
          detail: (() => {
            with (vars) {
              return detail;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return statusCode === 429;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Rate limit exceeded' },
        {
          detail: (() => {
            with (vars) {
              return detail;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    __outcome.data = Object.assign(
      {},
      { title: 'Unknown error' },
      {
        detail: (() => {
          with (vars) {
            return `Unknown error occurred. Status: ${statusCode}. IP Geolocation provider error info: ${detail}.`;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
