// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'Update':
      mapFn = Update;
      break;
    case 'Create':
      mapFn = Create;
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
      customProperties: (() => {
        with (vars) {
          return input.customProperties || {};
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/engage`, {
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
      requestOptions.headers['content-type'] = [
        'application/x-www-form-urlencoded',
      ];
      requestOptions.body = Object.assign(
        {},
        {
          data: (() => {
            with (vars) {
              return {
                $token: parameters.PROJECT_TOKEN,
                $distinct_id: input.id,
                $ip: customProperties.$ip,

                $set: {
                  $email: input.email,
                  $phone: input.phone,
                  $first_name: input.firstName,
                  $last_name: input.lastName,
                  $country_code: input.country,

                  Company: input.company,
                  ...customProperties,
                },
              };
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
          if (
            (() => {
              with (vars) {
                return body === 1;
              }
            })()
          ) {
            __outcome.data = Object.assign(
              {},
              {
                id: (() => {
                  with (vars) {
                    return input.id;
                  }
                })(),
              }
            );
            /* return */ break FN_BODY;
          }
          __outcome.error = Object.assign({}, { title: 'Invalid Data' });
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 401 "*" "*" */
        if (response.status === 401) {
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
        /* response 403 "*" "*" */
        if (response.status === 403) {
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
function Create(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.error = Object.assign(
      {},
      { title: 'Not supported' },
      { detail: 'Use Update usecase instead' }
    );
    /* return */ break FN_BODY;
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
    __outcome.error = Object.assign(
      {},
      { title: 'Not supported' },
      { detail: 'This usecase is not supported' }
    );
    /* return */ break FN_BODY;
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
