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
    vars = Object.assign(vars, { ipAddress: '' });
    vars = Object.assign(vars, {
      ipAddress: (() => {
        with (vars) {
          return input.ipAddress;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/v2/info`, {
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
              return ipAddress;
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
          vars = Object.assign(vars, {
            data: (() => {
              with (vars) {
                return body.data || {};
              }
            })(),
          });
          vars = Object.assign(vars, {
            result: (() => {
              with (vars) {
                return {
                  ip: data.ip,
                };
              }
            })(),
          });
          vars = Object.assign(vars, {
            result: {
              postalCode: (() => {
                with (vars) {
                  return data.location.zip;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            result: {
              latitude: (() => {
                with (vars) {
                  return data.location.latitude;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            result: {
              longitude: (() => {
                with (vars) {
                  return data.location.longitude;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            result: {
              addressCountryCode: (() => {
                with (vars) {
                  return data.location.country.alpha2;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            result: {
              addressCountry: (() => {
                with (vars) {
                  return data.location.country.name;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            result: {
              addressRegion: (() => {
                with (vars) {
                  return data.location.region.name;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            result: {
              addressLocality: (() => {
                with (vars) {
                  return data.location.city.name;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            result: {
              timeZone: (() => {
                with (vars) {
                  return data.timezone.id;
                }
              })(),
            },
          });
          __outcome.data = (() => {
            with (vars) {
              return result;
            }
          })();
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
        { title: 'Wrong IP address format' },
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
          return statusCode === 422;
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
            return `Unknown error occurred. Status: ${statusCode}. Ipbase error detail: ${detail}.`;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
