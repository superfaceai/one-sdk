// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'PullRequests':
      mapFn = PullRequests;
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

function PullRequests(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      identifier: (() => {
        with (vars) {
          return Math.floor(Math.random() * 10) + 1;
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return {
          pullRequests: [
            {
              title: 'Test',
              id: identifier,
              url: `https://gitlab.com/${input.owner}/${input.repo}/-/merge_requests/${identifier}`,
              sha: Math.random().toString(16),
            },
          ],
        };
      }
    })();
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
