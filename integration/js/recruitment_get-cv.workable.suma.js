// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetCV':
      mapFn = GetCV;
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

function GetCV(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const outcome = CheckSubdomainExists(
        Object.assign(
          {},
          {
            clientId: (() => {
              with (vars) {
                return parameters.CLIENT_ID;
              }
            })(),
          },
          {
            subdomain: (() => {
              with (vars) {
                return parameters.SUBDOMAIN;
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
    }
    {
      const outcome = GetCV(
        Object.assign(
          {},
          {
            clientId: (() => {
              with (vars) {
                return parameters.CLIENT_ID;
              }
            })(),
          },
          {
            subdomain: (() => {
              with (vars) {
                return parameters.SUBDOMAIN;
              }
            })(),
          },
          {
            candidateId: (() => {
              with (vars) {
                return input.candidateId;
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
        getCVOutcome: (() => {
          with (vars) {
            return outcome.data;
          }
        })(),
      });
    }
    __outcome.data = Object.assign(
      {},
      {
        cv: (() => {
          with (vars) {
            return {
              documentUrl: getCVOutcome.fileUrl,
            };
          }
        })(),
      },
      {
        rateLimit: (() => {
          with (vars) {
            return getCVOutcome.rateLimit;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function GetCV(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/spi/v3/candidates/${args.candidateId}`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign(
        {},
        {
          'X-WORKABLE-CLIENT-ID': (() => {
            with (vars) {
              return args.clientId;
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
              fileUrl: (() => {
                with (vars) {
                  return body.candidate.resume_url;
                }
              })(),
            },
            {
              rateLimit: (() => {
                const acc = [];
                {
                  const outcome = MapRateLimit(
                    Object.assign(
                      {},
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
            }
          );
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 404 "application/json" "*" */
        if (
          response.status === 404 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Candidate Not Found' },
            {
              detail: (() => {
                with (vars) {
                  return `Candidate ID  ${args.candidateId} does not exist.`;
                }
              })(),
            },
            { code: 'CandidateNotFound' },
            {
              rateLimit: (() => {
                const acc = [];
                {
                  const outcome = MapRateLimit(
                    Object.assign(
                      {},
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
            }
          );
          /* return */ break FN_BODY;
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
                const outcome = MapWorkableError(
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
                      error: (() => {
                        with (vars) {
                          return body.error;
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
        __outcome.error = Object.assign(
          {},
          { title: 'Unknown error' },
          {
            detail: (() => {
              with (vars) {
                return JSON.stringify(body, null, 2);
              }
            })(),
          },
          { code: 'UnknownError' }
        );
        /* return */ break FN_BODY;
        /* end handler */ break HTTP_RESPONSE;
        throw new Error('Unexpected response');
      }
    }
  }
  return __outcome;
}
function CheckSubdomainExists(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/spi/v3/accounts/${args.subdomain}`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign(
        {},
        {
          'X-WORKABLE-CLIENT-ID': (() => {
            with (vars) {
              return args.clientId;
            }
          })(),
        }
      );
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 200 "*" "*" */
        if (response.status === 200) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.data = Object.assign({});
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 422 "application/json" "*" */
        if (
          response.status === 422 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Wrong Integration Parameter' },
            {
              detail: (() => {
                with (vars) {
                  return `Subdomain ${args.subdomain} does not exist.`;
                }
              })(),
            },
            { code: 'WrongIntegrationParameter' },
            {
              rateLimit: (() => {
                const acc = [];
                {
                  const outcome = MapRateLimit(
                    Object.assign(
                      {},
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
            }
          );
          /* return */ break FN_BODY;
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
                const outcome = MapWorkableError(
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
                      error: (() => {
                        with (vars) {
                          return body.error;
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
        __outcome.error = Object.assign(
          {},
          { title: 'Unknown error' },
          {
            detail: (() => {
              with (vars) {
                return JSON.stringify(body, null, 2);
              }
            })(),
          },
          { code: 'UnknownError' }
        );
        /* return */ break FN_BODY;
        /* end handler */ break HTTP_RESPONSE;
        throw new Error('Unexpected response');
      }
    }
  }
  return __outcome;
}
function MapRateLimit(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      totalRequests: (() => {
        with (vars) {
          return parseInt(args.headers['x-rate-limit-limit'], 10);
        }
      })(),
    });
    vars = Object.assign(vars, {
      remainingRequests: (() => {
        with (vars) {
          return parseInt(args.headers['x-rate-limit-remaining'], 10);
        }
      })(),
    });
    vars = Object.assign(vars, {
      remainingRequestsPercentage: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      resetTimestamp: (() => {
        with (vars) {
          return parseInt(args.headers['x-rate-limit-reset'], 10);
        }
      })(),
    });
    vars = Object.assign(vars, {
      totalRequests: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      remainingRequests: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      remainingRequestsPercentage: (() => {
        with (vars) {
          return (remainingRequests / totalRequests) * 100;
        }
      })(),
    });
    vars = Object.assign(vars, {
      resetTimestamp: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    __outcome.data = Object.assign(
      {},
      { bucket: 'workable' },
      {
        totalRequests: (() => {
          with (vars) {
            return totalRequests;
          }
        })(),
      },
      {
        remainingRequests: (() => {
          with (vars) {
            return remainingRequests;
          }
        })(),
      },
      {
        remainingRequestsPercentage: (() => {
          with (vars) {
            return remainingRequestsPercentage;
          }
        })(),
      },
      {
        resetTimestamp: (() => {
          with (vars) {
            return resetTimestamp;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapWorkableError(args, parameters, security) {
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
      workableError: (() => {
        with (vars) {
          return args.error;
        }
      })(),
    });
    vars = Object.assign(vars, {
      rateLimit: (() => {
        const acc = [];
        {
          const outcome = MapRateLimit(
            Object.assign(
              {},
              {
                headers: (() => {
                  with (vars) {
                    return args.headers;
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
    if (
      (() => {
        with (vars) {
          return statusCode === 401;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Unauthenticated' },
        {
          detail: (() => {
            with (vars) {
              return workableError;
            }
          })(),
        },
        { code: 'Unauthenticated' },
        {
          rateLimit: (() => {
            with (vars) {
              return rateLimit;
            }
          })(),
        }
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
        { title: 'Unauthorized' },
        {
          detail: (() => {
            with (vars) {
              return workableError;
            }
          })(),
        },
        { code: 'Unauthorized' },
        {
          rateLimit: (() => {
            with (vars) {
              return rateLimit;
            }
          })(),
        }
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
        { title: 'Rate limit exceeded' },
        { detail: 'You reached max requests quota.' },
        { code: 'RateLimitReached' },
        {
          rateLimit: (() => {
            with (vars) {
              return rateLimit;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    __outcome.data = Object.assign(
      {},
      { title: 'Unknown error' },
      {
        detail: (() => {
          with (vars) {
            return workableError;
          }
        })(),
      },
      { code: 'UnknownError' },
      {
        rateLimit: (() => {
          with (vars) {
            return rateLimit;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
