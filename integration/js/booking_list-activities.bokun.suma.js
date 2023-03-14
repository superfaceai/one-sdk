// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'ListActivities':
      mapFn = ListActivities;
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

function ListActivities(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, { LIMIT: 25 });
    {
      const url = std.unstable.resolveRequestUrl(`/api/graphql`, {
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
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.body = Object.assign(
        {},
        {
          query:
            '\n          query Experiences($nextPage: String, $limit: Int!) {\n            experiences(after: $nextPage, first: $limit) {\n              edges {\n                node {\n                  id\n                  name\n                  briefDescription\n                  description\n                  categories\n                  keywords\n                  themes\n                  images {\n                    caption\n                    originalUrl\n                    thumbnailUrl\n                    previewUrl\n                  }\n                  videos {\n                    name\n                    sourceUrl\n                    thumbnailUrl\n                    previewUrl\n                  }\n                }\n              }\n              pageInfo {\n                endCursor\n                hasPreviousPage\n              }\n              totalCount\n            }\n          }\n        ',
        },
        {
          variables: (() => {
            with (vars) {
              return {
                nextPage: input.page,
                limit: LIMIT,
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
            unauthorized_error: (() => {
              with (vars) {
                return (() => {
                  let err = (body.errors || []).find(
                    err =>
                      err.extensions &&
                      err.extensions.classification &&
                      err.extensions.classification === 'UnauthorizedError'
                  );
                  if (err) {
                    return err.message;
                  }
                })();
              }
            })(),
          });
          if (
            (() => {
              with (vars) {
                return unauthorized_error;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Unauthorized Error' },
              {
                detail: (() => {
                  with (vars) {
                    return unauthorized_error;
                  }
                })(),
              }
            );
            /* return */ break FN_BODY;
          }
          if (
            (() => {
              with (vars) {
                return body.errors;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Unknown error' },
              {
                detail: (() => {
                  with (vars) {
                    return JSON.stringify(body.errors, 2);
                  }
                })(),
              }
            );
            /* return */ break FN_BODY;
          }
          __outcome.data = Object.assign(
            {},
            {
              activities: (() => {
                with (vars) {
                  return body.data.experiences.edges.map(edge => {
                    const activity = edge.node;
                    return {
                      id: activity.id,
                      name: activity.name,
                      description: activity.description,
                      shortDescription: activity.briefDescription,
                      images: activity.images.map(image => {
                        return {
                          url: image.originalUrl,
                          thumbnailUrl: image.previewUrl || image.thumbnailUrl,
                          caption: image.caption,
                        };
                      }),
                      videos: activity.videos.map(video => {
                        return {
                          url: video.sourceUrl,
                          thumbnailUrl: video.previewUrl || video.thumbnailUrl,
                          caption: video.name,
                        };
                      }),
                      tags: [].concat(
                        activity.categories,
                        activity.themes,
                        activity.keywords
                      ),
                      customFields: [],
                    };
                  });
                }
              })(),
            },
            {
              nextPage: (() => {
                with (vars) {
                  return body.data.experiences.pageInfo.endCursor;
                }
              })(),
            },
            {
              total: (() => {
                with (vars) {
                  return body.data.experiences.totalCount;
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
