// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'UserRepos':
      mapFn = UserRepos;
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

function UserRepos(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    const outcome = Paginate(
      Object.assign(
        {},
        {
          user: (() => {
            with (vars) {
              return input.user;
            }
          })(),
        }
      ),
      parameters,
      security
    );
    if (
      (() => {
        with (vars) {
          return outcome.error;
        }
      })()
    ) {
      __outcome.error = (() => {
        with (vars) {
          return outcome.error;
        }
      })();
      /* return */ break FN_BODY;
    }
    __outcome.data = Object.assign(
      {},
      {
        repos: (() => {
          with (vars) {
            return outcome.data.repositories;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function Paginate(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      data: (() => {
        with (vars) {
          return [];
        }
      })(),
    });
    vars = Object.assign(vars, { page: 1 });
    for (const _x of (() => {
      with (vars) {
        return Array(1000);
      }
    })()) {
      const outcome = FetchRepos(
        Object.assign(
          {},
          {
            user: (() => {
              with (vars) {
                return args.user;
              }
            })(),
          },
          {
            page: (() => {
              with (vars) {
                return page;
              }
            })(),
          }
        ),
        parameters,
        security
      );
      if (
        (() => {
          with (vars) {
            return outcome.error;
          }
        })()
      ) {
        __outcome.error = (() => {
          with (vars) {
            return outcome.error;
          }
        })();
        /* return */ break FN_BODY;
      }
      vars = Object.assign(vars, {
        data: (() => {
          with (vars) {
            return [...data, ...outcome.data.repositories];
          }
        })(),
      });
      vars = Object.assign(vars, {
        page: (() => {
          with (vars) {
            return page + 1;
          }
        })(),
      });
      if (
        (() => {
          with (vars) {
            return outcome.data.repositories.length === 0;
          }
        })()
      ) {
        __outcome.data = (() => {
          with (vars) {
            return {
              repositories: data,
              statusCode: 200,
            };
          }
        })();
        /* return */ break FN_BODY;
      }
    }
    __outcome.data = (() => {
      with (vars) {
        return {
          repositories: data,
          statusCode: 200,
        };
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function FetchRepos(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/users/${args.user}/repos`, {
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
          page: (() => {
            with (vars) {
              return args.page;
            }
          })(),
        }
      );
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response * "*" "*" */
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
          __outcome.error = (() => {
            with (vars) {
              return {
                message: body.message,
                description: body.documentation_url,
                statusCode: statusCode,
              };
            }
          })();
          /* return */ break FN_BODY;
        }
        __outcome.data = (() => {
          with (vars) {
            return {
              repositories: body.map(r => {
                return {
                  name: r.name,
                  description:
                    r.description === null ? undefined : r.description,
                };
              }),
              statusCode: statusCode,
            };
          }
        })();
        /* return */ break FN_BODY;
        /* end handler */ break HTTP_RESPONSE;
        throw new Error('Unexpected response');
      }
    }
  }
  return __outcome;
}

