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
      address: (() => {
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
      const url = std.unstable.resolveRequestUrl(`/search`, {
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
        { format: 'json' },
        {
          q: (() => {
            with (vars) {
              return input.query;
            }
          })(),
        },
        {
          street: (() => {
            with (vars) {
              return input.streetAddress;
            }
          })(),
        },
        {
          city: (() => {
            with (vars) {
              return input.addressLocality;
            }
          })(),
        },
        {
          state: (() => {
            with (vars) {
              return input.addressRegion;
            }
          })(),
        },
        {
          country: (() => {
            with (vars) {
              return input.addressCountry;
            }
          })(),
        },
        {
          postalcode: (() => {
            with (vars) {
              return input.postalCode;
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
                return statusCode !== 200 || !body.length;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              {
                title: (() => {
                  with (vars) {
                    return (
                      'Unable to find geolocation coordinates for address: ' +
                      address.trim()
                    );
                  }
                })(),
              }
            );
            /* return */ break FN_BODY;
          }
          __outcome.data = Object.assign(
            {},
            {
              latitude: (() => {
                with (vars) {
                  return body[0].lat;
                }
              })(),
            },
            {
              longitude: (() => {
                with (vars) {
                  return body[0].lon;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 400 "application/json" "*" */
        if (
          response.status === 400 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Bad request' },
            {
              detail: (() => {
                with (vars) {
                  return body.error.message;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 401 "application/json" "*" */
        if (
          response.status === 401 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Unauthorized' },
            {
              detail: (() => {
                with (vars) {
                  return body.error.message;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 403 "application/json" "*" */
        if (
          response.status === 403 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Forbidden' },
            {
              detail: (() => {
                with (vars) {
                  return body.error.message;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 500 "application/json" "*" */
        if (
          response.status === 500 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Internal server Error' },
            {
              detail: (() => {
                with (vars) {
                  return body.error.message;
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
function ReverseGeocode(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/reverse`, {
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
        { format: 'json' },
        {
          lat: (() => {
            with (vars) {
              return input.latitude;
            }
          })(),
        },
        {
          lon: (() => {
            with (vars) {
              return input.longitude;
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
                return statusCode !== 200;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Error reverse geocoding coordinates' }
            );
            /* return */ break FN_BODY;
          }
          vars = Object.assign(vars, {
            mappedAddress: (() => {
              with (vars) {
                return {};
              }
            })(),
          });
          vars = Object.assign(vars, {
            mappedAddress: {
              addressCountry: (() => {
                with (vars) {
                  return body.address.country_code;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            mappedAddress: {
              addressRegion: (() => {
                with (vars) {
                  return body.address.city_district;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            mappedAddress: {
              addressRegion: (() => {
                with (vars) {
                  return `${mappedAddress.addressRegion}, ${body.address.county}`;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            mappedAddress: {
              addressRegion: (() => {
                with (vars) {
                  return `${mappedAddress.addressRegion}, ${body.address.state}`;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            mappedAddress: {
              addressLocality: (() => {
                with (vars) {
                  return body.address.city;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            mappedAddress: {
              addressLocality: (() => {
                with (vars) {
                  return `${body.address.borough}, ${body.address.city}`;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            mappedAddress: {
              addressLocality: (() => {
                with (vars) {
                  return body.address.town;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            mappedAddress: {
              addressLocality: (() => {
                with (vars) {
                  return body.address.village;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            mappedAddress: {
              streetAddress: (() => {
                with (vars) {
                  return body.address.road;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            mappedAddress: {
              streetAddress: (() => {
                with (vars) {
                  return `${body.address.house_number} ${mappedAddress.streetAddress}`;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            mappedAddress: {
              postalCode: (() => {
                with (vars) {
                  return body.address.postcode;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            mappedAddress: {
              formattedAddress: (() => {
                with (vars) {
                  return body.display_name;
                }
              })(),
            },
          });
          __outcome.data = (() => {
            with (vars) {
              return [mappedAddress];
            }
          })();
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 400 "application/json" "*" */
        if (
          response.status === 400 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Bad request' },
            {
              detail: (() => {
                with (vars) {
                  return body.error.message;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 401 "application/json" "*" */
        if (
          response.status === 401 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Unauthorized' },
            {
              detail: (() => {
                with (vars) {
                  return body.error.message;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 403 "application/json" "*" */
        if (
          response.status === 403 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Forbidden' },
            {
              detail: (() => {
                with (vars) {
                  return body.error.message;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 500 "application/json" "*" */
        if (
          response.status === 500 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Internal server Error' },
            {
              detail: (() => {
                with (vars) {
                  return body.error.message;
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
