// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetProfilesForPublishing':
      mapFn = GetProfilesForPublishing;
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

function GetProfilesForPublishing(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        profiles: (() => {
          with (vars) {
            return [
              {
                id: '111111111',
                name: 'Foo',
                username: 'foo',
                imageUrl: 'https://picsum.photos/200',
              },
              {
                id: '111111112',
                name: 'BarFoo',
                username: 'bar-foo',
                imageUrl: 'https://picsum.photos/202',
              },
              {
                id: '111111113',
                name: 'Baz',
                username: 'BazZZ',
                imageUrl: 'https://picsum.photos/205',
              },
            ];
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
