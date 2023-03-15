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
      videos: (() => {
        with (vars) {
          return input.videos || [];
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
    if (
      (() => {
        with (vars) {
          return !profileId;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'profileId field is missing' },
        {
          detail:
            'Missing or invalid profileId, either page or group ID is expected',
        }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return (
            media.length === 0 &&
            videos.length === 0 &&
            !input.text &&
            !input.link
          );
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Missing text, link or videos' },
        { detail: 'Either text, link or videos fields must be non-empty' }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return videos.length > 1;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Too many videos' },
        {
          detail:
            'Facebook only supports one video per post, please publish multiple posts instead.',
        }
      );
      /* return */ break FN_BODY;
    }
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
    vars = Object.assign(vars, {
      token: (() => {
        with (vars) {
          return parameters.accessToken;
        }
      })(),
    });
    {
      if (
        (() => {
          with (vars) {
            return videos.length > 0;
          }
        })()
      ) {
        const outcome = PublishVideo(
          Object.assign(
            {},
            {
              video: (() => {
                with (vars) {
                  return videos[0];
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
              pageAccessToken: (() => {
                with (vars) {
                  return token;
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
        }
        if (
          (() => {
            with (vars) {
              return outcome.data;
            }
          })()
        ) {
          __outcome.data = Object.assign(
            {},
            {
              postId: (() => {
                with (vars) {
                  return outcome.data.postId;
                }
              })(),
            },
            {
              url: (() => {
                with (vars) {
                  return outcome.data.link;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
        }
      }
    }
    {
      if (
        (() => {
          with (vars) {
            return media.length > 0;
          }
        })()
      ) {
        const outcome = PublishPhotoPost(
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
              pageAccessToken: (() => {
                with (vars) {
                  return token;
                }
              })(),
            },
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
        }
        if (
          (() => {
            with (vars) {
              return outcome.data;
            }
          })()
        ) {
          __outcome.data = Object.assign(
            {},
            {
              postId: (() => {
                with (vars) {
                  return outcome.data.postId;
                }
              })(),
            },
            {
              url: (() => {
                with (vars) {
                  return outcome.data.link;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
        }
      }
    }
    {
      const outcome = PublishTextPost(
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
            pageAccessToken: (() => {
              with (vars) {
                return token;
              }
            })(),
          },
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
      }
      if (
        (() => {
          with (vars) {
            return outcome.data;
          }
        })()
      ) {
        __outcome.data = Object.assign(
          {},
          {
            postId: (() => {
              with (vars) {
                return outcome.data.postId;
              }
            })(),
          },
          {
            url: (() => {
              with (vars) {
                return outcome.data.link;
              }
            })(),
          }
        );
        /* return */ break FN_BODY;
      }
    }
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
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
function PublishTextPost(args, parameters, security) {
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
        `/${vars.apiVersion}/${args.pageId}/feed`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.query = Object.assign(
        {},
        {
          access_token: (() => {
            with (vars) {
              return args.pageAccessToken;
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
          message: (() => {
            with (vars) {
              return input.text;
            }
          })(),
        },
        { fields: 'id,permalink_url' }
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
              postId: (() => {
                with (vars) {
                  return body.id;
                }
              })(),
            },
            {
              link: (() => {
                with (vars) {
                  return body.permalink_url;
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
function PublishPhotoPost(args, parameters, security) {
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
      photos: (() => {
        const acc = [];
        {
          for (const photo of (() => {
            with (vars) {
              return input.media;
            }
          })()) {
            const outcome = PublishPhoto(
              Object.assign(
                {},
                {
                  pageAccessToken: (() => {
                    with (vars) {
                      return args.pageAccessToken;
                    }
                  })(),
                },
                {
                  pageId: (() => {
                    with (vars) {
                      return args.pageId;
                    }
                  })(),
                },
                {
                  photo: (() => {
                    with (vars) {
                      return photo;
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
      attachedMedia: (() => {
        with (vars) {
          return photos.map(id => {
            // poor man's JSON encoding
            return `{"media_fbid":"${id}"}`;
          });
        }
      })(),
    });
    vars = Object.assign(vars, {
      message: (() => {
        with (vars) {
          return `${input.text || ''} ${input.link || ''}`.trim();
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/${vars.apiVersion}/${args.pageId}/feed`,
        { parameters, security, serviceId: undefined }
      );
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
          access_token: (() => {
            with (vars) {
              return args.pageAccessToken;
            }
          })(),
        },
        {
          message: (() => {
            with (vars) {
              return message;
            }
          })(),
        },
        {
          attached_media: (() => {
            with (vars) {
              return attachedMedia;
            }
          })(),
        },
        { fields: 'id,permalink_url' }
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
              postId: (() => {
                with (vars) {
                  return body.id;
                }
              })(),
            },
            {
              link: (() => {
                with (vars) {
                  return body.permalink_url;
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
function PublishPhoto(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
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
      photo: (() => {
        with (vars) {
          return args.photo;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/${vars.apiVersion}/${args.pageId}/photos`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.query = Object.assign(
        {},
        {
          access_token: (() => {
            with (vars) {
              return args.pageAccessToken;
            }
          })(),
        },
        { published: 'false' },
        {
          url: (() => {
            with (vars) {
              return photo.url;
            }
          })(),
        },
        {
          alt_text_custom: (() => {
            with (vars) {
              return photo.altText;
            }
          })(),
        },
        { fields: 'id' }
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
function PublishVideo(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
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
    {
      const url = std.unstable.resolveRequestUrl(
        `/${vars.apiVersion}/${args.video}`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.query = Object.assign(
        {},
        {
          access_token: (() => {
            with (vars) {
              return args.pageAccessToken;
            }
          })(),
        },
        { published: true },
        {
          description: (() => {
            with (vars) {
              return args.description;
            }
          })(),
        },
        { fields: 'id,permalink_url' }
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
              postId: (() => {
                with (vars) {
                  return body.id;
                }
              })(),
            },
            {
              link: (() => {
                with (vars) {
                  return body.permalink_url;
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
      subcode: (() => {
        with (vars) {
          return body.error.code;
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
function GetApiVersion(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = 'v12.0';
    /* return */ break FN_BODY;
  }
  return __outcome;
}
