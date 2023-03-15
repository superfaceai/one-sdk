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
    vars = Object.assign(vars, {
      newProfile: (() => {
        const acc = [];
        {
          const outcome = BuildCrispProfile(
            Object.assign(
              {},
              {
                input: (() => {
                  with (vars) {
                    return input;
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
          return !newProfile.email || !(newProfile.person || {}).nickname;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Missing fields' },
        { detail: 'Crisp requires Email and Name to create new contact' }
      );
      /* return */ break FN_BODY;
    }
    {
      const url = std.unstable.resolveRequestUrl(
        `/v1/website/${parameters.WEBSITE_ID}/people/profile`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign({}, { 'X-Crisp-Tier': 'plugin' });
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.body = (() => {
        with (vars) {
          return newProfile;
        }
      })();
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 201 "*" "*" */
        if (response.status === 201) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          vars = Object.assign(vars, {
            customPropsResult: (() => {
              const acc = [];
              {
                const outcome = PatchCustomProperties(
                  Object.assign(
                    {},
                    {
                      profileId: (() => {
                        with (vars) {
                          return body.data.people_id;
                        }
                      })(),
                    },
                    {
                      customProperties: (() => {
                        with (vars) {
                          return input.customProperties;
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
          if (
            (() => {
              with (vars) {
                return !customPropsResult;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Partially failed' },
              {
                detail:
                  'Contact might have been created without custom properties. Please update the contact for consistency',
              }
            );
            /* return */ break FN_BODY;
          }
          __outcome.data = Object.assign(
            {},
            {
              id: (() => {
                with (vars) {
                  return body.data.people_id;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 409 "*" "*" */
        if (response.status === 409) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Contact already exists' },
            {
              detail: (() => {
                with (vars) {
                  return `Contact '${input.email}' already exists. If you wish to update it, use 'Update' use case`;
                }
              })(),
            }
          );
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
              const outcome = HandleCommonErrors(
                Object.assign(
                  {},
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
function Update(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      profileId: (() => {
        with (vars) {
          return input.id || input.email;
        }
      })(),
    });
    vars = Object.assign(vars, {
      profileUpdate: (() => {
        const acc = [];
        {
          const outcome = BuildCrispProfile(
            Object.assign(
              {},
              {
                input: (() => {
                  with (vars) {
                    return input;
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
    {
      const url = std.unstable.resolveRequestUrl(
        `/v1/website/${parameters.WEBSITE_ID}/people/profile/${vars.profileId}`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'PATCH',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign({}, { 'X-Crisp-Tier': 'plugin' });
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.body = (() => {
        with (vars) {
          return profileUpdate;
        }
      })();
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 200 "*" "*" */
        if (response.status === 200) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          vars = Object.assign(vars, {
            customPropsResult: (() => {
              const acc = [];
              {
                const outcome = PatchCustomProperties(
                  Object.assign(
                    {},
                    {
                      profileId: (() => {
                        with (vars) {
                          return profileId;
                        }
                      })(),
                    },
                    {
                      customProperties: (() => {
                        with (vars) {
                          return input.customProperties;
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
          if (
            (() => {
              with (vars) {
                return !customPropsResult;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Partially failed' },
              {
                detail:
                  'Contact might be updated without custom properties. Please update the contact for data consistency',
              }
            );
            /* return */ break FN_BODY;
          }
          __outcome.data = Object.assign(
            {},
            {
              id: (() => {
                with (vars) {
                  return profileId;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 409 "*" "*" */
        if (response.status === 409) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Email already exists' },
            {
              detail: (() => {
                with (vars) {
                  return `Email '${input.email}' already exists in another contact`;
                }
              })(),
            }
          );
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
              const outcome = HandleCommonErrors(
                Object.assign(
                  {},
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
function Search(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      OPERATOR_MAP: (() => {
        with (vars) {
          return {
            EQ: 'eq',
            NEQ: 'neq',
          };
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/v1/website/${parameters.WEBSITE_ID}/people/profiles`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign({}, { 'X-Crisp-Tier': 'plugin' });
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.query = Object.assign(
        {},
        {
          search_filter: (() => {
            with (vars) {
              return JSON.stringify([
                {
                  criterion: input.property,
                  query: [input.value],
                  operator: OPERATOR_MAP[input.operator] || input.operator,
                  model: 'people',
                },
              ]);
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
            contactsList: (() => {
              const acc = [];
              {
                for (const profile of (() => {
                  with (vars) {
                    return body.data;
                  }
                })()) {
                  const outcome = MapProfileFromCrisp(
                    Object.assign(
                      {},
                      {
                        profile: (() => {
                          with (vars) {
                            return profile;
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
          __outcome.data = (() => {
            with (vars) {
              return contactsList;
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
              const outcome = HandleCommonErrors(
                Object.assign(
                  {},
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
function GetCustomProperties(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/v1/website/${parameters.WEBSITE_ID}/people/data/${args.profileId}`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign({}, { 'X-Crisp-Tier': 'plugin' });
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 200 "*" "*" */
        if (response.status === 200) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.data = (() => {
            with (vars) {
              return body.data.data;
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
              const outcome = HandleCommonErrors(
                Object.assign(
                  {},
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
  return __outcome;
}
function PatchCustomProperties(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    if (
      (() => {
        with (vars) {
          return Object.keys(args.customProperties).length < 1;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        {
          id: (() => {
            with (vars) {
              return args.profileId;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    {
      const url = std.unstable.resolveRequestUrl(
        `/v1/website/${parameters.WEBSITE_ID}/people/data/${args.profileId}`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'PATCH',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign({}, { 'X-Crisp-Tier': 'plugin' });
      requestOptions.body = (() => {
        with (vars) {
          return {
            data: args.customProperties,
          };
        }
      })();
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 200 "*" "*" */
        if (response.status === 200) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.data = Object.assign(
            {},
            {
              id: (() => {
                with (vars) {
                  return args.profileId;
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
              const outcome = HandleCommonErrors(
                Object.assign(
                  {},
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
  return __outcome;
}
function BuildCrispProfile(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      input: (() => {
        with (vars) {
          return args.input;
        }
      })(),
    });
    vars = Object.assign(vars, {
      fullName: (() => {
        with (vars) {
          return (
            [input.firstName || '', input.lastName || ''].join(' ').trim() ||
            undefined
          );
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return {
          email: input.email,

          person: (fullName || input.phone || input.country) && {
            nickname: fullName,
            phone: input.phone,
            geolocation: { country: input.country },
          },

          company: input.company && {
            name: input.company,
          },
        };
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapProfileFromCrisp(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      crispProfile: (() => {
        with (vars) {
          return args.profile;
        }
      })(),
    });
    vars = Object.assign(vars, {
      crispProfilePerson: (() => {
        with (vars) {
          return crispProfile.person || {};
        }
      })(),
    });
    vars = Object.assign(vars, {
      parsedName: (() => {
        const acc = [];
        {
          const outcome = ParseCrispName(
            Object.assign(
              {},
              {
                name: (() => {
                  with (vars) {
                    return crispProfilePerson.nickname;
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
    {
      const outcome = GetCustomProperties(
        Object.assign(
          {},
          {
            profileId: (() => {
              with (vars) {
                return crispProfile.people_id;
              }
            })(),
          }
        ),
        parameters,
        security
      );
      vars = Object.assign(vars, {
        customProperties: (() => {
          with (vars) {
            return outcome.data;
          }
        })(),
      });
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
            return crispProfile.people_id;
          }
        })(),
      },
      {
        email: (() => {
          with (vars) {
            return crispProfile.email;
          }
        })(),
      },
      {
        phone: (() => {
          with (vars) {
            return crispProfilePerson.phone;
          }
        })(),
      },
      {
        firstName: (() => {
          with (vars) {
            return parsedName.firstName;
          }
        })(),
      },
      {
        lastName: (() => {
          with (vars) {
            return parsedName.lastName;
          }
        })(),
      },
      {
        company: (() => {
          with (vars) {
            return (crispProfile.company || {}).name;
          }
        })(),
      },
      {
        country: (() => {
          with (vars) {
            return (crispProfilePerson.geolocation || {}).country;
          }
        })(),
      },
      {
        customProperties: (() => {
          with (vars) {
            return customProperties;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function ParseCrispName(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      crispName: (() => {
        with (vars) {
          return (args.name || '').trim();
        }
      })(),
    });
    vars = Object.assign(vars, {
      lastNameIx: (() => {
        with (vars) {
          return crispName.lastIndexOf(' ');
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return lastNameIx === -1;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        {
          firstName: (() => {
            with (vars) {
              return crispName || undefined;
            }
          })(),
        },
        {
          lastName: (() => {
            with (vars) {
              return undefined;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    __outcome.data = Object.assign(
      {},
      {
        firstName: (() => {
          with (vars) {
            return crispName.slice(0, lastNameIx).trim();
          }
        })(),
      },
      {
        lastName: (() => {
          with (vars) {
            return crispName.slice(lastNameIx).trim();
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function HandleCommonErrors(args, parameters, security) {
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
    if (
      (() => {
        with (vars) {
          return statusCode === 400;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Invalid data' },
        { detail: 'Invalid data was sent to Crisp server' }
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
          detail:
            "Please make sure you're providing a valid Crisp API credentials",
        }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return statusCode === 402;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Crisp subscription upgrade required' }
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
      __outcome.data = Object.assign({}, { title: 'Not allowed' });
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
          detail:
            'Contact or website was not found or Crisp plugin is not subscribed. Make sure the Crisp website exists and uses your plugin',
        }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return statusCode === 423 || statusCode === 429;
        }
      })()
    ) {
      __outcome.data = Object.assign({}, { title: 'Quota limit exceeded' });
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
        { title: "Error on Crisp's side" },
        {
          detail:
            "It looks like Crisp is temporarily having difficulties processing your request. Please try again or contact Crisp's support",
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
            return `Unknown error occurred. Status: ${statusCode}`;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
