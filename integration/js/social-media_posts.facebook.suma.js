// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetProfilePosts':
      mapFn = GetProfilePosts;
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

function GetProfilePosts(input, parameters, security) {
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
    vars = Object.assign(vars, {
      profileId: (() => {
        with (vars) {
          return input.profileId;
        }
      })(),
    });
    vars = Object.assign(vars, {
      after: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      before: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      after: (() => {
        with (vars) {
          return input.page.replace('next:', '');
        }
      })(),
    });
    vars = Object.assign(vars, {
      before: (() => {
        with (vars) {
          return input.page.replace('previous:', '');
        }
      })(),
    });
    {
      const outcome = GetPageAccessToken(
        Object.assign(
          {},
          {
            pageId: (() => {
              with (vars) {
                return profileId;
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
    if (
      (() => {
        with (vars) {
          return !token;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Unable to get page access token' }
      );
      /* return */ break FN_BODY;
    }
    {
      const url = std.unstable.resolveRequestUrl(
        `/${vars.apiVersion}/${vars.profileId}/feed`,
        { parameters, security, serviceId: 'default' }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.query = Object.assign(
        {},
        {
          access_token: (() => {
            with (vars) {
              return token;
            }
          })(),
        },
        {
          after: (() => {
            with (vars) {
              return after;
            }
          })(),
        },
        {
          before: (() => {
            with (vars) {
              return before;
            }
          })(),
        },
        { limit: 25 },
        {
          fields:
            'id,permalink_url,created_time,message,attachments,duration,height,width',
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
            posts: (() => {
              const acc = [];
              {
                for (const post of (() => {
                  with (vars) {
                    return body.data;
                  }
                })()) {
                  const outcome = MapPost(
                    Object.assign(
                      {},
                      {
                        post: (() => {
                          with (vars) {
                            return post;
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
          vars = Object.assign(vars, {
            previousPage: (() => {
              with (vars) {
                return undefined;
              }
            })(),
          });
          vars = Object.assign(vars, {
            nextPage: (() => {
              with (vars) {
                return undefined;
              }
            })(),
          });
          vars = Object.assign(vars, {
            previousPage: (() => {
              with (vars) {
                return 'previous:' + body.paging.cursors.before;
              }
            })(),
          });
          vars = Object.assign(vars, {
            nextPage: (() => {
              with (vars) {
                return 'next:' + body.paging.cursors.after;
              }
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              previousPage: (() => {
                with (vars) {
                  return previousPage;
                }
              })(),
            },
            {
              nextPage: (() => {
                with (vars) {
                  return nextPage;
                }
              })(),
            },
            {
              posts: (() => {
                with (vars) {
                  return posts;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
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
          __outcome.error = Object.assign(
            {},
            { title: 'Bad request' },
            {
              detail: (() => {
                with (vars) {
                  return body.error.message;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 401 "application/json" "*" */
        if (
          response.status === 401 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Unauthenticated' },
            {
              detail: (() => {
                with (vars) {
                  return body.error.message;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 403 "application/json" "*" */
        if (
          response.status === 403 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Forbidden' },
            {
              detail: (() => {
                with (vars) {
                  return body.error.message;
                }
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
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function MapPost(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      post: (() => {
        with (vars) {
          return args.post;
        }
      })(),
    });
    vars = Object.assign(vars, {
      attachments: (() => {
        with (vars) {
          return [];
        }
      })(),
    });
    vars = Object.assign(vars, {
      attachments: (() => {
        const acc = [];
        {
          for (const attachment of (() => {
            with (vars) {
              return post.attachments.data;
            }
          })()) {
            const outcome = MapAttachment(
              Object.assign(
                {},
                {
                  attachment: (() => {
                    with (vars) {
                      return attachment;
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
        id: (() => {
          with (vars) {
            return post.id;
          }
        })(),
      },
      {
        url: (() => {
          with (vars) {
            return post.permalink_url;
          }
        })(),
      },
      {
        createdAt: (() => {
          with (vars) {
            return post.created_time;
          }
        })(),
      },
      {
        text: (() => {
          with (vars) {
            return post.message;
          }
        })(),
      },
      {
        attachments: (() => {
          with (vars) {
            return attachments;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapAttachment(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      attachment: (() => {
        with (vars) {
          return args.attachment;
        }
      })(),
    });
    __outcome.data = Object.assign(
      {},
      {
        type: (() => {
          with (vars) {
            return attachment.type;
          }
        })(),
      },
      {
        url: (() => {
          with (vars) {
            return attachment.url;
          }
        })(),
      },
      {
        title: (() => {
          with (vars) {
            return attachment.title;
          }
        })(),
      },
      {
        description: (() => {
          with (vars) {
            return attachment.text;
          }
        })(),
      },
      {
        height: (() => {
          with (vars) {
            return attachment.height;
          }
        })(),
      },
      {
        width: (() => {
          with (vars) {
            return attachment.width;
          }
        })(),
      },
      {
        duration: (() => {
          with (vars) {
            return attachment.duration;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
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
        { parameters, security, serviceId: 'default' }
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
function GetApiVersion(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = 'v12.0';
    /* return */ break FN_BODY;
  }
  return __outcome;
}
