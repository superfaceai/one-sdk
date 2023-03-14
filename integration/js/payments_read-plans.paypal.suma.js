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
      const url = std.unstable.resolveRequestUrl(
        `/v1/billing/plans/${input.planId}`,
        { parameters, security, serviceId: 'default' }
      );
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
                  return body.product_id;
                }
              })(),
            },
            {
              name: (() => {
                with (vars) {
                  return body.name;
                }
              })(),
            },
            {
              state: (() => {
                with (vars) {
                  return body.status.toLowerCase();
                }
              })(),
            },
            {
              interval: (() => {
                with (vars) {
                  return body.billing_cycles.length > 0
                    ? body.billing_cycles[0].frequency.interval_unit.toLowerCase()
                    : undefined;
                }
              })(),
            },
            {
              price: (() => {
                with (vars) {
                  return (
                    body.billing_cycles.length > 0 &&
                    body.billing_cycles[0].pricing_scheme &&
                    body.billing_cycles[0].pricing_scheme.fixed_price &&
                    parseFloat(
                      body.billing_cycles[0].pricing_scheme.fixed_price.value,
                      10
                    )
                  );
                }
              })(),
            },
            {
              currency: (() => {
                with (vars) {
                  return body.billing_cycles.length > 0 &&
                    body.billing_cycles[0].pricing_scheme &&
                    body.billing_cycles[0].pricing_scheme.fixed_price
                    ? body.billing_cycles[0].pricing_scheme.fixed_price
                        .currency_code
                    : undefined;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 404 "application/json" "*" */
        if (
          response.status === 404 &&
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
                  return NotFound;
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
function ListPlans(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/v1/billing/plans`, {
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
      requestOptions.query = Object.assign({}, { page_size: 20 });
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
                    return body.plans;
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
            return item.status && item.status.toLowerCase();
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
