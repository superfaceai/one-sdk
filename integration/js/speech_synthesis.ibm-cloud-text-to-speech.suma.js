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
    {
      const url = std.unstable.resolveRequestUrl(
        `/instances/${parameters.INSTANCE_ID}/v1/synthesize`,
        { parameters, security, serviceId: 'default' }
      );
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign(
        {},
        {
          Accept: (() => {
            const acc = [];
            {
              const outcome = mapEncodingToMimeType(
                Object.assign(
                  {},
                  {
                    audio: (() => {
                      with (vars) {
                        return input.audio;
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
      requestOptions.query = Object.assign(
        {},
        {
          voice: (() => {
            const acc = [];
            {
              const outcome = mapVoiceOptionsToVoiceQueryParameter(
                Object.assign(
                  {},
                  {
                    voice: (() => {
                      with (vars) {
                        return input.voice;
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
      requestOptions.body = Object.assign(
        {},
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
          vars = Object.assign(vars, {
            audioContent: (() => {
              const acc = [];
              {
                const outcome = arrayBufferToBuffer(
                  Object.assign(
                    {},
                    {
                      arrayBuffer: (() => {
                        with (vars) {
                          return body;
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
          });
          __outcome.data = Object.assign(
            {},
            {
              audioContent: (() => {
                with (vars) {
                  return audioContent;
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
function mapEncodingToMimeType(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      rate: (() => {
        with (vars) {
          return args.audio.sampleRateHertz;
        }
      })(),
    });
    vars = Object.assign(vars, {
      result: (() => {
        with (vars) {
          return (() => {
            switch (args.audio.encoding) {
              case 'mp3':
                if (!rate) rate = 22050;
                return 'audio/mp3;rate=' + rate;

              case 'linear_pcm':
                if (!rate) rate = 8000;
                return 'audio/wav;rate=' + rate;

              default:
                return 'audio/wav';
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
function mapVoiceOptionsToVoiceQueryParameter(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      languageCode: (() => {
        with (vars) {
          return (() => {
            if (args.voice.languageCode.length > 2)
              return args.voice.languageCode;
            const defaultFullLanguageCodes = {
              ar: 'ar-MS',
              pt: 'pt-BR',
              cn: 'zh-CN',
              nl: 'nl-NL',
              en: 'en-US',
              es: 'es-ES',
              fr: 'fr-FR',
              de: 'de-DE',
              it: 'it-IT',
              jp: 'ja-JP',
              ko: 'ko-KR',
            };
            if (!defaultFullLanguageCodes[args.voice.languageCode])
              return 'en-US';

            return defaultFullLanguageCodes[args.voice.languageCode];
          })();
        }
      })(),
    });
    vars = Object.assign(vars, {
      name: (() => {
        with (vars) {
          return args.voice.name;
        }
      })(),
    });
    vars = Object.assign(vars, {
      name: (() => {
        const acc = [];
        {
          const outcome = getDefaultVoiceName(
            Object.assign(
              {},
              {
                languageCode: (() => {
                  with (vars) {
                    return languageCode;
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
    __outcome.data = (() => {
      with (vars) {
        return languageCode + '_' + name;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function getDefaultVoiceName(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      name: (() => {
        with (vars) {
          return (() => {
            const defaultLanguageCodeVoiceNames = {
              'ar-MS': 'OmarVoice',
              'pt-BR': 'IsabelaV3Voice',
              'zh-CN': 'LiNaVoice',
              'nl-NL': 'EmmaVoice',
              'en-AU': 'CraigVoice',
              'en-GB': 'CharlotteV3Voice',
              'en-US': 'AllisonV3Voice',
              'es-ES': 'EnriqueV3Voice',
              'es-LA': 'SofiaV3Voice',
              'es-US': 'SofiaV3Voice',
              'fr-FR': 'NicolasV3Voice',
              'de-DE': 'BirgitV3Voice',
              'it-IT': 'FrancescaV3Voice',
              'ja-JP': 'EmiV3Voice',
              'ko-KR': 'HyunjunVoice',
            };
            if (!defaultLanguageCodeVoiceNames[args.languageCode]) return '';

            return defaultLanguageCodeVoiceNames[args.languageCode];
          })();
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return name;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function arrayBufferToBuffer(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      result: (() => {
        with (vars) {
          return (() => {
            return Buffer.from(args.arrayBuffer);
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
