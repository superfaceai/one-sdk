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
      const url = std.unstable.resolveRequestUrl(`/geocode/v1/json`, {
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
                return body.status.code !== 200;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Error geocoding address' },
              {
                detail: (() => {
                  with (vars) {
                    return body.status.message;
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
                  return body.results[0].geometry.lat;
                }
              })(),
            },
            {
              longitude: (() => {
                with (vars) {
                  return body.results[0].geometry.lng;
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
                  return body.status.message;
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
                  return body.status.message;
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
                  return body.status.message;
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
                  return body.status.message;
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
    vars = Object.assign(vars, {
      payload: (() => {
        with (vars) {
          return `${input.latitude}+${input.longitude}`;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/geocode/v1/json`, {
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
                return body.status.code !== 200;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Error reverse geocoding coordinates' },
              {
                detail: (() => {
                  with (vars) {
                    return body.status.message;
                  }
                })(),
              }
            );
            /* return */ break FN_BODY;
          }
          if (
            (() => {
              with (vars) {
                return !body.total_results;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Error reverse geocoding coordinates' },
              { detail: 'No results returned' }
            );
            /* return */ break FN_BODY;
          }
          __outcome.data = (() => {
            with (vars) {
              return body.results.map(result => {
                let mappedAddress = {};

                // country code
                if (result.components.country_code) {
                  mappedAddress.addressCountry = result.components.country_code;
                } else if (result.components['ISO_3166-1_alpha-2']) {
                  mappedAddress.addressCountry =
                    result.components['ISO_3166-1_alpha-2'];
                }

                // region
                if (result.components.state_code) {
                  mappedAddress.addressRegion = result.components.city_district
                    ? `${result.components.city_district}, ${result.components.state_code}`
                    : result.components.state_code;
                }

                // locality
                if (result.components.city) {
                  mappedAddress.addressLocality = result.components.borough
                    ? `${result.components.borough}, ${result.components.city}`
                    : result.components.city;
                }

                // street number
                if (result.components.house_number) {
                  mappedAddress.streetAddress = result.components.house_number;
                }

                // street address
                if (result.components.road) {
                  mappedAddress.streetAddress = mappedAddress.streetAddress
                    ? `${mappedAddress.streetAddress} ${result.components.road}`
                    : result.components.road;
                }

                // postal code
                if (result.components.postcode) {
                  mappedAddress.postalCode = result.components.postcode;
                }

                // formatted address
                if (result.formatted) {
                  mappedAddress.formattedAddress = result.formatted;
                }

                return mappedAddress;
              });
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
                  return body.status.message;
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
                  return body.status.message;
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
                  return body.status.message;
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
                  return body.status.message;
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
