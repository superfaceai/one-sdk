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
      const url = std.unstable.resolveRequestUrl(`/search/address/json`, {
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
        { 'api-version': '1.0' },
        {
          query: (() => {
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
                return body.results.length === 0;
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
                      payload.trim()
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
                  return body.results[0].position.lat;
                }
              })(),
            },
            {
              longitude: (() => {
                with (vars) {
                  return body.results[0].position.lon;
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
    vars = Object.assign(vars, {
      payload: (() => {
        with (vars) {
          return `${input.latitude},${input.longitude}`;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/search/address/reverse/json`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.query = Object.assign(
        {},
        { 'api-version': '1.0' },
        {
          query: (() => {
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
                return body.addresses.length === 0;
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
            addresses: (() => {
              with (vars) {
                return body.addresses
                  .map(item => item.address)
                  .filter(item => item.countryCode || item.freeformAddress);
              }
            })(),
          });
          if (
            (() => {
              with (vars) {
                return addresses.length === 0;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Could not find any information about address.' }
            );
            /* return */ break FN_BODY;
          }
          __outcome.data = (() => {
            with (vars) {
              return addresses.map(address => {
                let result = {};

                // country code
                if (address.countryCodeISO3 || address.countryCode) {
                  result.addressCountry =
                    address.countryCodeISO3 || address.countryCode;
                }

                // region
                if (address.countrySubdivision) {
                  result.addressRegion = address.countrySecondarySubdivision
                    ? `${address.countrySecondarySubdivision}, ${address.countrySubdivision}`
                    : address.countrySubdivision;
                }

                // locality
                if (address.countrySubdivisionName) {
                  result.addressLocality = address.localName
                    ? `${address.localName}, ${address.countrySubdivisionName}`
                    : address.countrySubdivisionName;
                }

                // street address
                if (address.streetName || address.streetNameAndNumber) {
                  result.streetAddress =
                    address.streetNameAndNumber || address.streetName;
                }

                // postal code
                if (address.postalCode || address.extendedPostalCode) {
                  result.postalCode =
                    address.postalCode || address.extendedPostalCode;
                }

                // formatted address
                if (address.freeformAddress) {
                  result.formattedAddress = address.country
                    ? `${address.freeformAddress}, ${address.country}`
                    : address.freeformAddress;
                }

                return result;
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
