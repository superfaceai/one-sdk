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
    vars = Object.assign(vars, {
      content: (() => {
        with (vars) {
          return input.link
            ? {
                article: {
                  source: input.link,
                  title: input.title || input.link,
                },
              }
            : undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      media: (() => {
        with (vars) {
          return Array.isArray(input.media) ? input.media : [];
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
      images: (() => {
        const acc = [];
        {
          for (const index of (() => {
            with (vars) {
              return Array(media.length)
                .fill()
                .map((_, i) => i);
            }
          })()) {
            const outcome = UploadImage(
              Object.assign(
                {},
                {
                  media: (() => {
                    with (vars) {
                      return input.media;
                    }
                  })(),
                },
                {
                  index: (() => {
                    with (vars) {
                      return index;
                    }
                  })(),
                },
                {
                  accessToken: (() => {
                    with (vars) {
                      return parameters.accessToken;
                    }
                  })(),
                },
                {
                  profileId: (() => {
                    with (vars) {
                      return input.profileId;
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
      text: (() => {
        with (vars) {
          return input.link ? `${text || ''} ${input.link}`.trim() : text;
        }
      })(),
    });
    vars = Object.assign(vars, {
      content: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      content: (() => {
        with (vars) {
          return { media: images[0] };
        }
      })(),
    });
    vars = Object.assign(vars, {
      content: (() => {
        with (vars) {
          return {
            multiImage: {
              images: images,
            },
          };
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/rest/posts`, {
        parameters,
        security,
        serviceId: 'default',
      });
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
              return `Bearer ${parameters.accessToken}`;
            }
          })(),
        },
        { 'LinkedIn-Version': '202302' },
        { 'X-Restli-Protocol-Version': '2.0.0' },
        { Accept: 'application/json' }
      );
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.body = Object.assign(
        {},
        {
          author: (() => {
            with (vars) {
              return input.profileId;
            }
          })(),
        },
        {
          commentary: (() => {
            with (vars) {
              return text || '';
            }
          })(),
        },
        { visibility: 'PUBLIC' },
        { lifecycleState: 'PUBLISHED' },
        {
          distribution: (() => {
            with (vars) {
              return {
                feedDistribution: 'MAIN_FEED',
                targetEntities: [],
                thirdPartyDistributionChannels: [],
              };
            }
          })(),
        },
        {
          content: (() => {
            with (vars) {
              return content;
            }
          })(),
        }
      );
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 201 "application/json" "*" */
        if (
          response.status === 201 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          vars = Object.assign(vars, {
            urn: (() => {
              with (vars) {
                return headers['x-restli-id'];
              }
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              postId: (() => {
                with (vars) {
                  return urn;
                }
              })(),
            },
            {
              url: (() => {
                with (vars) {
                  return `https://www.linkedin.com/feed/update/${urn}`;
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
              const outcome = MapError(
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
function UploadImage(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      mediaItem: (() => {
        with (vars) {
          return args.media[args.index];
        }
      })(),
    });
    vars = Object.assign(vars, {
      uploadPath: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      assetUrn: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/rest/images`, {
        parameters,
        security,
        serviceId: 'default',
      });
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign(
        {},
        { 'X-RestLi-Protocol-Version': '2.0.0' },
        {
          Authorization: (() => {
            with (vars) {
              return `Bearer ${args.accessToken}`;
            }
          })(),
        },
        { 'LinkedIn-Version': '202302' },
        { Accept: 'application/json' }
      );
      requestOptions.query = Object.assign({}, { action: 'initializeUpload' });
      requestOptions.body = Object.assign(
        {},
        {
          initializeUploadRequest: (() => {
            with (vars) {
              return {
                owner: args.profileId,
              };
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
            uploadPath: (() => {
              with (vars) {
                return body.value.uploadUrl.replace(
                  'https://www.linkedin.com/',
                  ''
                );
              }
            })(),
          });
          vars = Object.assign(vars, {
            assetUrn: (() => {
              with (vars) {
                return body.value.image;
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
              const outcome = MapError(
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
      const url = std.unstable.resolveRequestUrl(`/${vars.uploadPath}`, {
        parameters,
        security,
        serviceId: 'www',
      });
      const requestOptions = {
        method: 'PUT',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign(
        {},
        {
          Authorization: (() => {
            with (vars) {
              return `Bearer ${args.accessToken}`;
            }
          })(),
        }
      );
      requestOptions.headers['content-type'] = ['application/octet-stream'];
      requestOptions.body = (() => {
        with (vars) {
          return mediaItem.contents;
        }
      })();
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response 201 "*" "*" */
        if (response.status === 201) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.data = Object.assign(
            {},
            {
              id: (() => {
                with (vars) {
                  return assetUrn;
                }
              })(),
            },
            {
              altText: (() => {
                with (vars) {
                  return mediaItem.altText;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 400 "*" "*" */
        if (response.status === 400) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Bad Request' },
            { detail: 'Media upload resulted in Bad Request error.' }
          );
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 401 "*" "*" */
        if (response.status === 401) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Unauthorized' },
            {
              detail:
                'Media upload resulted in Unauthorized error. The access token is either invalid, or expired.',
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
function MapError(args, parameters, security) {
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
      title: (() => {
        with (vars) {
          return `Unknown response: HTTP ${statusCode}`;
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
      detail: (() => {
        with (vars) {
          return body.message;
        }
      })(),
    });
    vars = Object.assign(vars, { title: 'Bad Request' });
    vars = Object.assign(vars, { title: 'Unauthorized' });
    vars = Object.assign(vars, { title: 'Forbidden' });
    vars = Object.assign(vars, { title: 'Not Found' });
    vars = Object.assign(vars, { title: 'Conflict' });
    vars = Object.assign(vars, { title: 'Too Many Requests' });
    vars = Object.assign(vars, { title: 'Server Error' });
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
            return body;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
