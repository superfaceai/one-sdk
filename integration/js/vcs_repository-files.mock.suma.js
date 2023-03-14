// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'ListDirectory':
      mapFn = ListDirectory;
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

function ListDirectory(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        entries: (() => {
          with (vars) {
            return [
              {
                name: 'README.md',
                path: 'README.md',
                rawUrl: 'https://example.com/repo/test-branch/README.md',
                size: 780,
                type: 'file',
              },
              {
                name: 'index.html',
                path: 'index.html',
                rawUrl: 'https://example.com/repo/test-branch/index.html',
                size: 355,
                type: 'file',
              },
              {
                name: 'styles.css',
                path: 'styles.css',
                rawUrl: 'https://example.com/repo/test-branch/styles.css',
                size: 256,
                type: 'file',
              },
              {
                name: 'test',
                path: 'test',
                rawUrl: 'https://example.com/repo/test-branch/test.md',
                type: 'directory',
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
