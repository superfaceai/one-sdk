// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'Create':
      mapFn = Create;
      break;
    case 'Update':
      mapFn = Update;
      break;
    case 'Search':
      mapFn = Search;
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

function Create(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/crm/v3/objects/contacts`, {
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
            properties: {
              ...input.customProperties,
              firstname: input.firstName,
              lastname: input.lastName,
              email: input.email,
              phone: input.phone,
              company: input.company,
              country: input.country,
            },
          };
        }
      })();
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
              id: (() => {
                with (vars) {
                  return body.id;
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
            {
              title: (() => {
                with (vars) {
                  return body.category;
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 409 "application/json" "*" */
        if (
          response.status === 409 &&
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
                  return body.category;
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
            {
              title: (() => {
                with (vars) {
                  return body.category;
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
function Update(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    if (
      (() => {
        with (vars) {
          return input.id === null || input.id === undefined;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Missing field' },
        { detail: 'ID is missing in input values' }
      );
      /* return */ break FN_BODY;
    }
    vars = Object.assign(vars, {
      strId: (() => {
        with (vars) {
          return `${input.id}`;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/crm/v3/objects/contacts/${vars.strId}`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'PATCH',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.body = (() => {
        with (vars) {
          return {
            properties: {
              ...input.customProperties,
              firstname: input.firstName,
              lastname: input.lastName,
              email: input.email,
              phone: input.phone,
              company: input.company,
              country: input.country,
            },
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
          __outcome.data = Object.assign(
            {},
            {
              id: (() => {
                with (vars) {
                  return body.id;
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
            {
              title: (() => {
                with (vars) {
                  return body.category;
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 409 "application/json" "*" */
        if (
          response.status === 409 &&
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
                  return body.category;
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
            {
              title: (() => {
                with (vars) {
                  return body.category;
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
function Search(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      FIELD_MAP: (() => {
        with (vars) {
          return {
            firstName: 'firstname',
            lastName: 'lastname',
          };
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/crm/v3/objects/contacts/search`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.body = (() => {
        with (vars) {
          return {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: FIELD_MAP[input.property] || input.property,
                    operator: input.operator,
                    value: input.value,
                  },
                ],
              },
            ],
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
          __outcome.data = (() => {
            with (vars) {
              return body.results.map(c => ({
                id: c.id,
                email: c.properties.email,
                phone: c.properties.phone,
                firstName: c.properties.firstname,
                lastName: c.properties.lastname,
                company: c.properties.company,
                country: c.properties.country,
                ...(c.properties.customProperties || {}),
              }));
            }
          })();
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
                  return body.category;
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 409 "application/json" "*" */
        if (
          response.status === 409 &&
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
                  return body.category;
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
            {
              title: (() => {
                with (vars) {
                  return body.category;
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
