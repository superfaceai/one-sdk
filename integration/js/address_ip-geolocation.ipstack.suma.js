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
    vars = Object.assign(vars, {
      ipAddress: (() => {
        with (vars) {
          return input.ipAddress;
        }
      })(),
    });
    vars = Object.assign(vars, { ipAddress: 'check' });
    {
      const url = std.unstable.resolveRequestUrl(`/${vars.ipAddress}`, {
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
            error: (() => {
              with (vars) {
                return undefined;
              }
            })(),
          });
          vars = Object.assign(vars, {
            timezone: (() => {
              with (vars) {
                return undefined;
              }
            })(),
          });
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
          if (
            (() => {
              with (vars) {
                return error;
              }
            })()
          ) {
            __outcome.error = (() => {
              with (vars) {
                return error;
              }
            })();
          }
          vars = Object.assign(vars, {
            timezone: (() => {
              with (vars) {
                return body.time_zone.id;
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
                  return body.country_code;
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
                  return body.region_name;
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
                  return body.zip;
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
                  return body.latitude;
                }
              })(),
            },
            {
              longitude: (() => {
                with (vars) {
                  return body.longitude;
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
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      ipstackErrorCode: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      detail: (() => {
        with (vars) {
          return body.error.info;
        }
      })(),
    });
    vars = Object.assign(vars, {
      ipstackErrorCode: (() => {
        with (vars) {
          return body.error.code;
        }
      })(),
    });
    vars = Object.assign(vars, {
      detail: (() => {
        with (vars) {
          return body.detail;
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return ipstackErrorCode === 404 || ipstackErrorCode === 103;
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
          return ipstackErrorCode === 101;
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
          return ipstackErrorCode === 104;
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
    if (
      (() => {
        with (vars) {
          return ipstackErrorCode === 105 || ipstackErrorCode === 303;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        {
          title: (() => {
            with (vars) {
              return `Unauthorized`;
            }
          })(),
        },
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
          return (
            ipstackErrorCode === 106 ||
            ipstackErrorCode === 301 ||
            ipstackErrorCode === 302
          );
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
    __outcome.data = Object.assign(
      {},
      { title: 'Unknown error' },
      {
        detail: (() => {
          with (vars) {
            return `Unknown error occurred. Status code: ${statusCode}. IP Stack error code: ${ipstackErrorCode}. IP Stack provider error info: ${detail}.`;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
