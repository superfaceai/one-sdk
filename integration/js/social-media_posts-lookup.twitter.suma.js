// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'FindByHashtag':
      mapFn = FindByHashtag;
      break;
    case 'FindByMention':
      mapFn = FindByMention;
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

function FindByHashtag(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      rateLimitBucket: (() => {
        const acc = [];
        {
          const outcome = GetSearchRecentTweetsBucket(
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
      const url = std.unstable.resolveRequestUrl(`/2/tweets/search/recent`, {
        parameters,
        security,
        serviceId: 'default',
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
          authorization: (() => {
            with (vars) {
              return 'Bearer ' + parameters.accessToken;
            }
          })(),
        }
      );
      requestOptions.query = Object.assign(
        {},
        {
          query: (() => {
            with (vars) {
              return '#' + input.hashtag;
            }
          })(),
        },
        { 'tweet.fields': 'id,text,created_at,attachments,referenced_tweets' },
        { expansions: 'attachments.media_keys,author_id' },
        {
          'media.fields':
            'duration_ms,height,media_key,preview_image_url,type,url,width,alt_text',
        },
        { 'user.fields': 'id,username,public_metrics' },
        {
          start_time: (() => {
            with (vars) {
              return input.afterDate;
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
        { max_results: 100 }
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
            result: (() => {
              const acc = [];
              {
                const outcome = MapSearchResult(
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
                      headers: (() => {
                        with (vars) {
                          return headers;
                        }
                      })(),
                    },
                    {
                      rateLimitBucket: (() => {
                        with (vars) {
                          return rateLimitBucket;
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
                  },
                  {
                    headers: (() => {
                      with (vars) {
                        return headers;
                      }
                    })(),
                  },
                  {
                    rateLimitBucket: (() => {
                      with (vars) {
                        return rateLimitBucket;
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
function FindByMention(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      rateLimitBucket: (() => {
        const acc = [];
        {
          const outcome = GetUserMentionTimelineBucket(
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
        `/2/users/${input.profileId}/mentions`,
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
        { 'tweet.fields': 'id,text,created_at,attachments,referenced_tweets' },
        { expansions: 'attachments.media_keys,author_id' },
        {
          'media.fields':
            'duration_ms,height,media_key,preview_image_url,type,url,width,alt_text',
        },
        { 'user.fields': 'id,username,public_metrics' },
        {
          start_time: (() => {
            with (vars) {
              return input.afterDate;
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
        { max_results: 100 }
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
            result: (() => {
              const acc = [];
              {
                const outcome = MapSearchResult(
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
                      headers: (() => {
                        with (vars) {
                          return headers;
                        }
                      })(),
                    },
                    {
                      rateLimitBucket: (() => {
                        with (vars) {
                          return rateLimitBucket;
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
                  },
                  {
                    headers: (() => {
                      with (vars) {
                        return headers;
                      }
                    })(),
                  },
                  {
                    rateLimitBucket: (() => {
                      with (vars) {
                        return rateLimitBucket;
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
function MapSearchResult(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      body: (() => {
        with (vars) {
          return args.body;
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

            //get authors hashmap
            const authorsHashmap = {};
            if (body.includes.users) {
              for (const user of body.includes.users) {
                authorsHashmap[user.id] = user;
              }
            }

            //map tweets to posts
            const posts = body.data.map(tweet => {
              let mappedAuthor;
              let replyReference;
              let replyId;
              let attachments = [];

              //get author
              const author = authorsHashmap[tweet.author_id];
              if (author) {
                const metrics = author.public_metrics || {};
                mappedAuthor = {
                  id: author.id,
                  username: author.username,
                  followersCount: metrics.followers_count,
                  followingCount: metrics.following_count,
                  postsCount: metrics.tweet_count,
                };
              }

              //get reply id
              if (tweet.referenced_tweets) {
                replyReference = tweet.referenced_tweets.find(
                  referencedTweet => referencedTweet.type === 'replied_to'
                );
              }

              if (replyReference !== undefined) {
                replyId = replyReference.id;
              }

              //get attachments
              if (tweet.attachments && tweet.attachments.media_keys) {
                attachments = tweet.attachments.media_keys.map(mediaKey => {
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
                });
              }

              return {
                id: tweet.id,
                url: 'https://twitter.com/i/status/' + tweet.id,
                createdAt: tweet.created_at,
                text: tweet.text,
                // FIXME: Remove replyId in next major version
                replyId: replyId,
                parentId: replyId,
                author: mappedAuthor,
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
                },
                {
                  bucket: (() => {
                    with (vars) {
                      return args.rateLimitBucket;
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
      {
        bucket: (() => {
          with (vars) {
            return args.bucket;
          }
        })(),
      },
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
    vars = Object.assign(vars, {
      headers: (() => {
        with (vars) {
          return args.headers;
        }
      })(),
    });
    vars = Object.assign(vars, {
      rateLimitBucket: (() => {
        with (vars) {
          return args.rateLimitBucket;
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
                    return headers;
                  }
                })(),
              },
              {
                bucket: (() => {
                  with (vars) {
                    return rateLimitBucket;
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
              return twitterError.detail;
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
              return twitterError.detail;
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
              return twitterError.detail;
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
              return twitterError.detail;
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
        {
          detail: (() => {
            with (vars) {
              return `Twitter API resource '${rateLimit.bucket}' reached max requests quota.`;
            }
          })(),
        },
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
            return `Unknown error occurred. Status: ${statusCode}`;
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
function GetSearchRecentTweetsBucket(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = 'Search recent tweets';
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function GetUserMentionTimelineBucket(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = 'User mention timeline';
    /* return */ break FN_BODY;
  }
  return __outcome;
}
