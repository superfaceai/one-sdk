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
    vars = Object.assign(vars, { apiVersion: 'v12.0' });
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
      const url = std.unstable.resolveRequestUrl(
        `/${vars.apiVersion}/${vars.profileId}/media`,
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
        {
          access_token: (() => {
            with (vars) {
              return parameters.accessToken;
            }
          })(),
        },
        { limit: 25 },
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
        {
          fields:
            'id,caption,media_url,timestamp,permalink,video_title,type,media_type',
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
            return post.permalink;
          }
        })(),
      },
      {
        createdAt: (() => {
          with (vars) {
            return post.timestamp;
          }
        })(),
      },
      {
        text: (() => {
          with (vars) {
            return post.caption;
          }
        })(),
      },
      {
        attachments: (() => {
          with (vars) {
            return [
              {
                url: post.media_url,
                title: post.video_title,
                type: post.media_type,
              },
            ];
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
