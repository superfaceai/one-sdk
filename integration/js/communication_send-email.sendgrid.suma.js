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
      INPUTS_MAP: (() => {
        with (vars) {
          return {
            'personalizations.0.to.0.email': 'to',
            'from.email': 'from',
            subject: 'subject',
          };
        }
      })(),
    });
    vars = Object.assign(vars, {
      content: (() => {
        with (vars) {
          return [];
        }
      })(),
    });
    vars = Object.assign(vars, {
      attachments: (() => {
        with (vars) {
          return null;
        }
      })(),
    });
    vars = Object.assign(vars, {
      content: (() => {
        with (vars) {
          return content.concat([{ type: 'text/plain', value: input.text }]);
        }
      })(),
    });
    vars = Object.assign(vars, {
      content: (() => {
        with (vars) {
          return content.concat([{ type: 'text/html', value: input.html }]);
        }
      })(),
    });
    vars = Object.assign(vars, {
      attachments: (() => {
        with (vars) {
          return input.attachments.map(attachment => {
            return {
              content: attachment.content,
              filename: attachment.filename,
              type: attachment.type,
            };
          });
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/v3/mail/send`, {
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
      requestOptions.body = (() => {
        with (vars) {
          return {
            from: { email: input.from },
            subject: input.subject,
            content: content,
            personalizations: [
              {
                to: [{ email: input.to }],
              },
            ],
            attachments: attachments,
          };
        }
      })();
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 202 "*" "*" */
        if (response.status === 202) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.data = Object.assign(
            {},
            {
              messageId: (() => {
                with (vars) {
                  return headers['x-message-id'];
                }
              })(),
            }
          );
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
            { title: 'Invalid inputs' },
            {
              detail: (() => {
                with (vars) {
                  return body.errors
                    .map(
                      err =>
                        `Input '${INPUTS_MAP[err.field] || err.field}': ${
                          err.message
                        }`
                    )
                    .join(' ');
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 413 "application/json" "*" */
        if (
          response.status === 413 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Payload Too Large' },
            {
              detail: (() => {
                with (vars) {
                  return body.errors.map(err => err.message).join(' ');
                }
              })(),
            }
          );
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
            { title: 'Unauthorized' },
            {
              detail: (() => {
                with (vars) {
                  return body.errors.map(err => err.message).join(' ');
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 403 "application/json" "*" */
        if (
          response.status === 403 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Forbidden' },
            {
              detail: (() => {
                with (vars) {
                  return body.errors.map(err => err.message).join(' ');
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 500 "application/json" "*" */
        if (
          response.status === 500 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Internal server Error' },
            {
              detail: (() => {
                with (vars) {
                  return body.errors.map(err => err.message).join(' ');
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
