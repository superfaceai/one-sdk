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
    {
      const url = std.unstable.resolveRequestUrl(
        `/2/users/${input.profileId}/tweets`,
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
          authorization: (() => {
            with (vars) {
              return 'Bearer ' + parameters.accessToken;
            }
          })(),
        }
      );
      requestOptions.query = Object.assign(
        {},
        { 'tweet.fields': 'id,text,created_at,attachments' },
        { expansions: 'attachments.media_keys' },
        {
          'media.fields':
            'duration_ms,height,media_key,preview_image_url,type,url,width,alt_text',
        },
        {
          start_time: (() => {
            with (vars) {
              return input.afterDate;
            }
          })(),
        },
        {
          end_time: (() => {
            with (vars) {
              return input.beforeDate;
            }
          })(),
        },
        {
          pagination_token: (() => {
            with (vars) {
              return input.page;
            }
          })(),
        },
        { max_results: 25 }
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
              with (vars) {
                return [];
              }
            })(),
          });
          vars = Object.assign(vars, {
            posts: (() => {
              with (vars) {
                return [body].map(body => {
                  //get media hashmap
                  const mediaHashmap = {};
                  if (body.includes.media) {
                    for (const media of body.includes.media) {
                      mediaHashmap[media.media_key] = media;
                    }
                  }

                  //map tweets to posts
                  const posts = body.data.map(tweet => {
                    let attachments = [];

                    if (tweet.attachments && tweet.attachments.media_keys) {
                      attachments = tweet.attachments.media_keys.map(
                        mediaKey => {
                          let result = undefined;

                          let foundMedia = mediaHashmap[mediaKey];

                          let duration = undefined;

                          if (foundMedia && foundMedia.duration_ms) {
                            duration = foundMedia.duration_ms / 1000;
                          }

                          return (
                            foundMedia && {
                              type: foundMedia.type,
                              url: foundMedia.url,
                              height: foundMedia.height,
                              width: foundMedia.width,
                              preview: foundMedia.preview_image_url,
                              altText: foundMedia.alt_text,
                              duration: duration,
                            }
                          );
                        }
                      );
                    }

                    return {
                      id: tweet.id,
                      url: 'https://twitter.com/i/status/' + tweet.id,
                      createdAt: tweet.created_at,
                      text: tweet.text,
                      attachments: attachments.filter(
                        attachment => attachment !== undefined
                      ),
                    };
                  });
                  return posts;
                })[0];
              }
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              posts: (() => {
                with (vars) {
                  return posts;
                }
              })(),
            },
            {
              previousPage: (() => {
                with (vars) {
                  return body.meta.previous_token;
                }
              })(),
            },
            {
              nextPage: (() => {
                with (vars) {
                  return body.meta.next_token;
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
              const outcome = MapTwitterError(
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
function MapTwitterError(args, parameters, security) {
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
      twitterError: (() => {
        with (vars) {
          return args.error;
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
        { title: 'Bad request' },
        {
          detail: (() => {
            with (vars) {
              return twitterError.detail;
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
              return twitterError.detail;
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
              return twitterError.detail;
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
              return twitterError.detail;
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
        {
          detail: (() => {
            with (vars) {
              return `Twitter API reached max requests quota.`;
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
            return `Unknown error occurred. Status: ${statusCode}`;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
