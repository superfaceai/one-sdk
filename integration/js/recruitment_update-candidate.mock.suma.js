// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'UpdateCandidate':
      mapFn = UpdateCandidate;
      break;
    case 'UpdateCandidateFeatures':
      mapFn = UpdateCandidateFeatures;
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

function UpdateCandidate(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign({});
    /* return */ break FN_BODY;
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function UpdateCandidateFeatures(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        cvMIMETypes: (() => {
          with (vars) {
            return [
              'application/pdf',
              'text/rtf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.custom-properties+xml',
            ];
          }
        })(),
      },
      {
        cvUploadMethods: (() => {
          with (vars) {
            return ['url', 'file'];
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
