// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetAccessTokenFromRefreshToken':
      mapFn = GetAccessTokenFromRefreshToken;
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

function GetAccessTokenFromRefreshToken(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      clientId: (() => {
        with (vars) {
          return input.clientId || parameters.clientId;
        }
      })(),
    });
    vars = Object.assign(vars, {
      clientSecret: (() => {
        with (vars) {
          return input.clientSecret || parameters.clientSecret;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/2/oauth2/token`, {
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
      requestOptions.headers = Object.assign(
        {},
        { 'Accept-Encoding': 'identity' },
        {
          Authorization: (() => {
            with (vars) {
              return (
                'Basic ' +
                Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
              );
            }
          })(),
        }
      );
      requestOptions.headers['content-type'] = [
        'application/x-www-form-urlencoded',
      ];
      requestOptions.body = Object.assign(
        {},
        { grant_type: 'refresh_token' },
        {
          refresh_token: (() => {
            with (vars) {
              return input.refreshToken;
            }
          })(),
        },
        {
          client_id: (() => {
            with (vars) {
              return clientId;
            }
          })(),
        },
        {
          client_secret: (() => {
            with (vars) {
              return clientSecret;
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
          __outcome.data = Object.assign(
            {},
            {
              accessToken: (() => {
                with (vars) {
                  return body.access_token;
                }
              })(),
            },
            {
              refreshToken: (() => {
                with (vars) {
                  return body.refresh_token;
                }
              })(),
            },
            {
              expiresIn: (() => {
                with (vars) {
                  return body.expires_in;
                }
              })(),
            },
            {
              tokenType: (() => {
                with (vars) {
                  return body.token_type;
                }
              })(),
            },
            {
              scopes: (() => {
                with (vars) {
                  return body.scope.split(' ');
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response * "application/json" "*" */
        if (
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
                return body.error;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              {
                error: (() => {
                  with (vars) {
                    return body.error;
                  }
                })(),
              },
              {
                description: (() => {
                  with (vars) {
                    return body.error_description;
                  }
                })(),
              },
              {
                link: (() => {
                  with (vars) {
                    return body.error_uri;
                  }
                })(),
              }
            );
            /* return */ break FN_BODY;
          }
          __outcome.error = Object.assign(
            {},
            { error: 'unknown_response' },
            {
              description: (() => {
                with (vars) {
                  return JSON.stringify(body, null, 2);
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
