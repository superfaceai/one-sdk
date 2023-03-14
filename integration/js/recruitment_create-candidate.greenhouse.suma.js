// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'CreateCandidate':
      mapFn = CreateCandidate;
      break;
    case 'CreateCandidateFeatures':
      mapFn = CreateCandidateFeatures;
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

function CreateCandidate(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const outcome = MapInputToAttachments(
        Object.assign(
          {},
          {
            cv: (() => {
              with (vars) {
                return input.cv;
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
        attachments: (() => {
          with (vars) {
            return outcome.data.attachments;
          }
        })(),
      });
    }
    {
      const url = std.unstable.resolveRequestUrl(`/v1/candidates`, {
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
          'On-Behalf-Of': (() => {
            with (vars) {
              return parameters.ON_BEHALF_OF;
            }
          })(),
        }
      );
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.body = Object.assign(
        {},
        {
          first_name: (() => {
            with (vars) {
              return input.firstName;
            }
          })(),
        },
        {
          last_name: (() => {
            with (vars) {
              return input.lastName;
            }
          })(),
        },
        {
          email_addresses: (() => {
            with (vars) {
              return [
                {
                  type: 'work',
                  value: input.email,
                },
              ];
            }
          })(),
        },
        {
          website_addresses: (() => {
            with (vars) {
              return (input.links || []).map(link => {
                return {
                  value: link.url,
                  type: 'other',
                };
              });
            }
          })(),
        },
        {
          phone_numbers: (() => {
            with (vars) {
              return input.phone
                ? [
                    {
                      type: 'work',
                      value: input.phone,
                    },
                  ]
                : [];
            }
          })(),
        },
        {
          addresses: (() => {
            with (vars) {
              return input.address
                ? [
                    {
                      type: 'work',
                      value: input.address,
                    },
                  ]
                : [];
            }
          })(),
        },
        {
          employments: (() => {
            with (vars) {
              return (input.workExperience || []).map(experience => {
                return {
                  company_name: experience.company,
                  title: experience.position,
                  start_date: experience.startedAt,
                  end_date: experience.endedAt,
                };
              });
            }
          })(),
        },
        {
          applications: (() => {
            with (vars) {
              return [
                {
                  job_id: input.jobId,
                  initial_stage_id: input.stageId,
                  attachments: attachments,
                },
              ];
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
              id: (() => {
                with (vars) {
                  return String(body.id);
                }
              })(),
            },
            {
              jobId: (() => {
                with (vars) {
                  return input.jobId;
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
            { code: 'Unauthenticated' }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 422 "application/json" "*" */
        if (
          response.status === 422 &&
          response.headers['content-type']?.some(
            ct => ct.indexOf('application/json') >= 0
          )
        ) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Unprocessable Entity' },
            {
              detail: (() => {
                with (vars) {
                  return body;
                }
              })(),
            },
            { code: 'BadRequest' }
          );
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
function CreateCandidateFeatures(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      supportedMimeTypes: (() => {
        const acc = [];
        {
          const outcome = getSupportedMimeTypes(
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
    __outcome.data = Object.assign(
      {},
      {
        cvMIMETypes: (() => {
          const acc = [];
          {
            const outcome = getSupportedMimeTypes(
              Object.assign({}),
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
      },
      {
        cvUploadMethods: (() => {
          with (vars) {
            return ['url', 'file'];
          }
        })(),
      }
    );
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function getSupportedMimeTypes(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = (() => {
      with (vars) {
        return [
          'application/atom+xml',
          'application/javascript',
          'application/json',
          'application/msgpack',
          'application/msword',
          'application/pdf',
          'application/rss+xml',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint',
          'application/xml',
          'application/x-www-form-urlencoded',
          'application/x-yaml',
          'application/zip',
          'multipart/form-data',
          'image/bmp',
          'image/gif',
          'image/jpeg',
          'image/png',
          'image/tiff',
          'text/calendar',
          'text/css',
          'text/csv',
          'text/html',
          'text/javascript',
          'text/plain',
          'text/vcard',
          'video/mpeg',
        ];
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapInputToAttachments(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    if (
      (() => {
        with (vars) {
          return args.cv && args.cv.url;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        {
          attachments: (() => {
            with (vars) {
              return [
                {
                  type: 'resume',
                  filename: args.cv.fileName,
                  url: args.cv.url,
                  content_type: args.cv.mimeType,
                },
              ];
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return args.cv && (args.cv.data || args.cv.url) && !args.cv.fileName;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Missing CV file name' },
        { detail: 'CV file name is required.' },
        { code: 'CVFileNameRequired' }
      );
      /* return */ break FN_BODY;
    }
    if (
      (() => {
        with (vars) {
          return args.cv && args.cv.data && !args.cv.mimeType;
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'Missing mimeType' },
        { detail: 'CV mime type is required.' },
        { code: 'CVMIMETypeNotSupported' }
      );
      /* return */ break FN_BODY;
    }
    vars = Object.assign(vars, {
      supportedMimeTypes: (() => {
        const acc = [];
        {
          const outcome = getSupportedMimeTypes(
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
    if (
      (() => {
        with (vars) {
          return (
            args.cv &&
            args.cv.data &&
            !supportedMimeTypes.includes(args.cv.mimeType)
          );
        }
      })()
    ) {
      __outcome.error = Object.assign(
        {},
        { title: 'CV MIME type not supported' },
        {
          detail: (() => {
            with (vars) {
              return `File type ${args.cv.mimeType} is not supported by Greenhouse.`;
            }
          })(),
        },
        { code: 'CVMIMETypeNotSupported' }
      );
      /* return */ break FN_BODY;
    }
    vars = Object.assign(vars, {
      cvDataBuffer: (() => {
        with (vars) {
          return args.cv.data.getAllData();
        }
      })(),
    });
    if (
      (() => {
        with (vars) {
          return args.cv && args.cv.data;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        {
          attachments: (() => {
            with (vars) {
              return [
                {
                  type: 'resume',
                  content: cvDataBuffer.toString('base64'),
                  filename: args.cv.fileName,
                  content_type: args.cv.mimeType,
                },
              ];
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
    __outcome.data = Object.assign(
      {},
      {
        attachments: (() => {
          with (vars) {
            return [];
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
