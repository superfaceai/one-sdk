// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'PublishPost':
      mapFn = PublishPost;
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

function PublishPost(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, { apiVersion: 'v14.0' });
    vars = Object.assign(vars, {
      businessAccountId: (() => {
        with (vars) {
          return input.profileId;
        }
      })(),
    });
    vars = Object.assign(vars, {
      authorizationHeaderValue: (() => {
        with (vars) {
          return 'Bearer ' + parameters.accessToken;
        }
      })(),
    });
    vars = Object.assign(vars, {
      text: (() => {
        with (vars) {
          return input.text;
        }
      })(),
    });
    vars = Object.assign(vars, {
      media: (() => {
        with (vars) {
          return input.media || [];
        }
      })(),
    });
    vars = Object.assign(vars, {
      videos: (() => {
        with (vars) {
          return input.videos || [];
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return (media.length === 0 || !media[0].url) && videos.length === 0;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Media url required' },
        { detail: 'You must provide one media with URL for Instagram provider' }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return media.length > 10;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Too many media items' },
        {
          detail:
            'Only up to 10 media items can be published with Instagram provider',
        }
      );
      /* return */ break FN_BODY;
    }
    vars = Object.assign(vars, { isCarousel: false });
    vars = Object.assign(vars, { isCarousel: true });
    vars = Object.assign(vars, {
      mediaIds: (() => {
        with (vars) {
          return [];
        }
      })(),
    });
    {
      for (const item of (() => {
        with (vars) {
          return media;
        }
      })()) {
        const outcome = UploadMedia(
          Object.assign(
            {},
            {
              businessAccountId: (() => {
                with (vars) {
                  return businessAccountId;
                }
              })(),
            },
            {
              item: (() => {
                with (vars) {
                  return item;
                }
              })(),
            },
            {
              isCarousel: (() => {
                with (vars) {
                  return isCarousel;
                }
              })(),
            },
            {
              caption: (() => {
                with (vars) {
                  return text;
                }
              })(),
            },
            {
              authorization: (() => {
                with (vars) {
                  return authorizationHeaderValue;
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
          mediaIds: (() => {
            with (vars) {
              return [...mediaIds, outcome.data];
            }
          })(),
        });
      }
    }
    vars = Object.assign(vars, {
      mediaIds: (() => {
        with (vars) {
          return [...mediaIds, ...videos];
        }
      })(),
    });
    vars = Object.assign(vars, {
      containerId: (() => {
        const acc = [];
        {
          if (
            (() => {
              with (vars) {
                return isCarousel;
              }
            })()
          ) {
            const outcome = UploadMedia(
              Object.assign(
                {},
                {
                  businessAccountId: (() => {
                    with (vars) {
                      return businessAccountId;
                    }
                  })(),
                },
                {
                  children: (() => {
                    with (vars) {
                      return mediaIds;
                    }
                  })(),
                },
                {
                  caption: (() => {
                    with (vars) {
                      return text;
                    }
                  })(),
                },
                {
                  authorization: (() => {
                    with (vars) {
                      return authorizationHeaderValue;
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
    vars = Object.assign(vars, {
      containerId: (() => {
        with (vars) {
          return mediaIds[0];
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/${vars.apiVersion}/${vars.businessAccountId}/media_publish`,
        { parameters, security, serviceId: undefined }
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
          authorization: (() => {
            with (vars) {
              return authorizationHeaderValue;
            }
          })(),
        }
      );
      requestOptions.query = Object.assign(
        {},
        {
          creation_id: (() => {
            with (vars) {
              return containerId;
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
            postId: (() => {
              with (vars) {
                return body.id;
              }
            })(),
          });
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
    {
      const url = std.unstable.resolveRequestUrl(
        `/${vars.apiVersion}/${vars.postId}`,
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
          authorization: (() => {
            with (vars) {
              return authorizationHeaderValue;
            }
          })(),
        }
      );
      requestOptions.query = Object.assign({}, { fields: 'permalink' });
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
              postId: (() => {
                with (vars) {
                  return postId;
                }
              })(),
            },
            {
              url: (() => {
                with (vars) {
                  return body.permalink;
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
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function MapApiError(args, parameters, security) {
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
      headers: (() => {
        with (vars) {
          return args.headers;
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
    vars = Object.assign(vars, {
      errorCode: (() => {
        with (vars) {
          return body.error.code;
        }
      })(),
    });
    vars = Object.assign(vars, {
      subcode: (() => {
        with (vars) {
          return body.error.error_subcode;
        }
      })(),
    });
    vars = Object.assign(vars, {
      title: (() => {
        with (vars) {
          return (
            body.error.error_user_title ||
            body.error.type ||
            body.error.message ||
            'Unknown error'
          );
        }
      })(),
    });
    vars = Object.assign(vars, {
      detail: (() => {
        with (vars) {
          return body.error.error_user_msg || body.error.message || undefined;
        }
      })(),
    });
    __outcome.data = Object.assign(
      {},
      {
        title: (() => {
          with (vars) {
            return title;
          }
        })(),
      },
      {
        detail: (() => {
          with (vars) {
            return detail;
          }
        })(),
      },
      {
        original: (() => {
          with (vars) {
            return body.error || body;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function UploadMedia(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, { apiVersion: 'v14.0' });
    vars = Object.assign(vars, {
      businessAccountId: (() => {
        with (vars) {
          return args.businessAccountId;
        }
      })(),
    });
    vars = Object.assign(vars, {
      itemUrl: (() => {
        with (vars) {
          return args.item ? args.item.url : undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      isCarousel: (() => {
        with (vars) {
          return args.isCarousel || undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      children: (() => {
        with (vars) {
          return args.children ? JSON.stringify(args.children) : undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      caption: (() => {
        with (vars) {
          return isCarousel ? undefined : args.caption;
        }
      })(),
    });
    vars = Object.assign(vars, {
      mediaType: (() => {
        with (vars) {
          return children ? 'CAROUSEL' : undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      authorizationHeaderValue: (() => {
        with (vars) {
          return args.authorization;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/${vars.apiVersion}/${vars.businessAccountId}/media`,
        { parameters, security, serviceId: undefined }
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
          authorization: (() => {
            with (vars) {
              return authorizationHeaderValue;
            }
          })(),
        }
      );
      requestOptions.query = Object.assign(
        {},
        {
          image_url: (() => {
            with (vars) {
              return itemUrl;
            }
          })(),
        },
        {
          caption: (() => {
            with (vars) {
              return caption;
            }
          })(),
        },
        {
          is_carousel_item: (() => {
            with (vars) {
              return isCarousel;
            }
          })(),
        },
        {
          media_type: (() => {
            with (vars) {
              return mediaType;
            }
          })(),
        },
        {
          children: (() => {
            with (vars) {
              return children;
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
          __outcome.data = (() => {
            with (vars) {
              return body.id;
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
