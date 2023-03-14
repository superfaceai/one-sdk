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
    __outcome.data = Object.assign(
      {},
      { productId: 'PROD-1192810198' },
      { name: 'Monthly subscription to Superface milk delivery' },
      { interval: 'month' },
      { price: 25 },
      { currency: 'USD' },
      { state: 'active' }
    );
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
    __outcome.data = Object.assign(
      {},
      {
        plans: (() => {
          with (vars) {
            return [
              {
                planId: 'PLAN-89101829211',
                name: 'Monthly subscription to Superface milk delivery',
                interval: 'month',
                price: 25,
                currency: 'USD',
              },
              {
                planId: 'PLAN-89101829212',
                name: 'Daily subscription to Superface pizza delivery',
                interval: 'day',
                price: 5,
                currency: 'USD',
              },
            ];
          }
        })(),
      }
    );
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
