// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'ListStageChanges':
      mapFn = ListStageChanges;
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

function ListStageChanges(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        changes: (() => {
          with (vars) {
            return [
              {
                id: '1',
                stageId: 'sourced',
                name: 'Sourced',
                description: 'Sourced from LinkedIn',
                current: false,
                createdAt: '2022-12-06T15:20:11Z',
              },
              {
                id: '2',
                stageId: 'applied',
                name: 'Applied',
                description: 'Applied for job opening of Software Engineer',
                current: true,
                createdAt: '2022-12-08T10:20:42Z',
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
