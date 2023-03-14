// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'ListProducts':
      mapFn = ListProducts;
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

function ListProducts(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = (() => {
      with (vars) {
        return [
          {
            productId: 'PROD-123908',
            name: 'Superface milk',
            description:
              'Milk that gives you super-powers, delivered to your door.',
            type: 'physical',
          },
          {
            productId: 'PROD-123909',
            name: 'Superface milk price monitor',
            description: 'Gives you the most up-to-date info on milk prices.',
            type: 'service',
          },
          {
            productId: 'PROD-123910',
            name: 'Superface theme song',
            description:
              'Our theme song in MP3 and FLAC format. (Features laser sharks)',
            type: 'digital',
          },
        ];
      }
    })();
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
