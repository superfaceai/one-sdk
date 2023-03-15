// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'TextToSpeechSynthesis':
      mapFn = TextToSpeechSynthesis;
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

function TextToSpeechSynthesis(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      audio: (() => {
        with (vars) {
          return input.audio;
        }
      })(),
    });
    vars = Object.assign(vars, {
      voice: (() => {
        with (vars) {
          return input.voice;
        }
      })(),
    });
    vars = Object.assign(vars, {
      encoding: (() => {
        const acc = [];
        {
          const outcome = MapAudioEncoding(
            Object.assign(
              {},
              {
                encoding: (() => {
                  with (vars) {
                    return audio.encoding;
                  }
                })(),
              }
            ),
            parameters,
            security
          );
          if (outcome.error !== undefined) {
            throw new Error(`Unexpected inline call failure: ${outcome.error}`);
          } else {
            acc.push(outcome.data);
          }
        }
        return acc[0];
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/v1/text:synthesize`, {
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
      requestOptions.body = Object.assign(
        {},
        {
          input: (() => {
            with (vars) {
              return {
                text: input.text,
              };
            }
          })(),
        },
        {
          voice: (() => {
            with (vars) {
              return {
                languageCode: voice.languageCode,
                name: voice.name,
              };
            }
          })(),
        },
        {
          audioConfig: (() => {
            with (vars) {
              return {
                audioEncoding: encoding,
                sampleRateHertz: audio.sampleRateHertz,
              };
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
              audioContent: (() => {
                const acc = [];
                {
                  const outcome = Base64StringToBuffer(
                    Object.assign(
                      {},
                      {
                        input: (() => {
                          with (vars) {
                            return body.audioContent;
                          }
                        })(),
                      }
                    ),
                    parameters,
                    security
                  );
                  if (outcome.error !== undefined) {
                    throw new Error(
                      `Unexpected inline call failure: ${outcome.error}`
                    );
                  } else {
                    acc.push(outcome.data);
                  }
                }
                return acc[0];
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
            {
              title: (() => {
                with (vars) {
                  return body.error.status === 'INVALID_ARGUMENT'
                    ? 'Invalid argument'
                    : 'Bad request';
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.error.message;
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
                  return body.error.message;
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
                  return body.error.message;
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
                  return body.error.message;
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
function MapAudioEncoding(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      result: (() => {
        with (vars) {
          return (() => {
            switch (args.encoding) {
              case 'mp3':
                return 'MP3';

              case 'linear_pcm':
                return 'LINEAR16';

              default:
                return 'unknown';
            }
          })();
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return result;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function Base64StringToBuffer(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      result: (() => {
        with (vars) {
          return (() => {
            return Buffer.from(args.input, 'base64');
          })();
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return result;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
