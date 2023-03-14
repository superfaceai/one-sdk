// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'NamedEntityRecognition':
      mapFn = NamedEntityRecognition;
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

function NamedEntityRecognition(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/instances/${parameters.INSTANCE_ID}/v1/analyze?version=2022-04-07`,
        { parameters, security, serviceId: 'default' }
      );
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
          text: (() => {
            with (vars) {
              return input.text;
            }
          })(),
        },
        {
          language: (() => {
            with (vars) {
              return input.languageCode;
            }
          })(),
        },
        {
          features: (() => {
            with (vars) {
              return {
                entities: {
                  sentiment: false,
                  mentions: false,
                  emotion: false,
                },
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
          vars = Object.assign(vars, {
            entities: (() => {
              const acc = [];
              {
                for (const entity of (() => {
                  with (vars) {
                    return body.entities;
                  }
                })()) {
                  const outcome = MapEntity(
                    Object.assign(
                      {},
                      {
                        entity: (() => {
                          with (vars) {
                            return entity;
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
          });
          __outcome.data = Object.assign(
            {},
            {
              entities: (() => {
                with (vars) {
                  return entities;
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
            { title: 'Unsuccessful Recognition' },
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
            { title: 'Forbidden Resource' },
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
        /* response 500 "*" "*" */
        if (response.status === 500) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: "Problem on IBM's side" },
            {
              detail: (() => {
                with (vars) {
                  return String(body);
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
function MapEntity(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        text: (() => {
          with (vars) {
            return args.entity.text;
          }
        })(),
      },
      {
        category: (() => {
          const acc = [];
          {
            const outcome = MapEntityCategory(
              Object.assign(
                {},
                {
                  ibmType: (() => {
                    with (vars) {
                      return args.entity.type;
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
      },
      {
        importance: (() => {
          with (vars) {
            return args.entity.relevance;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapEntityCategory(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      IBM_TO_PROFILE_MAPPING: (() => {
        with (vars) {
          return {
            Date: 'Date',
            Duration: 'Duration',
            EmailAddress: 'EmailAddress',
            Facility: 'Facility',
            GeographicFeature: 'GeographicFeature',
            Hashtag: 'Hashtag',
            IPAddress: 'IPAddress',
            JobTitle: 'JobTitle',
            Location: 'Location',
            Measure: 'Measure',
            Money: 'Money',
            Number: 'Number',
            Ordinal: 'Ordinal',
            Organization: 'Organization',
            Percent: 'Percent',
            Person: 'Person',
            PhoneNumber: 'PhoneNumber',
            Time: 'Time',
            TwitterHandle: 'TwitterHandle',
            URL: 'URL',
          };
        }
      })(),
    });
    vars = Object.assign(vars, { FALLBACK_CATEGORY: 'Unknown' });
    __outcome.data = (() => {
      with (vars) {
        return IBM_TO_PROFILE_MAPPING[args.ibmType] || FALLBACK_CATEGORY;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
