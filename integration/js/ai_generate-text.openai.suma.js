// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'CompleteText':
      mapFn = CompleteText;
      break;
    case 'EditText':
      mapFn = EditText;
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

function CompleteText(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/v1/completions`, {
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
      requestOptions.headers = Object.assign(
        {},
        {
          'OpenAI-Organization': (() => {
            with (vars) {
              return parameters.organizationId;
            }
          })(),
        }
      );
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.body = Object.assign(
        {},
        {
          prompt: (() => {
            with (vars) {
              return input.prompt;
            }
          })(),
        },
        {
          model: (() => {
            const acc = [];
            {
              const outcome = MapCompleteModelSize(
                Object.assign(
                  {},
                  {
                    model: (() => {
                      with (vars) {
                        return input.model;
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
        },
        {
          temperature: (() => {
            const acc = [];
            {
              const outcome = MapCreativity(
                Object.assign(
                  {},
                  {
                    creativity: (() => {
                      with (vars) {
                        return input.creativity;
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
        },
        {
          max_tokens: (() => {
            const acc = [];
            {
              const outcome = MapMaxLength(
                Object.assign(
                  {},
                  {
                    approxMaxWords: (() => {
                      with (vars) {
                        return input.approxMaxWords;
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
        },
        {
          n: (() => {
            const acc = [];
            {
              const outcome = MapCount(
                Object.assign(
                  {},
                  {
                    count: (() => {
                      with (vars) {
                        return input.count;
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
        },
        { stream: false },
        {
          logprobs: (() => {
            with (vars) {
              return null;
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
            completions: (() => {
              const acc = [];
              {
                for (const choice of (() => {
                  with (vars) {
                    return body.choices;
                  }
                })()) {
                  const outcome = MapCompletion(
                    Object.assign(
                      {},
                      {
                        choice: (() => {
                          with (vars) {
                            return choice;
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
              return acc;
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              completions: (() => {
                with (vars) {
                  return completions;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response * "application/json" "*" */
        if (
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          vars = Object.assign(vars, {
            error: (() => {
              const acc = [];
              {
                const outcome = HandleErrorWithJson(
                  Object.assign(
                    {},
                    {
                      body: (() => {
                        with (vars) {
                          return body;
                        }
                      })(),
                    },
                    {
                      statusCode: (() => {
                        with (vars) {
                          return statusCode;
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
              const outcome = HandleError(
                Object.assign(
                  {},
                  {
                    body: (() => {
                      with (vars) {
                        return body;
                      }
                    })(),
                  },
                  {
                    statusCode: (() => {
                      with (vars) {
                        return statusCode;
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
function EditText(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/v1/edits`, {
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
      requestOptions.headers = Object.assign(
        {},
        {
          'OpenAI-Organization': (() => {
            with (vars) {
              return parameters.organizationId;
            }
          })(),
        }
      );
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.body = Object.assign(
        {},
        {
          input: (() => {
            with (vars) {
              return input.text;
            }
          })(),
        },
        {
          instruction: (() => {
            with (vars) {
              return input.instructions;
            }
          })(),
        },
        { model: 'text-davinci-edit-001' },
        {
          temperature: (() => {
            const acc = [];
            {
              const outcome = MapCreativity(
                Object.assign(
                  {},
                  {
                    creativity: (() => {
                      with (vars) {
                        return input.creativity;
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
        },
        {
          n: (() => {
            const acc = [];
            {
              const outcome = MapCount(
                Object.assign(
                  {},
                  {
                    count: (() => {
                      with (vars) {
                        return input.count;
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
            edits: (() => {
              const acc = [];
              {
                for (const choice of (() => {
                  with (vars) {
                    return body.choices;
                  }
                })()) {
                  const outcome = MapEdit(
                    Object.assign(
                      {},
                      {
                        choice: (() => {
                          with (vars) {
                            return choice;
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
              return acc;
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              edits: (() => {
                with (vars) {
                  return edits;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response * "application/json" "*" */
        if (
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          vars = Object.assign(vars, {
            error: (() => {
              const acc = [];
              {
                const outcome = HandleErrorWithJson(
                  Object.assign(
                    {},
                    {
                      body: (() => {
                        with (vars) {
                          return body;
                        }
                      })(),
                    },
                    {
                      statusCode: (() => {
                        with (vars) {
                          return statusCode;
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
              const outcome = HandleError(
                Object.assign(
                  {},
                  {
                    body: (() => {
                      with (vars) {
                        return body;
                      }
                    })(),
                  },
                  {
                    statusCode: (() => {
                      with (vars) {
                        return statusCode;
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
function MapCompleteModelSize(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      MODELSIZE_TO_OPENAI_MODEL: (() => {
        with (vars) {
          return {
            small: 'text-babbage-001',
            medium: 'text-curie-001',
            large: 'text-davinci-003',
          };
        }
      })(),
    });
    vars = Object.assign(vars, { DEFAULT_MODEL_SIZE: 'large' });
    __outcome.data = (() => {
      with (vars) {
        return MODELSIZE_TO_OPENAI_MODEL[args.model || DEFAULT_MODEL_SIZE];
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapCreativity(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, { DEFAULT_CREATIVITY: 1 });
    vars = Object.assign(vars, {
      creativity: (() => {
        with (vars) {
          return args.creativity || DEFAULT_CREATIVITY;
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return Math.min(Math.max(creativity, 0), 1);
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapMaxLength(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, { DEFAULT_MAX_WORDS: 12 });
    __outcome.data = (() => {
      with (vars) {
        return parseInt((args.approxMaxWords || DEFAULT_MAX_WORDS) * 1.4);
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapCount(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, { DEFAULT_COUNT: 1 });
    __outcome.data = (() => {
      with (vars) {
        return parseInt(Math.max(1, args.count || DEFAULT_COUNT));
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapCompletion(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = (() => {
      with (vars) {
        return args.choice.text;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapEdit(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = (() => {
      with (vars) {
        return args.choice.text;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function HandleErrorWithJson(args, parameters, security) {
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
      body: (() => {
        with (vars) {
          return args.body;
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return statusCode === 400;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { code: 'BadRequest' },
        { title: 'Invalid data' },
        {
          detail: (() => {
            with (vars) {
              return `Invalid data was sent to OpenAI server: ${body.error.message}`;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return statusCode === 401;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { code: 'Unauthenticated' },
        { title: 'Unauthenticated' },
        {
          detail: (() => {
            with (vars) {
              return `Please make sure you're providing a valid OpenAI API key: ${body.error.message}`;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return statusCode === 404;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { code: 'NotFound' },
        { title: 'Not Found' },
        {
          detail: (() => {
            with (vars) {
              return body.error.message;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    __outcome.data = Object.assign(
      {},
      { code: 'UnknownError' },
      { title: 'Unknown error' },
      {
        detail: (() => {
          with (vars) {
            return `Unknown error occurred. Status: ${statusCode}`;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function HandleError(args, parameters, security) {
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
      body: (() => {
        with (vars) {
          return args.body;
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return statusCode === 401;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { code: 'Unauthenticated' },
        { title: 'Unauthenticated' },
        { detail: "Please make sure you're providing a valid OpenAI API key" }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return statusCode === 403;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { code: 'NotAllowed' },
        { title: 'Not allowed' }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return statusCode === 429;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { code: 'RateLimitReached' },
        { title: 'Quota limit exceeded' }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return statusCode === 500;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { code: 'ProviderError' },
        { title: "Error on OpenAI's side" },
        {
          detail: (() => {
            with (vars) {
              return `It looks like OpenAI is temporarily having difficulties processing your request. Try again or contact OpenAI's support. ${String(
                body
              )}`;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    __outcome.data = Object.assign(
      {},
      { code: 'UnknownError' },
      { title: 'Unknown error' },
      {
        detail: (() => {
          with (vars) {
            return `Unknown error occurred. Status: ${statusCode}`;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
