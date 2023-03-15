// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'CreateSubscription':
      mapFn = CreateSubscription;
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

function CreateSubscription(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/v1/billing/subscriptions`, {
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
            plan_id: input.planId,
            subscriber: {
              email_address: input.customer,
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
          vars = Object.assign(vars, {
            statusMap: (() => {
              with (vars) {
                return {
                  APPROVAL_PENDING: 'pending',
                };
              }
            })(),
          });
          vars = Object.assign(vars, {
            status: (() => {
              with (vars) {
                return (() =>
                  statusMap[body.status] || body.status)().toLowerCase();
              }
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              subscriptionId: (() => {
                with (vars) {
                  return body.id;
                }
              })(),
            },
            {
              status: (() => {
                with (vars) {
                  return status;
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
