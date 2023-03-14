// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'SendTemplatedEmail':
      mapFn = SendTemplatedEmail;
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

function SendTemplatedEmail(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/api/1.0/messages/send-template`,
        { parameters, security, serviceId: 'default' }
      );
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.body = Object.assign(
        {},
        {
          template_name: (() => {
            with (vars) {
              return input.templateId;
            }
          })(),
        },
        {
          template_content: (() => {
            with (vars) {
              return Object.entries(input.templateData || {}).map(
                ([name, content]) => ({ name: name, content: content })
              );
            }
          })(),
        },
        {
          message: (() => {
            with (vars) {
              return {
                from_email: input.from,
                to: [
                  {
                    email: input.to,
                    type: 'to',
                  },
                ],
              };
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
                return body[0].status === 'sent';
              }
            })()
          ) {
            __outcome.data = Object.assign(
              {},
              {
                messageId: (() => {
                  with (vars) {
                    return body[0]._id;
                  }
                })(),
              }
            );
          }
          if (
            (() => {
              with (vars) {
                return body[0].status !== 'sent';
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Send Email Failed' },
              {
                detail: (() => {
                  with (vars) {
                    return `${body[0].status}: ${body[0].reject_reason}`;
                  }
                })(),
              }
            );
          }
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 500 "*" "*" */
        if (response.status === 500) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          if (
            (() => {
              with (vars) {
                return body;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Internal server Error' }
            );
          }
          if (
            (() => {
              with (vars) {
                return body.name === 'ValidationError';
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Invalid inputs' },
              {
                detail: (() => {
                  with (vars) {
                    return body.message;
                  }
                })(),
              }
            );
          }
          if (
            (() => {
              with (vars) {
                return body.name === 'Invalid_Key';
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Unauthorized' },
              { detail: 'Invalid key' }
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
