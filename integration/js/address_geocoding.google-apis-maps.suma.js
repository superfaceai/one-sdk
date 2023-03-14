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
      const url = std.unstable.resolveRequestUrl(`/maps/api/geocode/json`, {
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
          address: (() => {
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
                return body.status !== 'OK';
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Error geocoding address' },
              {
                detail: (() => {
                  with (vars) {
                    return body.status;
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
                  return body.results[0].geometry.location.lat;
                }
              })(),
            },
            {
              longitude: (() => {
                with (vars) {
                  return body.results[0].geometry.location.lng;
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
            {
              title: (() => {
                with (vars) {
                  return body.status === 'INVALID_ARGUMENT'
                    ? 'Invalid argument'
                    : 'Bad request';
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.error_message;
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
                  return body.error_message;
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
                  return body.error_message;
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
                  return body.error_message;
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
          return `${input.latitude},${input.longitude}`;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/maps/api/geocode/json`, {
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
          latlng: (() => {
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
                return body.status !== 'OK';
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Error reverse geocoding coordinates' },
              {
                detail: (() => {
                  with (vars) {
                    return body.status;
                  }
                })(),
              }
            );
            /* return */ break FN_BODY;
          }
          vars = Object.assign(vars, {
            filteredResults: (() => {
              with (vars) {
                return body.results.filter(result =>
                  result.types.includes('street_address')
                );
              }
            })(),
          });
          __outcome.data = (() => {
            with (vars) {
              return filteredResults.map(result => {
                const mappedAddress = {};

                for (const component of result.address_components) {
                  // country code
                  if (component.types.includes('country')) {
                    mappedAddress.addressCountry = component.short_name;
                  }

                  // region
                  if (component.types.includes('administrative_area_level_1')) {
                    mappedAddress.addressRegion = mappedAddress.addressRegion
                      ? `${mappedAddress.addressRegion}, ${component.short_name}`
                      : component.short_name;
                  }
                  if (component.types.includes('administrative_area_level_2')) {
                    mappedAddress.addressRegion = mappedAddress.addressRegion
                      ? `${component.short_name}, ${mappedAddress.addressRegion}`
                      : component.short_name;
                  }

                  // locality
                  if (component.types.includes('locality')) {
                    mappedAddress.addressLocality = component.short_name;
                  }
                  if (component.types.includes('sublocality_level_1')) {
                    mappedAddress.addressLocality =
                      mappedAddress.addressLocality
                        ? `${component.short_name}, ${mappedAddress.addressLocality}`
                        : component.short_name;
                  }
                  if (component.types.includes('sublocality_level_2')) {
                    mappedAddress.addressLocality =
                      mappedAddress.addressLocality
                        ? `${component.short_name}, ${mappedAddress.addressLocality}`
                        : component.short_name;
                  }

                  // street number
                  if (component.types.includes('street_number')) {
                    mappedAddress.streetAddress = component.short_name;
                  }

                  // street address
                  if (component.types.includes('route')) {
                    mappedAddress.streetAddress = mappedAddress.streetAddress
                      ? `${mappedAddress.streetAddress} ${component.short_name}`
                      : component.short_name;
                  }

                  // postal code
                  if (component.types.includes('postal_code')) {
                    mappedAddress.postalCode = component.short_name;
                  }
                }

                // formatted address
                if (result.formatted_address) {
                  mappedAddress.formattedAddress = result.formatted_address;
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
            {
              title: (() => {
                with (vars) {
                  return body.status === 'INVALID_ARGUMENT'
                    ? 'Invalid argument'
                    : 'Bad request';
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.error_message;
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
                  return body.error_message;
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
                  return body.error_message;
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
                  return body.error_message;
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
