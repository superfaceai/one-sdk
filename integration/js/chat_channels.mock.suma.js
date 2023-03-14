// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetChannels':
      mapFn = GetChannels;
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

function GetChannels(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      { nextPage: 'XXXXXXXXXXXXXXXXX03' },
      {
        channels: (() => {
          with (vars) {
            return [
              {
                id: '1',
                createdAt: 1643798532134.069,
                name: 'test',
                membersCount: 100,
              },
              {
                id: '2',
                createdAt: 1643216443234.079,
                name: 'test 2',
                membersCount: 4,
              },
              {
                id: '3',
                createdAt: 1546167104000.2,
                name: 'test 3',
                description: 'test description',
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
