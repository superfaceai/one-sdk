// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'Create':
      mapFn = Create;
      break;
    case 'Update':
      mapFn = Update;
      break;
    case 'Search':
      mapFn = Search;
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

function Create(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign({}, { id: 'john@example.com' });
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function Update(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign({}, { id: 'john@example.com' });
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function Search(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = (() => {
      with (vars) {
        return [
          {
            id: 'john@example.com',
            email: 'john@example.com',
            phone: '+420 123 456 789',
            firstName: 'John',
            lastName: 'Doe',
            company: 'Example',
            country: 'Czech republic',
            customProperties: {
              waitlist: true,
            },
          },
          {
            id: 'alice@example.com',
            email: 'alice@example.com',
            phone: '+1 (415) 111-2222',
            firstName: 'Alice',
            lastName: 'Cooper',
            company: 'Example',
            country: 'United States',
            customProperties: {},
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
