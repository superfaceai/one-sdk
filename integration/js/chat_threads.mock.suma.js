// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetThreads':
      mapFn = GetThreads;
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

function GetThreads(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        threads: (() => {
          with (vars) {
            return [
              {
                id: '1',
                createdAt: 1643798532134.069,
                channel: 'channel_id_1',
                archiveAt: 1643799532135.07,
              },
              {
                id: '2',
                createdAt: 1643216443234.079,
                channel: 'channel_id_2',
              },
              {
                id: '3',
                createdAt: 1546167104000.2,
                channel: 'channel_id_3',
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
