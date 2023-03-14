// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetPlan':
      mapFn = GetPlan;
      break;
    case 'ListPlans':
      mapFn = ListPlans;
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

function GetPlan(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/v1/plans/${input.planId}`, {
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
              productId: (() => {
                with (vars) {
                  return body.product;
                }
              })(),
            },
            {
              name: (() => {
                with (vars) {
                  return body.nickname;
                }
              })(),
            },
            {
              state: (() => {
                with (vars) {
                  return body.active ? 'active' : 'inactive';
                }
              })(),
            },
            {
              interval: (() => {
                with (vars) {
                  return body.interval;
                }
              })(),
            },
            {
              price: (() => {
                with (vars) {
                  return body.amount / 100;
                }
              })(),
            },
            {
              currency: (() => {
                with (vars) {
                  return body.currency;
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
function ListPlans(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/v1/plans`, {
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
            plans: (() => {
              const acc = [];
              {
                for (const item of (() => {
                  with (vars) {
                    return body.data;
                  }
                })()) {
                  const outcome = MapPlan(
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
          __outcome.data = Object.assign(
            {},
            {
              plans: (() => {
                with (vars) {
                  return plans;
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
function MapPlan(args, parameters, security) {
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
        planId: (() => {
          with (vars) {
            return item.id;
          }
        })(),
      },
      {
        name: (() => {
          with (vars) {
            return item.nickname;
          }
        })(),
      },
      {
        status: (() => {
          with (vars) {
            return item.active ? 'active' : 'inactive';
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}