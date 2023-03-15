// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'CleanAddress':
      mapFn = CleanAddress;
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

function CleanAddress(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      authId: (() => {
        with (vars) {
          return parameters.AUTH_ID;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/street-address`, {
        parameters,
        security,
        serviceId: undefined,
      });
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.query = Object.assign(
        {},
        {
          'auth-id': (() => {
            with (vars) {
              return authId;
            }
          })(),
        },
        {
          street: (() => {
            with (vars) {
              return input.street;
            }
          })(),
        },
        {
          city: (() => {
            with (vars) {
              return input.city;
            }
          })(),
        },
        {
          state: (() => {
            with (vars) {
              return input.state;
            }
          })(),
        },
        {
          zipcode: (() => {
            with (vars) {
              return input.zipcode;
            }
          })(),
        },
        { candidates: 1 }
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
          __outcome.data = Object.assign(
            {},
            {
              street: (() => {
                with (vars) {
                  return body[0].delivery_line_1;
                }
              })(),
            },
            {
              city: (() => {
                with (vars) {
                  return body[0].components.city_name;
                }
              })(),
            },
            {
              state: (() => {
                with (vars) {
                  return body[0].components.state_abbreviation;
                }
              })(),
            },
            {
              zipcode: (() => {
                with (vars) {
                  return body[0].components.zipcode;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 400 "*" "*" */
        if (response.status === 400) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign({}, { title: 'Bad request' });
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 401 "*" "*" */
        if (response.status === 401) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign({}, { title: 'Unauthorized' });
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 403 "*" "*" */
        if (response.status === 403) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign({}, { title: 'Forbidden' });
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 500 "*" "*" */
        if (response.status === 500) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Internal server Error' }
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
