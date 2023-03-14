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
    vars = Object.assign(vars, {
      audioContent: (() => {
        with (vars) {
          return input.audioContent;
        }
      })(),
    });
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
    vars = Object.assign(vars, { maxAlternatives: 1 });
    vars = Object.assign(vars, {
      maxAlternatives: (() => {
        with (vars) {
          return input.maxAlternatives;
        }
      })(),
    });
    {
      if (
        (() => {
          with (vars) {
            return audioEncoding === 'wav';
          }
        })()
      ) {
        const outcome = RecognizeWav(
          Object.assign(
            {},
            {
              maxAlternatives: (() => {
                with (vars) {
                  return maxAlternatives;
                }
              })(),
            },
            {
              audioEncoding: (() => {
                with (vars) {
                  return audioEncoding;
                }
              })(),
            },
            {
              audioContent: (() => {
                with (vars) {
                  return audioContent;
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
          __outcome.data = (() => {
            with (vars) {
              return outcome.data;
            }
          })();
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
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function RecognizeWav(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/instances/${parameters.INSTANCE_ID}/v1/recognize`,
        { parameters, security, serviceId: 'default' }
      );
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers['content-type'] = ['audio/wav'];
      requestOptions.query = Object.assign(
        {},
        {
          max_alternatives: (() => {
            with (vars) {
              return args.maxAlternatives;
            }
          })(),
        }
      );
      requestOptions.body = (() => {
        with (vars) {
          return Buffer.from(args.audioContent, 'base64');
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
                const acc = [];
                {
                  for (const result of (() => {
                    with (vars) {
                      return body.results;
                    }
                  })()) {
                    const outcome = MapResult(
                      Object.assign(
                        {},
                        {
                          result: (() => {
                            with (vars) {
                              return result;
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
                }
                return acc;
              })(),
            }
          );
          /* return */ break FN_BODY;
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
          /* return */ break FN_BODY;
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
          /* return */ break FN_BODY;
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
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 404 "*" "*" */
        if (response.status === 404) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            {
              title: (() => {
                with (vars) {
                  return body.code_description;
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.error;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
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
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        throw new Error('Unexpected response');
      }
    }
  }
  return __outcome;
}
function MapResult(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        alternatives: (() => {
          const acc = [];
          {
            for (const alternative of (() => {
              with (vars) {
                return args.result.alternatives;
              }
            })()) {
              const outcome = MapAlternative(
                Object.assign(
                  {},
                  {
                    alternative: (() => {
                      with (vars) {
                        return alternative;
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
          }
          return acc;
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapAlternative(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        transcript: (() => {
          with (vars) {
            return args.alternative.transcript;
          }
        })(),
      },
      {
        confidence: (() => {
          with (vars) {
            return args.alternative.confidence;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
