// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'TrackEvent':
      mapFn = TrackEvent;
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

function TrackEvent(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = 'OK';
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}