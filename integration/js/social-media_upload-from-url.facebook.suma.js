// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'RegisterUpload':
      mapFn = RegisterUpload;
      break;
    case 'GetUploadState':
      mapFn = GetUploadState;
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

function RegisterUpload(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      apiVersion: (() => {
        const acc = [];
        {
          const outcome = GetApiVersion(
            Object.assign({}),
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
    {
      const outcome = GetPageAccessToken(
        Object.assign(
          {},
          {
            pageId: (() => {
              with (vars) {
                return input.profileId;
              }
            })(),
          },
          {
            userAccessToken: (() => {
              with (vars) {
                return parameters.accessToken;
              }
            })(),
          }
        ),
        parameters,
        security
      );
      if (
        (() => {
          with (vars) {
            return outcome.error;
          }
        })()
      ) {
        __outcome.error = (() => {
          with (vars) {
            return outcome.error;
          }
        })();
        /* return */ break FN_BODY;
      }
      vars = Object.assign(vars, {
        token: (() => {
          with (vars) {
            return outcome.data.pageAccessToken;
          }
        })(),
      });
    }
    {
      const url = std.unstable.resolveRequestUrl(
        `/${vars.apiVersion}/${input.profileId}/videos`,
        { parameters, security, serviceId: 'video' }
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
          access_token: (() => {
            with (vars) {
              return token;
            }
          })(),
        },
        {
          file_url: (() => {
            with (vars) {
              return input.url;
            }
          })(),
        },
        { published: false },
        {
          description: (() => {
            with (vars) {
              return input.caption;
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
              uploadId: (() => {
                with (vars) {
                  return body.id;
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
function GetUploadState(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      apiVersion: (() => {
        const acc = [];
        {
          const outcome = GetApiVersion(
            Object.assign({}),
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
    {
      const url = std.unstable.resolveRequestUrl(
        `/${vars.apiVersion}/${input.uploadId}`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.query = Object.assign(
        {},
        { fields: 'status' },
        {
          access_token: (() => {
            with (vars) {
              return parameters.accessToken;
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
          vars = Object.assign(vars, {
            states: (() => {
              with (vars) {
                return {
                  ready: 'finished',
                  error: 'error',
                  processing: 'inProgress',
                };
              }
            })(),
          });
          vars = Object.assign(vars, {
            state: (() => {
              with (vars) {
                return (() => states[body.status.video_status])();
              }
            })(),
          });
          if (
            (() => {
              with (vars) {
                return !state;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Unknown asset state!' },
              {
                detail: (() => {
                  with (vars) {
                    return (
                      "Unknown asset state '" +
                      body.status_code +
                      "'. This is probably a bug in the map."
                    );
                  }
                })(),
              },
              { code: 'UnknownError' }
            );
          }
          __outcome.data = Object.assign(
            {},
            {
              state: (() => {
                with (vars) {
                  return state;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 400 "application/json" "*" */
        if (
          response.status === 400 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          if (
            (() => {
              with (vars) {
                return (
                  body.error.code === 100 && body.error.error_subcode === 33
                );
              }
            })()
          ) {
            __outcome.data = Object.assign({}, { state: 'unknown' });
            /* return */ break FN_BODY;
          }
          vars = Object.assign(vars, {
            error: (() => {
              const acc = [];
              {
                const outcome = MapApiError(
                  Object.assign(
                    {},
                    {
                      statusCode: (() => {
                        with (vars) {
                          return statusCode;
                        }
                      })(),
                    },
                    {
                      body: (() => {
                        with (vars) {
                          return body;
                        }
                      })(),
                    },
                    {
                      headers: (() => {
                        with (vars) {
                          return headers;
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
              return acc[0];
            })(),
          });
          __outcome.error = (() => {
            with (vars) {
              return error;
            }
          })();
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response * "*" "*" */
        const statusCode = response.status;
        const headers = response.headers;
        const body = response.bodyAuto();
        vars = Object.assign(vars, {
          error: (() => {
            const acc = [];
            {
              const outcome = MapApiError(
                Object.assign(
                  {},
                  {
                    statusCode: (() => {
                      with (vars) {
                        return statusCode;
                      }
                    })(),
                  },
                  {
                    body: (() => {
                      with (vars) {
                        return body;
                      }
                    })(),
                  },
                  {
                    headers: (() => {
                      with (vars) {
                        return headers;
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
            return acc[0];
          })(),
        });
        __outcome.error = (() => {
          with (vars) {
            return error;
          }
        })();
        /* return */ break FN_BODY;
        /* end handler */ break HTTP_RESPONSE;
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
function GetPageAccessToken(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    if (
      (() => {
        with (vars) {
          return !args.pageId;
        }
      })()
    ) {
      __outcome.data = Object.assign({});
      /* return */ break FN_BODY;
    }
    vars = Object.assign(vars, {
      apiVersion: (() => {
        const acc = [];
        {
          const outcome = GetApiVersion(
            Object.assign({}),
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
    {
      const url = std.unstable.resolveRequestUrl(
        `/${vars.apiVersion}/${args.pageId}`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.query = Object.assign(
        {},
        { fields: 'access_token' },
        {
          access_token: (() => {
            with (vars) {
              return args.userAccessToken;
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
              pageAccessToken: (() => {
                with (vars) {
                  return body.access_token;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response * "*" "*" */
        const statusCode = response.status;
        const headers = response.headers;
        const body = response.bodyAuto();
        vars = Object.assign(vars, {
          error: (() => {
            const acc = [];
            {
              const outcome = MapApiError(
                Object.assign(
                  {},
                  {
                    statusCode: (() => {
                      with (vars) {
                        return statusCode;
                      }
                    })(),
                  },
                  {
                    body: (() => {
                      with (vars) {
                        return body;
                      }
                    })(),
                  },
                  {
                    headers: (() => {
                      with (vars) {
                        return headers;
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
            return acc[0];
          })(),
        });
        __outcome.error = (() => {
          with (vars) {
            return error;
          }
        })();
        /* return */ break FN_BODY;
        /* end handler */ break HTTP_RESPONSE;
        throw new Error('Unexpected response');
      }
    }
  }
  return __outcome;
}
function MapApiError(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      statusCode: (() => {
        with (vars) {
          return args.statusCode;
        }
      })(),
    });
    vars = Object.assign(vars, {
      headers: (() => {
        with (vars) {
          return args.headers;
        }
      })(),
    });
    vars = Object.assign(vars, {
      body: (() => {
        with (vars) {
          return args.body;
        }
      })(),
    });
    vars = Object.assign(vars, {
      subcode: (() => {
        with (vars) {
          return body.error.code;
        }
      })(),
    });
    vars = Object.assign(vars, {
      title: (() => {
        with (vars) {
          return (
            body.error.error_user_title ||
            body.error.type ||
            body.error.message ||
            'Unknown error'
          );
        }
      })(),
    });
    vars = Object.assign(vars, {
      detail: (() => {
        with (vars) {
          return body.error.error_user_msg || body.error.message || undefined;
        }
      })(),
    });
    __outcome.data = Object.assign(
      {},
      {
        title: (() => {
          with (vars) {
            return title;
          }
        })(),
      },
      {
        detail: (() => {
          with (vars) {
            return detail;
          }
        })(),
      },
      {
        original: (() => {
          with (vars) {
            return body.error || body;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function GetApiVersion(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = 'v15.0';
    /* return */ break FN_BODY;
  }
  return __outcome;
}
