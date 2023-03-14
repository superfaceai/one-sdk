// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'SendMessage':
      mapFn = SendMessage;
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
      const url = std.unstable.resolveRequestUrl(`/chat.postMessage`, {
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
      requestOptions.body = Object.assign(
        {},
        {
          channel: (() => {
            with (vars) {
              return input.destination;
            }
          })(),
        },
        {
          text: (() => {
            with (vars) {
              return input.text;
            }
          })(),
        }
      );
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 200 "*" "*" */
        if (response.status === 200) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          if (
            (() => {
              with (vars) {
                return body.ok;
              }
            })()
          ) {
            __outcome.data = Object.assign(
              {},
              {
                destination: (() => {
                  with (vars) {
                    return body.channel;
                  }
                })(),
              },
              {
                messageId: (() => {
                  with (vars) {
                    return body.ts;
                  }
                })(),
              }
            );
          }
          if (
            (() => {
              with (vars) {
                return !body.ok;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              {
                title: (() => {
                  with (vars) {
                    return body.error;
                  }
                })(),
              }
            );
          }
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
