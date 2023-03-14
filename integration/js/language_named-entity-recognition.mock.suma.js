// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'NamedEntityRecognition':
      mapFn = NamedEntityRecognition;
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

function NamedEntityRecognition(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        entities: (() => {
          with (vars) {
            return [
              {
                text: 'Houston Natural Gas',
                category: 'Organization',
                importance: 0.954265,
              },
              {
                text: 'InterNorth',
                category: 'Organization',
                importance: 0.777889,
              },
              {
                text: 'Kenneth Lay',
                category: 'Person',
                importance: 0.640119,
              },
              {
                text: 'Omaha, Nebraska',
                category: 'Location',
                importance: 0.611778,
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