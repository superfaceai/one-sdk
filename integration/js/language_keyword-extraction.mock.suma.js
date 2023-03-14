// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'ExtractKeywords':
      mapFn = ExtractKeywords;
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

function ExtractKeywords(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        keywords: (() => {
          with (vars) {
            return [
              {
                text: 'Artificial Intelligence',
                importance: 0.999628,
              },
              {
                text: 'everyday developer life',
                importance: 0.664127,
              },
              {
                text: 'way',
                importance: 0.632349,
              },
              {
                text: 'use of AI',
                importance: 0.29227,
              },
              {
                text: 'API lifecycle',
                importance: 0.160556,
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
