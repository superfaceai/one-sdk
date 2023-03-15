// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetExchangeRate':
      mapFn = GetExchangeRate;
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

function GetExchangeRate(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const outcome = sendExchangeRateRequest(
        Object.assign(
          {},
          {
            from: (() => {
              with (vars) {
                return input.from;
              }
            })(),
          },
          {
            to: (() => {
              with (vars) {
                return input.to;
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
            return !outcome.error;
          }
        })()
      ) {
        __outcome.data = Object.assign(
          {},
          {
            rate: (() => {
              with (vars) {
                return outcome.data;
              }
            })(),
          }
        );
        /* return */ break FN_BODY;
      }
    }
    {
      const outcome = sendExchangeRateRequest(
        Object.assign(
          {},
          {
            from: (() => {
              with (vars) {
                return input.to;
              }
            })(),
          },
          {
            to: (() => {
              with (vars) {
                return input.from;
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
            return !outcome.error;
          }
        })()
      ) {
        __outcome.data = Object.assign(
          {},
          {
            rate: (() => {
              with (vars) {
                return String((1 / outcome.data).toFixed(8));
              }
            })(),
          }
        );
        /* return */ break FN_BODY;
      }
      __outcome.error = Object.assign(
        {},
        {
          title: (() => {
            with (vars) {
              return outcome.error.title;
            }
          })(),
        },
        {
          detail: (() => {
            with (vars) {
              return outcome.error.detail;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function sendExchangeRateRequest(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/api/v3/ticker/price`, {
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
          symbol: (() => {
            with (vars) {
              return args.from + args.to;
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
          __outcome.data = (() => {
            with (vars) {
              return body.price;
            }
          })();
          /* return */ break FN_BODY;
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
            { title: '400 - Bad Request' },
            {
              detail: (() => {
                with (vars) {
                  return body.msg;
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
  return __outcome;
}
