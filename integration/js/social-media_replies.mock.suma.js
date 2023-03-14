// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetPostReplies':
      mapFn = GetPostReplies;
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

function GetPostReplies(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        replies: (() => {
          with (vars) {
            return [
              {
                id: '123',
                createdAt: '2022-06-09T13:29:11+02:00',
                authorId: '@alberteinstein',
                authorName: 'Albert Einstein',
                text: 'Hello, World!',
              },
              {
                id: '124',
                createdAt: '2022-06-09T16:29:11+02:00',
                authorId: '@newton',
                authorName: 'Isaac Newton',
                lastModifiedAt: '2022-06-09T16:32:42+02:00',
                text: '(deleted.)',
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
