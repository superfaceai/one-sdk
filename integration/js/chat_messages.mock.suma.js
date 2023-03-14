// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetMessages':
      mapFn = GetMessages;
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

function GetMessages(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        messages: (() => {
          with (vars) {
            return [
              {
                id: '1',
                author: {
                  id: 'U01',
                },
                text: 'test',
                reactions: [
                  {
                    count: 2,
                    emoji: 'tada',
                    users: ['U01', 'U02'],
                  },
                ],
                createdAt: 1643798532134.069,
              },
              {
                id: '2',
                author: {
                  id: 'U02',
                },
                text: 'test',
                reactions: [
                  {
                    count: 2,
                    emoji: 'tada',
                    users: ['U01', 'U02'],
                  },
                ],
                createdAt: 1643216443234.079,
              },
              {
                id: '3',
                author: {
                  id: 'U01',
                },
                text: 'test',
                createdAt: 1546167104000.2,
              },
            ];
          }
        })(),
      },
      { nextPage: 'XXXXXXXXXXXXXXXXX03' }
    );
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
