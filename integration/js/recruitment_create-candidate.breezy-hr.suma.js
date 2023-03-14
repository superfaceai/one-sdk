// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'CreateCandidate':
      mapFn = CreateCandidate;
      break;
    case 'CreateCandidateFeatures':
      mapFn = CreateCandidateFeatures;
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

function CreateCandidate(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const outcome = CheckSupportedFileTypes(
        Object.assign(
          {},
          {
            cv: (() => {
              with (vars) {
                return input.cv;
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
      const outcome = CheckCompanyExists(
        Object.assign(
          {},
          {
            accessToken: (() => {
              with (vars) {
                return parameters.ACCESS_TOKEN;
              }
            })(),
          },
          {
            companyId: (() => {
              with (vars) {
                return parameters.COMPANY_ID;
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
      const outcome = CheckJobExists(
        Object.assign(
          {},
          {
            accessToken: (() => {
              with (vars) {
                return parameters.ACCESS_TOKEN;
              }
            })(),
          },
          {
            companyId: (() => {
              with (vars) {
                return parameters.COMPANY_ID;
              }
            })(),
          },
          {
            jobId: (() => {
              with (vars) {
                return input.jobId;
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
      const outcome = CheckCandidateExist(
        Object.assign(
          {},
          {
            accessToken: (() => {
              with (vars) {
                return parameters.ACCESS_TOKEN;
              }
            })(),
          },
          {
            companyId: (() => {
              with (vars) {
                return parameters.COMPANY_ID;
              }
            })(),
          },
          {
            jobId: (() => {
              with (vars) {
                return input.jobId;
              }
            })(),
          },
          {
            email: (() => {
              with (vars) {
                return input.email;
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
    vars = Object.assign(vars, {
      createCandidateOutcome: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    {
      const outcome = CreateCandidate(
        Object.assign(
          {},
          {
            accessToken: (() => {
              with (vars) {
                return parameters.ACCESS_TOKEN;
              }
            })(),
          },
          {
            companyId: (() => {
              with (vars) {
                return parameters.COMPANY_ID;
              }
            })(),
          },
          {
            candidate: (() => {
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
        createCandidateOutcome: (() => {
          with (vars) {
            return outcome.data;
          }
        })(),
      });
    }
    {
      const outcome = UploadCV(
        Object.assign(
          {},
          {
            accessToken: (() => {
              with (vars) {
                return parameters.ACCESS_TOKEN;
              }
            })(),
          },
          {
            companyId: (() => {
              with (vars) {
                return parameters.COMPANY_ID;
              }
            })(),
          },
          {
            candidateId: (() => {
              with (vars) {
                return createCandidateOutcome.candidate.id;
              }
            })(),
          },
          {
            candidate: (() => {
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
    }
    __outcome.data = Object.assign(
      {},
      {
        id: (() => {
          with (vars) {
            return createCandidateOutcome.candidate.id;
          }
        })(),
      },
      {
        jobId: (() => {
          with (vars) {
            return createCandidateOutcome.candidate.jobId;
          }
        })(),
      },
      {
        rateLimit: (() => {
          with (vars) {
            return createCandidateOutcome.rateLimit;
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
function CreateCandidateFeatures(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        cvMIMETypes: (() => {
          with (vars) {
            return ['application/pdf'];
          }
        })(),
      },
      {
        cvUploadMethods: (() => {
          with (vars) {
            return ['file'];
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
function MapRateLimit(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      totalRequests: (() => {
        with (vars) {
          return parseInt(args.headers['x-ratelimit-limit'], 10);
        }
      })(),
    });
    vars = Object.assign(vars, {
      remainingRequests: (() => {
        with (vars) {
          return parseInt(args.headers['x-ratelimit-remaining'], 10);
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
          return parseInt(args.headers['x-ratelimit-reset'], 10);
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
      { bucket: 'breezy-hr' },
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
function MapBreezyHRError(args, parameters, security) {
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
function CreateCandidate(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      supportedSocialProfiles: (() => {
        with (vars) {
          return [
            'facebook',
            'linkedin',
            'twitter',
            'dribbble',
            'instagram',
            'behance',
            'angellist',
            'flickr',
            'github',
            'youtube',
            'google-plus',
            'skype',
            'globe',
          ];
        }
      })(),
    });
    vars = Object.assign(vars, {
      links: (() => {
        with (vars) {
          return {};
        }
      })(),
    });
    vars = Object.assign(vars, {
      customAttributes: (() => {
        with (vars) {
          return [];
        }
      })(),
    });
    vars = Object.assign(vars, {
      candidate: (() => {
        with (vars) {
          return args.candidate;
        }
      })(),
    });
    vars = Object.assign(vars, {
      tmp: (() => {
        with (vars) {
          return (candidate.links || []).forEach(link => {
            if (supportedSocialProfiles.includes(link.name)) {
              links[link.name] = link.url;
            } else {
              customAttributes.push({
                name: link.name,
                value: link.url,
              });
            }
          });
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/v3/company/${parameters.COMPANY_ID}/position/${vars.candidate.jobId}/candidates`,
        { parameters, security, serviceId: 'default' }
      );
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign(
        {},
        {
          Authorization: (() => {
            with (vars) {
              return parameters.ACCESS_TOKEN;
            }
          })(),
        }
      );
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.body = Object.assign(
        {},
        {
          name: (() => {
            with (vars) {
              return candidate.firstName + ' ' + candidate.lastName;
            }
          })(),
        },
        {
          email_address: (() => {
            with (vars) {
              return candidate.email;
            }
          })(),
        },
        {
          address: (() => {
            with (vars) {
              return candidate.address;
            }
          })(),
        },
        {
          phone_number: (() => {
            with (vars) {
              return candidate.phone;
            }
          })(),
        },
        {
          education: (() => {
            with (vars) {
              return candidate.education
                ? candidate.education.map(edu => ({
                    school_name: edu.school,
                    degree: edu.degree,
                    field_of_study: edu.fieldOfStudy,
                    start_date: edu.startedAt,
                    end_date: edu.endedAt,
                  }))
                : undefined;
            }
          })(),
        },
        {
          work_history: (() => {
            with (vars) {
              return candidate.workExperience
                ? candidate.workExperience.map(work => ({
                    title: work.position,
                    summary: work.summary,
                    company_name: work.company,
                    industry: work.industry,
                    is_current: work.current,
                  }))
                : undefined;
            }
          })(),
        },
        {
          social_profiles: (() => {
            with (vars) {
              return links;
            }
          })(),
        },
        {
          custom_attributes: (() => {
            with (vars) {
              return customAttributes;
            }
          })(),
        },
        { origin: 'applied' }
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
              candidate: (() => {
                with (vars) {
                  return {
                    id: body._id,
                    jobId: candidate.jobId,
                  };
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
                const outcome = MapBreezyHRError(
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
function CheckCandidateExist(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/v3/company/${args.companyId}/candidates/search`,
        { parameters, security, serviceId: 'default' }
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
          Authorization: (() => {
            with (vars) {
              return args.accessToken;
            }
          })(),
        }
      );
      requestOptions.query = Object.assign(
        {},
        {
          email_address: (() => {
            with (vars) {
              return args.email;
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
          vars = Object.assign(vars, {
            appliedCandidates: (() => {
              with (vars) {
                return body.filter(
                  candidate => candidate.position._id === args.jobId
                );
              }
            })(),
          });
          if (
            (() => {
              with (vars) {
                return appliedCandidates.length > 0;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Conflict' },
              {
                detail: (() => {
                  with (vars) {
                    return (
                      'Candidate with email ' +
                      args.email +
                      ' already applied for the job.'
                    );
                  }
                })(),
              },
              { code: 'Conflict' },
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
          }
          __outcome.data = Object.assign({});
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
                const outcome = MapBreezyHRError(
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
function CheckJobExists(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/v3/company/${args.companyId}/position/${args.jobId}`,
        { parameters, security, serviceId: 'default' }
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
          Authorization: (() => {
            with (vars) {
              return args.accessToken;
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
        /* response 500 "application/json" "*" */
        if (
          response.status === 500 &&
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
                    'Unable to get job by ID ' +
                    args.jobId +
                    '. Check that the job with that ID exists.'
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
                const outcome = MapBreezyHRError(
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
function CheckCompanyExists(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/v3/company/${args.companyId}`,
        { parameters, security, serviceId: 'default' }
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
          Authorization: (() => {
            with (vars) {
              return args.accessToken;
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
        /* response 500 "application/json" "*" */
        if (
          response.status === 500 &&
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
                    'Unable to get company by ID ' +
                    args.companyId +
                    '. Check that the company with that ID exists.'
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
        throw new Error('Unexpected response');
      }
    }
  }
  return __outcome;
}
function CheckSupportedFileTypes(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      cv: (() => {
        with (vars) {
          return args.cv || {};
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return cv.data === undefined || cv.data === null;
        }
      })()
    ) {
      __outcome.data = Object.assign({});
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return cv.fileName === undefined || cv.fileName === null;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Missing CV file name' },
        { detail: 'CV file name is required.' },
        { code: 'CVFileNameRequired' }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return !cv.fileName.endsWith('pdf');
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'CV MIME type not supported' },
        {
          detail: (() => {
            with (vars) {
              return `File type ${cv.fileName} is not supported by Breezy HR provider.`;
            }
          })(),
        },
        { code: 'CVMIMETypeNotSupported' }
      );
      /* return */ break FN_BODY;
    }
    __outcome.data = Object.assign({});
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function UploadCV(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      cv: (() => {
        with (vars) {
          return args.candidate.cv || {};
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return cv.data === undefined || cv.data === null;
        }
      })()
    ) {
      __outcome.data = Object.assign({});
      /* return */ break FN_BODY;
    }
    vars = Object.assign(vars, {
      tmp: (() => {
        with (vars) {
          return (cv.data.name = cv.fileName);
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/v3/company/${args.companyId}/position/${args.candidate.jobId}/candidate/${args.candidateId}/resume`,
        { parameters, security, serviceId: 'default' }
      );
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign(
        {},
        {
          Authorization: (() => {
            with (vars) {
              return args.accessToken;
            }
          })(),
        }
      );
      requestOptions.headers['content-type'] = ['multipart/form-data'];
      requestOptions.body = (() => {
        with (vars) {
          return {
            data: cv.data,
          };
        }
      })();
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 204 "*" "*" */
        if (response.status === 204) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.data = Object.assign({});
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
                const outcome = MapBreezyHRError(
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
