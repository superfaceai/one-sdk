// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'ListProducts':
      mapFn = ListProducts;
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

function ListProducts(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/v1/products`, {
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
      requestOptions.query = Object.assign({}, { limit: 100 });
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
            products: (() => {
              const acc = [];
              {
                for (const item of (() => {
                  with (vars) {
                    return body.data;
                  }
                })()) {
                  const outcome = MapProduct(
                    Object.assign(
                      {},
                      {
                        item: (() => {
                          with (vars) {
                            return item;
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
          __outcome.data = (() => {
            with (vars) {
              return products;
            }
          })();
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
function MapProduct(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      item: (() => {
        with (vars) {
          return args.item;
        }
      })(),
    });
    __outcome.data = Object.assign(
      {},
      {
        productId: (() => {
          with (vars) {
            return item.id;
          }
        })(),
      },
      {
        name: (() => {
          with (vars) {
            return item.name;
          }
        })(),
      },
      {
        description: (() => {
          with (vars) {
            return item.description;
          }
        })(),
      },
      {
        status: (() => {
          with (vars) {
            return item.status;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
