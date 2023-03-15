// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'PublishPost':
      mapFn = PublishPost;
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

function PublishPost(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    if (
      (() => {
        with (vars) {
          return input.media && input.media.length > 0;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Media publishing not implemented' },
        { detail: 'Publishing media to Twitter provider is not yet supported.' }
      );
      /* return */ break FN_BODY;
    }
    vars = Object.assign(vars, {
      text: (() => {
        with (vars) {
          return input.link
            ? `${input.text || ''} ${input.link}`.trim()
            : input.text;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/2/tweets`, {
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
      requestOptions.headers = Object.assign(
        {},
        {
          authorization: (() => {
            with (vars) {
              return 'Bearer ' + parameters.accessToken;
            }
          })(),
        }
      );
      requestOptions.body = Object.assign(
        {},
        {
          text: (() => {
            with (vars) {
              return text;
            }
          })(),
        }
      );
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 201 "application/json" "*" */
        if (
          response.status === 201 &&
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
              postId: (() => {
                with (vars) {
                  return body.data.id;
                }
              })(),
            },
            {
              url: (() => {
                with (vars) {
                  return 'https://twitter.com/i/status/' + body.data.id;
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
            { title: 'Bad request' },
            {
              detail: (() => {
                with (vars) {
                  return body.detail;
                }
              })(),
            },
            {
              original: (() => {
                with (vars) {
                  return body;
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
            { title: 'Unauthenticated' },
            {
              detail: (() => {
                with (vars) {
                  return body.detail;
                }
              })(),
            },
            {
              original: (() => {
                with (vars) {
                  return body;
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
                  return body.detail;
                }
              })(),
            },
            {
              original: (() => {
                with (vars) {
                  return body;
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
