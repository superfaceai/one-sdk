// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetProfilesForPublishing':
      mapFn = GetProfilesForPublishing;
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

function GetProfilesForPublishing(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/v2/organizationAcls`, {
        parameters,
        security,
        serviceId: 'default',
      });
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign(
        {},
        { 'X-Restli-Protocol-Version': '2.0.0' },
        {
          Authorization: (() => {
            with (vars) {
              return `Bearer ${parameters.accessToken}`;
            }
          })(),
        },
        { Accept: 'application/json' }
      );
      requestOptions.query = Object.assign(
        {},
        { q: 'roleAssignee' },
        { state: 'APPROVED' },
        { role: 'ADMINISTRATOR' },
        {
          projection:
            '(paging,elements(*(organization~(id,localizedName,vanityName,logoV2(cropped~:playableStreams)))))',
        },
        { count: 100 }
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
            profiles: (() => {
              const acc = [];
              {
                for (const element of (() => {
                  with (vars) {
                    return body.elements;
                  }
                })()) {
                  const outcome = MapOrganization(
                    Object.assign(
                      {},
                      {
                        element: (() => {
                          with (vars) {
                            return element;
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
              profiles: (() => {
                with (vars) {
                  return profiles;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
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
                  return body.message;
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
            { title: 'Unauthenticated' },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
                  return body.message;
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
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function MapOrganization(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      org: (() => {
        with (vars) {
          return args.element['organization~'];
        }
      })(),
    });
    vars = Object.assign(vars, {
      orgLogo: (() => {
        with (vars) {
          return null;
        }
      })(),
    });
    vars = Object.assign(vars, {
      logoElements: (() => {
        with (vars) {
          return null;
        }
      })(),
    });
    vars = Object.assign(vars, {
      logoElements: (() => {
        with (vars) {
          return org.logoV2['cropped~'].elements;
        }
      })(),
    });
    vars = Object.assign(vars, {
      orgLogo: (() => {
        with (vars) {
          return logoElements[0].identifiers[0].identifier;
        }
      })(),
    });
    __outcome.data = Object.assign(
      {},
      {
        id: (() => {
          with (vars) {
            return args.element.organization;
          }
        })(),
      },
      {
        name: (() => {
          with (vars) {
            return org.localizedName;
          }
        })(),
      },
      {
        username: (() => {
          with (vars) {
            return org.vanityName;
          }
        })(),
      },
      {
        imageUrl: (() => {
          with (vars) {
            return orgLogo;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
