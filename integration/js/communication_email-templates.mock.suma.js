// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'ListTemplates':
      mapFn = ListTemplates;
      break;
    case 'GetTemplateContent':
      mapFn = GetTemplateContent;
      break;
    case 'CreateTemplate':
      mapFn = CreateTemplate;
      break;
    case 'UpdateTemplate':
      mapFn = UpdateTemplate;
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

function ListTemplates(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = (() => {
      with (vars) {
        return [
          { id: '123456789', name: 'Station test template' },
          { id: 'qwertyuiop', name: 'Station test template #2' },
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
function GetTemplateContent(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = (() => {
      with (vars) {
        return {
          subject: 'Integration Test Email #1',
          text: 'This template is used by integration tests only',
          html: '<!doctype html><html> <head>  <meta name="viewport" content="width=device-width">  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">  <title>Integration Test Email #1</title></head><body class="">This template is used by integration tests only</body></html>',
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
function CreateTemplate(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = (() => {
      with (vars) {
        return {
          id: '123456789',
          name: 'Station test template',
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
function UpdateTemplate(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = (() => {
      with (vars) {
        return {
          id: '123456789',
          name: 'Station test template 2',
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
