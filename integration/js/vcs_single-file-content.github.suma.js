// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'SingleFileContent':
      mapFn = SingleFileContent;
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

function SingleFileContent(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      owner: (() => {
        with (vars) {
          return input.owner;
        }
      })(),
    });
    vars = Object.assign(vars, {
      repo: (() => {
        with (vars) {
          return input.repo;
        }
      })(),
    });
    vars = Object.assign(vars, {
      path: (() => {
        with (vars) {
          return input.path;
        }
      })(),
    });
    vars = Object.assign(vars, {
      ref: (() => {
        with (vars) {
          return input.ref;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/repos/${vars.owner}/${vars.repo}/contents/${vars.path}?ref=${vars.ref}`,
        { parameters, security, serviceId: 'default' }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response * "*" "*" */
        const statusCode = response.status;
        const headers = response.headers;
        const body = response.bodyAuto();
        if (
          (() => {
            with (vars) {
              return statusCode === 200;
            }
          })()
        ) {
          __outcome.data = Object.assign(
            {},
            {
              size: (() => {
                with (vars) {
                  return body.size;
                }
              })(),
            },
            {
              content: (() => {
                with (vars) {
                  return body.content;
                }
              })(),
            },
            {
              encoding: (() => {
                with (vars) {
                  return body.encoding;
                }
              })(),
            }
          );
        }
        if (
          (() => {
            with (vars) {
              return statusCode !== 200;
            }
          })()
        ) {
          __outcome.error = (() => {
            with (vars) {
              return {
                message: body.message,
                description: body.documentation_url,
                statusCode: statusCode,
              };
            }
          })();
        }
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
