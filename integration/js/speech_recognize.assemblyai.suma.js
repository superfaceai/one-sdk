// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'Recognize':
      mapFn = Recognize;
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

function Recognize(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, { audioEncoding: 'wav' });
    vars = Object.assign(vars, { language: 'en' });
    vars = Object.assign(vars, {
      audioEncoding: (() => {
        with (vars) {
          return input.audioEncoding;
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return audioEncoding !== 'wav';
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Audio encoding not supported' }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return !input.languageCode.startsWith('en');
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        {
          title:
            'assemblyai provider supports only Global English (English and all of its accents)',
        }
      );
      /* return */ break FN_BODY;
    }
    {
      const url = std.unstable.resolveRequestUrl(`/v2/stream`, {
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
        { 'Content-Type': 'application/json' }
      );
      requestOptions.body = (() => {
        with (vars) {
          return {
            audio_data: input.audioContent,
          };
        }
      })();
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 200 "*" "*" */
        if (response.status === 200) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.data = Object.assign(
            {},
            {
              results: (() => {
                with (vars) {
                  return [
                    {
                      alternatives: [
                        {
                          transcript: body.text,
                          confidence: body.confidence,
                        },
                      ],
                    },
                  ];
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 400 "*" "*" */
        if (response.status === 400) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Bad request' },
            {
              detail: (() => {
                with (vars) {
                  return body.error;
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
                  return body.error;
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
                  return body.error;
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
                  return body.error;
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
