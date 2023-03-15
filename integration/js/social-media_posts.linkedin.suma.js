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
    vars = Object.assign(vars, { count: 10 });
    vars = Object.assign(vars, {
      inputPage: (() => {
        with (vars) {
          return parseInt(input.page, 10);
        }
      })(),
    });
    vars = Object.assign(vars, {
      start: (() => {
        with (vars) {
          return isNaN(inputPage) ? 0 : inputPage;
        }
      })(),
    });
    vars = Object.assign(vars, {
      imagesToResolve: (() => {
        with (vars) {
          return {};
        }
      })(),
    });
    vars = Object.assign(vars, {
      videosToResolve: (() => {
        with (vars) {
          return {};
        }
      })(),
    });
    vars = Object.assign(vars, {
      result: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      queryParams: (() => {
        with (vars) {
          return `?q=author&author=${encodeURIComponent(
            input.profileId
          )}&count=${count}&start=${start}`;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/rest/posts${vars.queryParams}`,
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
        { 'X-Restli-Protocol-Version': '2.0.0' },
        { 'LinkedIn-Version': '202302' },
        {
          Authorization: (() => {
            with (vars) {
              return `Bearer ${parameters.accessToken}`;
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
            paging: (() => {
              with (vars) {
                return body.paging;
              }
            })(),
          });
          vars = Object.assign(vars, {
            previousPage: (() => {
              with (vars) {
                return paging.start > 0
                  ? `${Math.max(0, paging.start - paging.count)}`
                  : undefined;
              }
            })(),
          });
          vars = Object.assign(vars, {
            nextPage: (() => {
              with (vars) {
                return paging.start + paging.count < paging.total
                  ? `${paging.start + paging.count}`
                  : undefined;
              }
            })(),
          });
          vars = Object.assign(vars, {
            posts: (() => {
              with (vars) {
                return body.elements.map(element => {
                  const attachments = [];
                  if (element.content) {
                    const c = element.content;
                    if (c.article) {
                      // https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/advertising-targeting/version/article-ads-integrations?view=li-lms-2023-02&tabs=http
                      attachments.push({
                        type: 'link',
                        url: c.article.source,
                        title: c.article.title,
                        description: c.article.description,
                        // TODO preview: c.article.thumbnail -> need to fetch its URL
                      });
                    }
                    if (c.media) {
                      // https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/posts-api?view=li-lms-2023-02&tabs=http#media
                      // TODO: fetch URLs
                      const id = c.media.id;
                      let attachmentType = undefined;
                      // urn:li:image:C4E10AQGEOVxaD7kt6Q or urn:li:video:C5610AQES9koZnXb88Q
                      if (id.includes(':video:')) {
                        if (videosToResolve[id]) {
                          videosToResolve[id];
                        } else {
                          const a = {
                            type: 'video',
                            title: c.media.title,
                            altText: c.media.altText,
                          };
                          attachments.push(a);
                          videosToResolve[id] = a;
                        }
                      } else if (id.includes(':image:')) {
                        // Keep the same reference
                        if (imagesToResolve[id]) {
                          attachments.push(imagesToResolve[id]);
                        } else {
                          const a = {
                            type: 'image',
                            altText: c.media.altText,
                          };
                          attachments.push(a);
                          imagesToResolve[id] = a;
                        }
                      }
                    }
                    if (c.multiImage) {
                      // https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/multiimage-post-api?view=li-lms-2023-02&tabs=http
                      c.multiImage.images.forEach(img => {
                        if (imagesToResolve[img.id]) {
                          attachments.push(imagesToResolve[img.id]);
                        } else {
                          const a = {
                            type: 'image',
                            altText: img.altText,
                          };
                          attachments.push(a);
                          imagesToResolve[img.id] = a;
                        }
                      });
                    }
                    // FIXME: polls, carousels
                  }

                  const post = {
                    id: element.id,
                    text: element.commentary || '',
                    createdAt: std.unstable.time.unixTimestampToIsoDate(
                      element.publishedAt || element.createdAt
                    ),
                    lastModifiedAt: std.unstable.time.unixTimestampToIsoDate(
                      element.lastModifiedAt
                    ),
                    url: `https://www.linkedin.com/feed/update/${element.id}`,
                    attachments: attachments,
                  };
                  return post;
                });
              }
            })(),
          });
          vars = Object.assign(vars, {
            result: (() => {
              with (vars) {
                return {
                  nextPage: nextPage,
                  previousPage: previousPage,
                  posts: posts,
                };
              }
            })(),
          });
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
            {
              title: (() => {
                with (vars) {
                  return body.code || 'Bad Request';
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
            {
              title: (() => {
                with (vars) {
                  return body.code || 'Unauthorized';
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
            {
              title: (() => {
                with (vars) {
                  return body.code || 'Forbidden';
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
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
            {
              title: (() => {
                with (vars) {
                  return body.code || 'Resource Not Found';
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
    vars = Object.assign(vars, {
      imagesIds: (() => {
        with (vars) {
          return Object.keys(imagesToResolve);
        }
      })(),
    });
    vars = Object.assign(vars, {
      videoIds: (() => {
        with (vars) {
          return Object.keys(videosToResolve);
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return imagesIds.length === 0 && videoIds.length === 0;
        }
      })()
    ) {
      __outcome.data = (() => {
        with (vars) {
          return result;
        }
      })();
      /* return */ break FN_BODY;
    }
    {
      if (
        (() => {
          with (vars) {
            return imagesIds.length > 0;
          }
        })()
      ) {
        const outcome = ResolveMedia(
          Object.assign(
            {},
            { type: 'images' },
            {
              accessToken: (() => {
                with (vars) {
                  return parameters.accessToken;
                }
              })(),
            },
            {
              mediaIds: (() => {
                with (vars) {
                  return imagesIds;
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
          __outcome.data = (() => {
            with (vars) {
              return result;
            }
          })();
          /* return */ break FN_BODY;
        }
        vars = Object.assign(vars, {
          dummy: (() => {
            with (vars) {
              return Object.entries(outcome.data).forEach(([id, img]) => {
                if (!img.downloadUrl) {
                  return;
                }
                imagesToResolve[id].url = img.downloadUrl;
              });
            }
          })(),
        });
      }
    }
    {
      if (
        (() => {
          with (vars) {
            return videoIds.length > 0;
          }
        })()
      ) {
        const outcome = ResolveMedia(
          Object.assign(
            {},
            { type: 'videos' },
            {
              accessToken: (() => {
                with (vars) {
                  return parameters.accessToken;
                }
              })(),
            },
            {
              mediaIds: (() => {
                with (vars) {
                  return videoIds;
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
          __outcome.data = (() => {
            with (vars) {
              return result;
            }
          })();
          /* return */ break FN_BODY;
        }
        vars = Object.assign(vars, {
          dummy: (() => {
            with (vars) {
              return Object.entries(outcome.data).forEach(([id, vid]) => {
                if (!vid.downloadUrl) {
                  return;
                }
                const attachment = videosToResolve[id];
                attachment.url = vid.downloadUrl;
                attachment.preview = vid.thumbnail;
                attachment.duration = vid.duration;
              });
            }
          })(),
        });
      }
    }
    __outcome.data = (() => {
      with (vars) {
        return result;
      }
    })();
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function ResolveMedia(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      queryParams: (() => {
        with (vars) {
          return `?ids=List(${args.mediaIds
            .map(encodeURIComponent)
            .join(',')})`;
        }
      })(),
    });
    vars = Object.assign(vars, {
      pathName: (() => {
        with (vars) {
          return args.type === 'videos' ? 'rest/videos' : 'rest/images';
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/${vars.pathName}${vars.queryParams}`,
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
        { 'X-Restli-Protocol-Version': '2.0.0' },
        { 'LinkedIn-Version': '202302' },
        {
          Authorization: (() => {
            with (vars) {
              return `Bearer ${args.accessToken}`;
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
              return body.results;
            }
          })();
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
            {
              title: (() => {
                with (vars) {
                  return body.code || 'Bad Request';
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
            {
              title: (() => {
                with (vars) {
                  return body.code || 'Unauthorized';
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
            {
              title: (() => {
                with (vars) {
                  return body.code || 'Forbidden';
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
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
            {
              title: (() => {
                with (vars) {
                  return body.code || 'Resource Not Found';
                }
              })(),
            },
            {
              detail: (() => {
                with (vars) {
                  return body.message;
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
  return __outcome;
}
