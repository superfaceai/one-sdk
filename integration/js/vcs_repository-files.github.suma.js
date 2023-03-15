// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'ListDirectory':
      mapFn = ListDirectory;
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

function ListDirectory(input, parameters, security) {
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
          return input.repository;
        }
      })(),
    });
    vars = Object.assign(vars, {
      path: (() => {
        with (vars) {
          return input.path || '';
        }
      })(),
    });
    vars = Object.assign(vars, {
      ref: (() => {
        with (vars) {
          return input.reference;
        }
      })(),
    });
    vars = Object.assign(vars, {
      parts: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      parts: (() => {
        with (vars) {
          return repo.split('/');
        }
      })(),
    });
    vars = Object.assign(vars, {
      owner: (() => {
        with (vars) {
          return parts[0];
        }
      })(),
    });
    vars = Object.assign(vars, {
      repo: (() => {
        with (vars) {
          return parts[1];
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return !owner;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { message: 'Missing owner' },
        {
          detail:
            "Either specify 'owner', or include the owner in the 'repository' (e.g. 'octocat/hello-world')",
        }
      );
      /* return */ break FN_BODY;
    }
    {
      const url = std.unstable.resolveRequestUrl(
        `/repos/${vars.owner}/${vars.repo}/contents/${vars.path}`,
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
        {
          ref: (() => {
            with (vars) {
              return ref;
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
            entries: (() => {
              with (vars) {
                return Array.isArray(body) ? body : [body];
              }
            })(),
          });
          vars = Object.assign(vars, {
            mappedEntries: (() => {
              with (vars) {
                return entries.map(entry => {
                  // NOTE: Submodules are exposed as files with size = 0
                  const type = entry.type === 'dir' ? 'directory' : entry.type;
                  return {
                    name: entry.name,
                    path: entry.path,
                    type: type,
                    size: type === 'directory' ? undefined : entry.size,
                    rawUrl: entry.download_url ? entry.download_url : undefined,
                  };
                });
              }
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              entries: (() => {
                with (vars) {
                  return mappedEntries;
                }
              })(),
            }
          );
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
          __outcome.error = Object.assign(
            {},
            {
              message: (() => {
                with (vars) {
                  return body.message
                    ? body.message
                    : `Unknown error, status code: ${statusCode}`;
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.documentation_url;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
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
