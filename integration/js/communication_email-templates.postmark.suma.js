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
    {
      const url = std.unstable.resolveRequestUrl(`/templates`, {
        parameters,
        security,
        serviceId: undefined,
      });
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.query = Object.assign({}, { Count: 500 }, { Offset: 0 });
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 200 "application/json" "*" */
        if (
          response.status === 200 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.data = (() => {
            with (vars) {
              return body.Templates.map(template => ({
                id: `${template.TemplateId}`,
                name: template.Name,
              }));
            }
          })();
          /* end handler */ break HTTP_RESPONSE;
        }
        throw new Error('Unexpected response');
      }
    }
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
    vars = Object.assign(vars, {
      inputId: (() => {
        with (vars) {
          return `${input.id}`;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/templates/${vars.inputId}`, {
        parameters,
        security,
        serviceId: undefined,
      });
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers['content-type'] = ['application/json'];
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 200 "application/json" "*" */
        if (
          response.status === 200 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.data = Object.assign(
            {},
            {
              subject: (() => {
                with (vars) {
                  return body.Subject;
                }
              })(),
            },
            {
              text: (() => {
                with (vars) {
                  return body.TextBody;
                }
              })(),
            },
            {
              html: (() => {
                with (vars) {
                  return body.HtmlBody;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        throw new Error('Unexpected response');
      }
    }
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
    {
      const url = std.unstable.resolveRequestUrl(`/templates`, {
        parameters,
        security,
        serviceId: undefined,
      });
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.body = Object.assign(
        {},
        {
          Name: (() => {
            with (vars) {
              return input.name;
            }
          })(),
        },
        {
          Subject: (() => {
            with (vars) {
              return input.subject;
            }
          })(),
        },
        {
          TextBody: (() => {
            with (vars) {
              return input.text;
            }
          })(),
        },
        {
          HtmlBody: (() => {
            with (vars) {
              return input.html;
            }
          })(),
        }
      );
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 200 "application/json" "*" */
        if (
          response.status === 200 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.data = Object.assign(
            {},
            {
              id: (() => {
                with (vars) {
                  return `${body.TemplateId}`;
                }
              })(),
            },
            {
              name: (() => {
                with (vars) {
                  return body.Name;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        throw new Error('Unexpected response');
      }
    }
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
    vars = Object.assign(vars, {
      inputId: (() => {
        with (vars) {
          return `${input.id}`;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/templates/${vars.inputId}`, {
        parameters,
        security,
        serviceId: undefined,
      });
      const requestOptions = {
        method: 'PUT',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.body = Object.assign(
        {},
        {
          Name: (() => {
            with (vars) {
              return input.name;
            }
          })(),
        },
        {
          Subject: (() => {
            with (vars) {
              return input.subject;
            }
          })(),
        },
        {
          TextBody: (() => {
            with (vars) {
              return input.text;
            }
          })(),
        },
        {
          HtmlBody: (() => {
            with (vars) {
              return input.html;
            }
          })(),
        }
      );
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 200 "application/json" "*" */
        if (
          response.status === 200 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.data = Object.assign(
            {},
            {
              id: (() => {
                with (vars) {
                  return `${body.TemplateId}`;
                }
              })(),
            },
            {
              name: (() => {
                with (vars) {
                  return body.Name;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        throw new Error('Unexpected response');
      }
    }
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
