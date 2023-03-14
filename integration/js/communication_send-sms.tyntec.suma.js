// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'SendMessage':
      mapFn = SendMessage;
      break;
    case 'RetrieveMessageStatus':
      mapFn = RetrieveMessageStatus;
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

function SendMessage(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/chat-api/v2/messages`, {
        parameters,
        security,
        serviceId: 'default',
      });
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.body = Object.assign(
        {},
        {
          to: (() => {
            with (vars) {
              return input.to;
            }
          })(),
        },
        {
          channels: (() => {
            with (vars) {
              return ['sms'];
            }
          })(),
        },
        {
          sms: {
            from: (() => {
              with (vars) {
                return input.from;
              }
            })(),
          },
        },
        { sms: { contentType: 'text' } },
        {
          sms: {
            text: (() => {
              with (vars) {
                return input.text;
              }
            })(),
          },
        }
      );
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 202 "application/json" "*" */
        if (
          response.status === 202 &&
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
              messageId: (() => {
                with (vars) {
                  return body.messageId;
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
function RetrieveMessageStatus(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      messageId: (() => {
        with (vars) {
          return input.messageId;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/chat-api/v2/messages/${vars.messageId}/history`,
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
                return !body.history.length;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'History not available' }
            );
            /* return */ break FN_BODY;
          }
          vars = Object.assign(vars, {
            latestState: (() => {
              with (vars) {
                return body.history[body.history.length - 1].state;
              }
            })(),
          });
          vars = Object.assign(vars, {
            latestState: (() => {
              with (vars) {
                return (() => {
                  switch (latestState) {
                    case 'message-routing-success':
                    case 'message-accepted':
                      return 'accepted';
                    default:
                      return 'unknown';
                  }
                })();
              }
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              deliveryStatus: (() => {
                with (vars) {
                  return latestState;
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
