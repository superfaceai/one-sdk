// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'SendEmail':
      mapFn = SendEmail;
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

function SendEmail(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
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
            subject: input.subject,
          };
        }
      })(),
    });
    vars = Object.assign(vars, {
      message: {
        text: (() => {
          with (vars) {
            return input.text;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      message: {
        html: (() => {
          with (vars) {
            return input.html;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      message: {
        attachments: (() => {
          with (vars) {
            return input.attachments.map(attachment => {
              return {
                content: attachment.content,
                name: attachment.filename,
                type: attachment.type,
              };
            });
          }
        })(),
      },
    });
    {
      const url = std.unstable.resolveRequestUrl(`/api/1.0/messages/send`, {
        parameters,
        security,
        serviceId: undefined,
      });
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.body = (() => {
        with (vars) {
          return {
            message: message,
          };
        }
      })();
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
            msgStatus: (() => {
              with (vars) {
                return body[0].status;
              }
            })(),
          });
          if (
            (() => {
              with (vars) {
                return (
                  msgStatus === 'sent' ||
                  msgStatus === 'queued' ||
                  msgStatus === 'scheduled'
                );
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
            /* return */ break FN_BODY;
          }
          __outcome.error = Object.assign(
            {},
            { title: 'Send Email Failed' },
            {
              detail: (() => {
                with (vars) {
                  return `${msgStatus}: ${body[0].reject_reason}`;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
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
              { title: 'Internal server Error' },
              {
                detail: (() => {
                  with (vars) {
                    return body.message || `${body}`;
                  }
                })(),
              }
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
