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
    if (
      (() => {
        with (vars) {
          return !Array.isArray(input.media) || input.media.length !== 1;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Invalid media' },
        { detail: 'You must provide exactly one media item for Pinterest.' }
      );
      /* return */ break FN_BODY;
    }
    vars = Object.assign(vars, {
      origMedia: (() => {
        with (vars) {
          return input.media;
        }
      })(),
    });
    vars = Object.assign(vars, {
      media: (() => {
        with (vars) {
          return origMedia[0];
        }
      })(),
    });
    vars = Object.assign(vars, {
      mediaSource: (() => {
        with (vars) {
          return {};
        }
      })(),
    });
    vars = Object.assign(vars, {
      mediaSource: (() => {
        with (vars) {
          return {
            source_type: 'image_base64',
            data: Buffer.isBuffer(media.contents)
              ? media.contents.toString('base64')
              : media.contents,
            content_type: undefined,
          };
        }
      })(),
    });
    vars = Object.assign(vars, { mediaSource: { content_type: 'image/jpeg' } });
    vars = Object.assign(vars, { mediaSource: { content_type: 'image/png' } });
    vars = Object.assign(vars, {
      mediaSource: (() => {
        with (vars) {
          return {
            source_type: 'image_url',
            url: media.url,
          };
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return !mediaSource.url && !mediaSource.content_type;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Unknown or unsupported media contents type' },
        { detail: 'Only PNG or JPG images are supported.' }
      );
      /* return */ break FN_BODY;
    }
    {
      const url = std.unstable.resolveRequestUrl(`/v5/pins`, {
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
          authorization: (() => {
            with (vars) {
              return 'Bearer ' + parameters.accessToken;
            }
          })(),
        }
      );
      requestOptions.body = Object.assign(
        {},
        {
          board_id: (() => {
            with (vars) {
              return input.profileId;
            }
          })(),
        },
        {
          link: (() => {
            with (vars) {
              return input.link;
            }
          })(),
        },
        {
          description: (() => {
            with (vars) {
              return input.text;
            }
          })(),
        },
        {
          title: (() => {
            with (vars) {
              return input.title;
            }
          })(),
        },
        {
          alt_text: (() => {
            with (vars) {
              return media.altText;
            }
          })(),
        },
        {
          media_source: (() => {
            with (vars) {
              return mediaSource;
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
          __outcome.data = Object.assign(
            {},
            {
              postId: (() => {
                with (vars) {
                  return body.id;
                }
              })(),
            },
            {
              url: (() => {
                with (vars) {
                  return `https://www.pinterest.com/pin/${body.id}/`;
                }
              })(),
            }
          );
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
                  return body.message;
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
                  return body.message;
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
                  return body.message;
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
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 404 "application/json" "*" */
        if (
          response.status === 404 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Not found' },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 429 "application/json" "*" */
        if (
          response.status === 429 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Too Many Requests' },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response * "*" "*" */
        const statusCode = response.status;
        const headers = response.headers;
        const body = response.bodyAuto();
        __outcome.error = Object.assign(
          {},
          { title: 'Unexpected error' },
          {
            detail: (() => {
              with (vars) {
                return body.message;
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
