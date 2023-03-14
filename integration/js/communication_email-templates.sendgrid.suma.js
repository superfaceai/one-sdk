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
      const url = std.unstable.resolveRequestUrl(`/v3/templates`, {
        parameters,
        security,
        serviceId: 'default',
      });
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.query = Object.assign(
        {},
        { generations: 'legacy,dynamic' },
        { page_size: 200 }
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
          __outcome.data = (() => {
            with (vars) {
              return body.result.map(template => ({
                id: template.id,
                name: template.name,
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
      const url = std.unstable.resolveRequestUrl(
        `/v3/templates/${vars.inputId}`,
        { parameters, security, serviceId: 'default' }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
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
          vars = Object.assign(vars, {
            activeTemplate: (() => {
              with (vars) {
                return body.versions.filter(version => version.active === 1)[0];
              }
            })(),
          });
          if (
            (() => {
              with (vars) {
                return activeTemplate;
              }
            })()
          ) {
            __outcome.data = Object.assign(
              {},
              {
                subject: (() => {
                  with (vars) {
                    return activeTemplate.subject;
                  }
                })(),
              },
              {
                text: (() => {
                  with (vars) {
                    return activeTemplate.plain_content;
                  }
                })(),
              },
              {
                html: (() => {
                  with (vars) {
                    return activeTemplate.html_content;
                  }
                })(),
              }
            );
          }
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
    vars = Object.assign(vars, {
      template: (() => {
        const acc = [];
        {
          const outcome = CreateTemplateCall(
            Object.assign(
              {},
              {
                name: (() => {
                  with (vars) {
                    return input.name;
                  }
                })(),
              }
            ),
            parameters,
            security
          );
          if (outcome.error !== undefined) {
            throw new Error(`Unexpected inline call failure: ${outcome.error}`);
          } else {
            acc.push(outcome.data);
          }
        }
        return acc[0];
      })(),
    });
    vars = Object.assign(vars, {
      templateVersion: (() => {
        const acc = [];
        {
          const outcome = CreateTemplateVersionCall(
            Object.assign(
              {},
              {
                templateId: (() => {
                  with (vars) {
                    return template.id;
                  }
                })(),
              },
              {
                subject: (() => {
                  with (vars) {
                    return input.subject;
                  }
                })(),
              },
              {
                text: (() => {
                  with (vars) {
                    return input.text;
                  }
                })(),
              },
              {
                html: (() => {
                  with (vars) {
                    return input.html;
                  }
                })(),
              }
            ),
            parameters,
            security
          );
          if (outcome.error !== undefined) {
            throw new Error(`Unexpected inline call failure: ${outcome.error}`);
          } else {
            acc.push(outcome.data);
          }
        }
        return acc[0];
      })(),
    });
    __outcome.data = Object.assign(
      {},
      {
        id: (() => {
          with (vars) {
            return template.id;
          }
        })(),
      },
      {
        name: (() => {
          with (vars) {
            return template.name;
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
function UpdateTemplate(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      template: (() => {
        const acc = [];
        {
          const outcome = FetchTemplateCall(
            Object.assign(
              {},
              {
                templateId: (() => {
                  with (vars) {
                    return input.id;
                  }
                })(),
              }
            ),
            parameters,
            security
          );
          if (outcome.error !== undefined) {
            throw new Error(`Unexpected inline call failure: ${outcome.error}`);
          } else {
            acc.push(outcome.data);
          }
        }
        return acc[0];
      })(),
    });
    vars = Object.assign(vars, {
      template: (() => {
        const acc = [];
        {
          if (
            (() => {
              with (vars) {
                return input.name;
              }
            })()
          ) {
            const outcome = UpdateTemplateCall(
              Object.assign(
                {},
                {
                  templateId: (() => {
                    with (vars) {
                      return template.id;
                    }
                  })(),
                },
                {
                  name: (() => {
                    with (vars) {
                      return input.name;
                    }
                  })(),
                }
              ),
              parameters,
              security
            );
            if (outcome.error !== undefined) {
              throw new Error(
                `Unexpected inline call failure: ${outcome.error}`
              );
            } else {
              acc.push(outcome.data);
            }
          }
        }
        return acc[0];
      })(),
    });
    vars = Object.assign(vars, {
      subject: (() => {
        with (vars) {
          return input.subject || template.subject;
        }
      })(),
    });
    vars = Object.assign(vars, {
      text: (() => {
        with (vars) {
          return input.text || template.text;
        }
      })(),
    });
    vars = Object.assign(vars, {
      html: (() => {
        with (vars) {
          return input.html || template.html;
        }
      })(),
    });
    vars = Object.assign(vars, {
      templateVersion: (() => {
        const acc = [];
        {
          if (
            (() => {
              with (vars) {
                return subject || text || html;
              }
            })()
          ) {
            const outcome = CreateTemplateVersionCall(
              Object.assign(
                {},
                {
                  templateId: (() => {
                    with (vars) {
                      return template.id;
                    }
                  })(),
                },
                {
                  subject: (() => {
                    with (vars) {
                      return subject;
                    }
                  })(),
                },
                {
                  text: (() => {
                    with (vars) {
                      return text;
                    }
                  })(),
                },
                {
                  html: (() => {
                    with (vars) {
                      return html;
                    }
                  })(),
                }
              ),
              parameters,
              security
            );
            if (outcome.error !== undefined) {
              throw new Error(
                `Unexpected inline call failure: ${outcome.error}`
              );
            } else {
              acc.push(outcome.data);
            }
          }
        }
        return acc[0];
      })(),
    });
    __outcome.data = Object.assign(
      {},
      {
        id: (() => {
          with (vars) {
            return template.id;
          }
        })(),
      },
      {
        name: (() => {
          with (vars) {
            return template.name;
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
function FetchTemplateCall(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/v3/templates/${args.templateId}`,
        { parameters, security, serviceId: 'default' }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
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
              return body;
            }
          })();
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        throw new Error('Unexpected response');
      }
    }
  }
  return __outcome;
}
function CreateTemplateCall(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/v3/templates`, {
        parameters,
        security,
        serviceId: 'default',
      });
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.body = Object.assign(
        {},
        {
          name: (() => {
            with (vars) {
              return args.name;
            }
          })(),
        },
        { generation: 'dynamic' }
      );
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 201 "application/json" "*" */
        if (
          response.status === 201 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.data = (() => {
            with (vars) {
              return body;
            }
          })();
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        throw new Error('Unexpected response');
      }
    }
  }
  return __outcome;
}
function CreateTemplateVersionCall(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/v3/templates/${args.templateId}/versions`,
        { parameters, security, serviceId: 'default' }
      );
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.body = Object.assign(
        {},
        {
          name: (() => {
            with (vars) {
              return `v${Date.now()}`;
            }
          })(),
        },
        {
          subject: (() => {
            with (vars) {
              return args.subject;
            }
          })(),
        },
        {
          plain_content: (() => {
            with (vars) {
              return args.text;
            }
          })(),
        },
        {
          html_content: (() => {
            with (vars) {
              return args.html;
            }
          })(),
        },
        { active: 1 }
      );
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 201 "application/json" "*" */
        if (
          response.status === 201 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.data = (() => {
            with (vars) {
              return body;
            }
          })();
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        throw new Error('Unexpected response');
      }
    }
  }
  return __outcome;
}
function UpdateTemplateCall(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/v3/templates/${args.templateId}`,
        { parameters, security, serviceId: 'default' }
      );
      const requestOptions = {
        method: 'PATCH',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.body = Object.assign(
        {},
        {
          name: (() => {
            with (vars) {
              return args.name;
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
          __outcome.data = (() => {
            with (vars) {
              return body;
            }
          })();
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        throw new Error('Unexpected response');
      }
    }
  }
  return __outcome;
}
