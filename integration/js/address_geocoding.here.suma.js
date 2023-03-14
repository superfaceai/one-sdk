// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'Geocode':
      mapFn = Geocode;
      break;
    case 'ReverseGeocode':
      mapFn = ReverseGeocode;
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

function Geocode(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      payload: (() => {
        with (vars) {
          return (
            input.query ||
            `${input.streetAddress || ''} ${input.addressLocality || ''} ${
              input.addressRegion || ''
            } ${input.postalCode || ''} ${input.addressCountry || ''}`
          );
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/v1/geocode`, {
        parameters,
        security,
        serviceId: 'geocode',
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
              return payload;
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
                return body.items.length === 0;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Results not found' },
              { detail: 'No results were found for specified address' }
            );
            /* return */ break FN_BODY;
          }
          __outcome.data = Object.assign(
            {},
            {
              latitude: (() => {
                with (vars) {
                  return body.items[0].position.lat;
                }
              })(),
            },
            {
              longitude: (() => {
                with (vars) {
                  return body.items[0].position.lng;
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
              const outcome = MapHereError(
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
function ReverseGeocode(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      payload: (() => {
        with (vars) {
          return `${input.latitude},${input.longitude}`;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/v1/revgeocode`, {
        parameters,
        security,
        serviceId: 'reverse-geocode',
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
          at: (() => {
            with (vars) {
              return payload;
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
                return body.items.length === 0;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Results not found' },
              { detail: 'No results were found for specified coordinates' }
            );
            /* return */ break FN_BODY;
          }
          __outcome.data = (() => {
            with (vars) {
              return body.items.map(item => {
                const mappedAddress = {};

                // country code
                mappedAddress.addressCountry = item.address.countryCode;

                // region
                mappedAddress.addressRegion = item.address.state;
                if (item.address.stateCode) {
                  mappedAddress.addressRegion = `${item.address.stateCode}, ${mappedAddress.addressRegion}`;
                }
                if (item.address.county) {
                  mappedAddress.addressRegion = `${mappedAddress.addressRegion}, ${item.address.county}`;
                }

                // locality
                mappedAddress.addressLocality = item.address.city;
                if (
                  item.address.district &&
                  item.address.district !== item.address.city
                ) {
                  mappedAddress.addressLocality = `${mappedAddress.addressLocality}, ${item.address.district}`;
                }

                // street address
                mappedAddress.streetAddress = item.address.street;
                if (item.address.houseNumber) {
                  mappedAddress.streetAddress = `${item.address.houseNumber} ${mappedAddress.streetAddress}`;
                }

                // postal code
                mappedAddress.postalCode = item.address.postalCode;

                // formatted address
                mappedAddress.formattedAddress = item.address.label;

                return mappedAddress;
              });
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
              const outcome = MapHereError(
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
function MapHereError(args, parameters, security) {
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
      supportedCodes: (() => {
        with (vars) {
          return [400, 405, 429, 503];
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return supportedCodes.includes(statusCode);
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        {
          title: (() => {
            with (vars) {
              return body.title;
            }
          })(),
        },
        {
          detail: (() => {
            with (vars) {
              return body.cause;
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
        { title: 'Unauthorized' },
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
          return statusCode === 403;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Forbidden' },
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
      __outcome.data = Object.assign(
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
    __outcome.data = Object.assign(
      {},
      { title: 'Unknown error' },
      {
        detail: (() => {
          with (vars) {
            return `Unknown error occurred. Status: ${statusCode}.`;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
