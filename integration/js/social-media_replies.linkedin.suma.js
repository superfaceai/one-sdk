// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetPostReplies':
      mapFn = GetPostReplies;
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

function GetPostReplies(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, { count: 10 });
    vars = Object.assign(vars, {
      inputPage: (() => {
        with (vars) {
          return parseInt(input.page, 10);
        }
      })(),
    });
    vars = Object.assign(vars, {
      start: (() => {
        with (vars) {
          return isNaN(inputPage) ? 0 : inputPage;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/v2/socialActions/${input.parentId}/comments?count=${vars.count}&start=${vars.start}`,
        { parameters, security, serviceId: 'default' }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign(
        {},
        {
          Authorization: (() => {
            with (vars) {
              return `Bearer ${parameters.accessToken}`;
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
            paging: (() => {
              with (vars) {
                return body.paging;
              }
            })(),
          });
          vars = Object.assign(vars, {
            result: (() => {
              with (vars) {
                return {
                  previousPage:
                    paging.start > 0
                      ? `${Math.max(0, paging.start - paging.count)}`
                      : undefined,
                  // count is passed value, not the real count of items
                  nextPage:
                    paging.start + paging.count < paging.total
                      ? `${paging.start + paging.count}`
                      : undefined,
                };
              }
            })(),
          });
          vars = Object.assign(vars, {
            result: {
              replies: (() => {
                with (vars) {
                  return body.elements.map(element => {
                    return {
                      id: element['$URN'],
                      text: element.message.text,
                      createdAt: std.unstable.time.unixTimestampToIsoDate(
                        element.created.time
                      ),
                      authorId: element.created.actor,
                      lastModifiedAt: std.unstable.time.unixTimestampToIsoDate(
                        element.lastModified.time
                      ),
                    };
                  });
                }
              })(),
            },
          });
          __outcome.data = (() => {
            with (vars) {
              return result;
            }
          })();
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
