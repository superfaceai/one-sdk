// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'PullRequests':
      mapFn = PullRequests;
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

function PullRequests(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const outcome = Paginate(
        Object.assign(
          {},
          {
            id: (() => {
              with (vars) {
                return encodeURIComponent(input.owner + '/' + input.repo);
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
      __outcome.data = (() => {
        with (vars) {
          return outcome.data;
        }
      })();
      /* return */ break FN_BODY;
    }
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
    {
      for (const _x of (() => {
        with (vars) {
          return Array(1000);
        }
      })()) {
        const outcome = FetchPullRequests(
          Object.assign(
            {},
            {
              id: (() => {
                with (vars) {
                  return args.id;
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
              return [...data, ...outcome.data.pullRequests];
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
              return outcome.data.isLastPage;
            }
          })()
        ) {
          __outcome.data = (() => {
            with (vars) {
              return {
                pullRequests: data,
                statusCode: 200,
              };
            }
          })();
          /* return */ break FN_BODY;
        }
      }
    }
    __outcome.data = (() => {
      with (vars) {
        return {
          pullRequests: data,
          statusCode: 200,
        };
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function FetchPullRequests(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/v4/projects/${args.id}/merge_requests`,
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
        { scope: 'all' },
        { state: 'all' },
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
                statusCode: statusCode,
              };
            }
          })();
          /* return */ break FN_BODY;
        }
        __outcome.data = (() => {
          with (vars) {
            return {
              pullRequests: body.map(pr => {
                return {
                  title: pr.title,
                  id: pr.iid,
                  url: pr.web_url,
                  sha: pr.sha,
                };
              }),
              statusCode: statusCode,
              isLastPage: headers['x-next-page'] === '',
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
