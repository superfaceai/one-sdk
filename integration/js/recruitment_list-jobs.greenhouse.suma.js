// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'ListJobs':
      mapFn = ListJobs;
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

function ListJobs(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      JOB_STATES_G2S: (() => {
        with (vars) {
          return {
            open: 'published',
            closed: 'closed',
            draft: 'draft',
          };
        }
      })(),
    });
    vars = Object.assign(vars, {
      JOB_STATES_S2G: (() => {
        with (vars) {
          return {
            published: 'open',
            closed: 'closed',
            draft: 'draft',
          };
        }
      })(),
    });
    vars = Object.assign(vars, {
      page: (() => {
        with (vars) {
          return input.page || 1;
        }
      })(),
    });
    vars = Object.assign(vars, {
      limit: (() => {
        with (vars) {
          return input.limit || 100;
        }
      })(),
    });
    vars = Object.assign(vars, {
      status: (() => {
        with (vars) {
          return input.state && JOB_STATES_S2G[input.state];
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/v1/jobs`, {
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
        {
          page: (() => {
            with (vars) {
              return page;
            }
          })(),
        },
        {
          per_page: (() => {
            with (vars) {
              return limit;
            }
          })(),
        },
        {
          status: (() => {
            with (vars) {
              return status;
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
              jobs: (() => {
                with (vars) {
                  return body.map(job => {
                    return {
                      id: String(job.id),
                      name: job.name,
                      description: job.notes,
                      state: JOB_STATES_G2S[job.status],
                      departmentName: job.departments
                        .map(dept => dept.name)
                        .join(', '),
                      createdAt: job.created_at,
                    };
                  });
                }
              })(),
            },
            {
              pagination: (() => {
                with (vars) {
                  return {
                    previousPage: Math.max(page - 1, 0),
                    nextPage: page + 1,
                  };
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
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
            { title: 'Unauthenticated' },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
                }
              })(),
            },
            { code: 'Unauthenticated' }
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
