// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetMembers':
      mapFn = GetMembers;
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

function GetMembers(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/users.list`, {
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
      requestOptions.headers = Object.assign(
        {},
        {
          Authorization: (() => {
            with (vars) {
              return `Bearer ${parameters.accessToken}`;
            }
          })(),
        }
      );
      requestOptions.headers['content-type'] = [
        'application/x-www-form-urlencoded',
      ];
      requestOptions.query = Object.assign(
        {},
        {
          cursor: (() => {
            with (vars) {
              return input.page;
            }
          })(),
        },
        {
          limit: (() => {
            with (vars) {
              return input.limit || 100;
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
            error: (() => {
              const acc = [];
              {
                if (
                  (() => {
                    with (vars) {
                      return !body.ok;
                    }
                  })()
                ) {
                  const outcome = MapSlackError(
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
              }
              return acc[0];
            })(),
          });
          if (
            (() => {
              with (vars) {
                return !body.ok;
              }
            })()
          ) {
            __outcome.error = (() => {
              with (vars) {
                return error;
              }
            })();
            /* return */ break FN_BODY;
          }
          vars = Object.assign(vars, {
            members: (() => {
              const acc = [];
              {
                const outcome = MapMembers(
                  Object.assign(
                    {},
                    {
                      members: (() => {
                        with (vars) {
                          return body.members;
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
          vars = Object.assign(vars, {
            rateLimit: (() => {
              const acc = [];
              {
                const outcome = MapRateLimitDetails(
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
          });
          vars = Object.assign(vars, {
            result: {
              members: (() => {
                with (vars) {
                  return members;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            result: {
              nextPage: (() => {
                with (vars) {
                  return body.response_metadata.next_cursor;
                }
              })(),
            },
          });
          vars = Object.assign(vars, {
            result: {
              rateLimit: (() => {
                with (vars) {
                  return rateLimit;
                }
              })(),
            },
          });
          __outcome.data = (() => {
            with (vars) {
              return result;
            }
          })();
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
              const outcome = MapSlackError(
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
function MapMembers(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      members: (() => {
        with (vars) {
          return args.members.map(member => {
            const resultMember = {
              id: member.id,
              isBot: member.is_bot,
              username: member.profile.display_name,
            };

            return resultMember;
          });
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return members;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapRateLimitDetails(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      headers: (() => {
        with (vars) {
          return args.headers;
        }
      })(),
    });
    vars = Object.assign(vars, {
      details: (() => {
        with (vars) {
          return {};
        }
      })(),
    });
    vars = Object.assign(vars, {
      totalRequests: (() => {
        with (vars) {
          return parseInt(headers['X-Rate-Limit-Limit']);
        }
      })(),
    });
    vars = Object.assign(vars, {
      remainingRequests: (() => {
        with (vars) {
          return parseInt(headers['X-Rate-Limit-Remaining']);
        }
      })(),
    });
    vars = Object.assign(vars, {
      resetAfter: (() => {
        with (vars) {
          return parseInt(headers['X-Rate-Limit-Reset']);
        }
      })(),
    });
    vars = Object.assign(vars, {
      retryAfter: (() => {
        with (vars) {
          return parseInt(headers['Retry-After']);
        }
      })(),
    });
    vars = Object.assign(vars, {
      details: {
        totalRequests: (() => {
          with (vars) {
            return totalRequests;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      details: {
        remainingRequests: (() => {
          with (vars) {
            return remainingRequests;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      details: {
        resetAfter: (() => {
          with (vars) {
            return resetAfter;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      details: {
        resetTimestamp: (() => {
          with (vars) {
            return Date.now() + resetAfter * 1000;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      details: {
        retryAfter: (() => {
          with (vars) {
            return retryAfter;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      details: {
        remainingRequestsPercentage: (() => {
          with (vars) {
            return (details.remainingRequests / details.totalRequests) * 100;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      details: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return details;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapSlackError(args, parameters, security) {
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
      slackError: (() => {
        with (vars) {
          return args.error;
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
      rateLimit: (() => {
        const acc = [];
        {
          const outcome = MapRateLimitDetails(
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
            throw new Error(`Unexpected inline call failure: ${outcome.error}`);
          } else {
            acc.push(outcome.data);
          }
        }
        return acc[0];
      })(),
    });
    vars = Object.assign(vars, {
      detail: (() => {
        with (vars) {
          return slackError.error;
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return statusCode === 200;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        {
          title: (() => {
            with (vars) {
              return detail;
            }
          })(),
        },
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
          return statusCode === 400;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Bad request' },
        {
          detail: (() => {
            with (vars) {
              return slackError;
            }
          })(),
        },
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
          return statusCode === 401;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Unauthorized' },
        {
          detail: (() => {
            with (vars) {
              return detail;
            }
          })(),
        },
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
        { title: 'Forbidden' },
        {
          detail: (() => {
            with (vars) {
              return detail;
            }
          })(),
        },
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
          return statusCode === 404;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Not found' },
        {
          detail: (() => {
            with (vars) {
              return detail;
            }
          })(),
        },
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
          return statusCode === 405;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Method not allowed' },
        {
          detail: (() => {
            with (vars) {
              return detail;
            }
          })(),
        },
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
        { title: 'Too Many Requests' },
        {
          detail: (() => {
            with (vars) {
              return `Retry after ${headers['Retry-After']} seconds`;
            }
          })(),
        },
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
          return statusCode === 502;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Bad gateway' },
        {
          detail: (() => {
            with (vars) {
              return detail;
            }
          })(),
        },
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
            return `Unknown error occurred. Status: ${statusCode}. Code: ${detail}.`;
          }
        })(),
      },
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
