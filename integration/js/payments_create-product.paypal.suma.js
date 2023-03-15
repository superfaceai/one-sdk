// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'CreateProduct':
      mapFn = CreateProduct;
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

function CreateProduct(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    if (
      (() => {
        with (vars) {
          return !input.type;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Missing type' },
        {
          detail:
            'PayPal requires `type` to be specified (one of `physical`, `digital`, `service`).',
        },
        {
          code: (() => {
            with (vars) {
              return InvalidInput;
            }
          })(),
        }
      );
    }
    {
      const url = std.unstable.resolveRequestUrl(`/v1/catalogs/products`, {
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
          name: (() => {
            with (vars) {
              return input.name;
            }
          })(),
        },
        {
          description: (() => {
            with (vars) {
              return input.description;
            }
          })(),
        },
        {
          type: (() => {
            with (vars) {
              return input.type.toUpperCase();
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
              productId: (() => {
                with (vars) {
                  return body.id;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response * "application/json" "*" */
        if (
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
                  return body.message;
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.details;
                }
              })(),
            },
            {
              code: (() => {
                with (vars) {
                  return UnknownError;
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
