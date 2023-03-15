// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'ListJobs':
      mapFn = ListJobs;
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

function ListJobs(input, parameters, security) {
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
      const outcome = ListJobs(
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
            job: (() => {
              with (vars) {
                return input;
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
        listJobsOutcome: (() => {
          with (vars) {
            return outcome.data;
          }
        })(),
      });
    }
    __outcome.data = Object.assign(
      {},
      {
        jobs: (() => {
          with (vars) {
            return listJobsOutcome.jobs;
          }
        })(),
      },
      {
        pagination: (() => {
          with (vars) {
            return listJobsOutcome.pagination;
          }
        })(),
      },
      {
        rateLimit: (() => {
          with (vars) {
            return listJobsOutcome.rateLimit;
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
function MapPagination(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, { sinceIdToken: 'since_id=' });
    vars = Object.assign(vars, {
      nextPageCursor: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      nextUrl: (() => {
        with (vars) {
          return args.workablePagination.next || '';
        }
      })(),
    });
    vars = Object.assign(vars, {
      sinceIdIndex: (() => {
        with (vars) {
          return nextUrl.indexOf(sinceIdToken);
        }
      })(),
    });
    vars = Object.assign(vars, {
      nextPageCursor: (() => {
        with (vars) {
          return nextUrl
            .substring(sinceIdIndex + sinceIdToken.length, nextUrl.length)
            .split('&')[0];
        }
      })(),
    });
    __outcome.data = Object.assign(
      {},
      {
        nextPage: (() => {
          with (vars) {
            return nextPageCursor;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
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
              return workableError;
            }
          })(),
        },
        { code: 'BadRequest' },
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
              return workableError;
            }
          })(),
        },
        { code: 'NotFound' },
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
          return statusCode === 422;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Conflict' },
        {
          detail: (() => {
            with (vars) {
              return workableError;
            }
          })(),
        },
        { code: 'Conflict' },
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
function ListJobs(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/spi/v3/jobs`, {
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
          'X-WORKABLE-CLIENT-ID': (() => {
            with (vars) {
              return args.clientId;
            }
          })(),
        }
      );
      requestOptions.query = Object.assign(
        {},
        {
          state: (() => {
            with (vars) {
              return args.job.state;
            }
          })(),
        },
        {
          limit: (() => {
            with (vars) {
              return args.job.limit;
            }
          })(),
        },
        {
          since_id: (() => {
            with (vars) {
              return args.job.page;
            }
          })(),
        },
        { include_fields: 'requirements,description,benefits' }
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
            jobs: (() => {
              with (vars) {
                return body.jobs.map(job => {
                  return {
                    id: job.shortcode,
                    name: job.title,
                    description: job.description,
                    requirements: job.requirements,
                    benefits: job.benefits,
                    departmentName: job.department,
                  };
                });
              }
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              jobs: (() => {
                with (vars) {
                  return jobs;
                }
              })(),
            },
            {
              pagination: (() => {
                const acc = [];
                {
                  const outcome = MapPagination(
                    Object.assign(
                      {},
                      {
                        workablePagination: (() => {
                          with (vars) {
                            return body.paging || {};
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
            { title: 'Not Found' },
            {
              detail: (() => {
                with (vars) {
                  return (
                    'Unable to get subdomain by name ' +
                    args.subdomain +
                    '. Check that the subdomain with that name exists.'
                  );
                }
              })(),
            },
            { code: 'NotFound' },
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
