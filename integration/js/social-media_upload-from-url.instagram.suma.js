// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'RegisterUpload':
      mapFn = RegisterUpload;
      break;
    case 'GetUploadState':
      mapFn = GetUploadState;
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

function RegisterUpload(input, parameters, security) {
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
      item: (() => {
        with (vars) {
          return {
            url: input.url,
          };
        }
      })(),
    });
    vars = Object.assign(vars, {
      caption: (() => {
        with (vars) {
          return input.caption;
        }
      })(),
    });
    {
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
            caption: (() => {
              with (vars) {
                return caption;
              }
            })(),
          },
          {
            uploadType: (() => {
              with (vars) {
                return input.uploadType;
              }
            })(),
          },
          {
            shortFormVideo: (() => {
              with (vars) {
                return input.shortFormVideo;
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
            return !outcome.error;
          }
        })()
      ) {
        __outcome.data = Object.assign(
          {},
          {
            uploadId: (() => {
              with (vars) {
                return outcome.data;
              }
            })(),
          }
        );
        /* return */ break FN_BODY;
      }
      __outcome.error = (() => {
        with (vars) {
          return outcome.error;
        }
      })();
      /* return */ break FN_BODY;
    }
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function GetUploadState(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      uploadId: (() => {
        with (vars) {
          return input.uploadId;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/${vars.uploadId}`, {
        parameters,
        security,
        serviceId: undefined,
      });
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.query = Object.assign(
        {},
        { fields: 'status,status_code' },
        {
          access_token: (() => {
            with (vars) {
              return parameters.accessToken;
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
            state: (() => {
              with (vars) {
                return (() => {
                  switch (body.status_code) {
                    case 'EXPIRED':
                      return 'expired';
                    case 'ERROR':
                      return 'error';
                    case 'FINISHED':
                      return 'finished';
                    case 'IN_PROGRESS':
                      return 'inProgress';
                    case 'PUBLISHED':
                      return 'published';
                    default:
                      return null;
                  }
                })();
              }
            })(),
          });
          if (
            (() => {
              with (vars) {
                return state === null;
              }
            })()
          ) {
            __outcome.error = Object.assign(
              {},
              { title: 'Unknown asset state!' },
              {
                detail: (() => {
                  with (vars) {
                    return (
                      "Unknown asset state '" +
                      body.status_code +
                      "'. This is probably a bug in the map."
                    );
                  }
                })(),
              },
              { code: 'UnknownError' }
            );
          }
          __outcome.data = Object.assign(
            {},
            {
              state: (() => {
                with (vars) {
                  return state;
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
      caption: (() => {
        with (vars) {
          return args.caption;
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
    vars = Object.assign(vars, {
      uploadType: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, { uploadType: 'VIDEO' });
    vars = Object.assign(vars, { uploadType: 'REELS' });
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
          video_url: (() => {
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
          media_type: (() => {
            with (vars) {
              return uploadType;
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
