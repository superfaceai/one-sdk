// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'NearbyPoi':
      mapFn = NearbyPoi;
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

function NearbyPoi(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, { category: 'CAFE' });
    vars = Object.assign(vars, {
      pois: (() => {
        with (vars) {
          return [
            {
              coordinates: {
                latitude: 51.476838,
                longitude: -0.0006877,
              },
              name: 'Astronomy Café',
              categories: [category],
            },
          ];
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return pois;
      }
    })();
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
