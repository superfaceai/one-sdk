// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetMessages':
      mapFn = GetMessages;
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

function GetMessages(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      destination: (() => {
        with (vars) {
          return input.destination;
        }
      })(),
    });
    vars = Object.assign(vars, {
      afterId: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      beforeId: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    vars = Object.assign(vars, {
      afterId: (() => {
        const acc = [];
        {
          const outcome = GetSnowflake(
            Object.assign(
              {},
              {
                ts: (() => {
                  with (vars) {
                    return input.afterTimestamp;
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
    vars = Object.assign(vars, {
      beforeId: (() => {
        const acc = [];
        {
          const outcome = GetSnowflake(
            Object.assign(
              {},
              {
                ts: (() => {
                  with (vars) {
                    return input.beforeTimestamp;
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
    {
      const url = std.unstable.resolveRequestUrl(
        `/channels/${vars.destination}/messages`,
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
          Authorization: (() => {
            with (vars) {
              return `Bot ${parameters.accessToken}`;
            }
          })(),
        }
      );
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.query = Object.assign(
        {},
        {
          after: (() => {
            with (vars) {
              return afterId;
            }
          })(),
        },
        {
          before: (() => {
            with (vars) {
              return input.page || beforeId;
            }
          })(),
        },
        {
          limit: (() => {
            with (vars) {
              return input.limit;
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
            messages: (() => {
              const acc = [];
              {
                const outcome = MapMessages(
                  Object.assign(
                    {},
                    {
                      messages: (() => {
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
          vars = Object.assign(vars, {
            rateLimit: (() => {
              const acc = [];
              {
                const outcome = MapRateLimitDetails(
                  Object.assign(
                    {},
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
          if (
            (() => {
              with (vars) {
                return messages.length < input.limit || messages.length === 0;
              }
            })()
          ) {
            __outcome.data = Object.assign(
              {},
              {
                messages: (() => {
                  with (vars) {
                    return messages;
                  }
                })(),
              },
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
          vars = Object.assign(vars, {
            lastMessage: (() => {
              with (vars) {
                return messages[messages.length - 1];
              }
            })(),
          });
          __outcome.data = Object.assign(
            {},
            {
              nextPage: (() => {
                with (vars) {
                  return lastMessage.id;
                }
              })(),
            },
            {
              messages: (() => {
                with (vars) {
                  return messages;
                }
              })(),
            },
            {
              rateLimit: (() => {
                with (vars) {
                  return rateLimit;
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
              const outcome = MapDiscordError(
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
function MapMessages(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      messages: (() => {
        with (vars) {
          return args.messages.map(message => {
            const resultMessage = {
              id: message.id,
              author: {
                id: message.author.id,
                username: message.author.username,
              },
              createdAt: Date.parse(message.timestamp),
              text: message.content,
            };

            let reactions = [],
              attachments = [];

            if (message.edited_timestamp) {
              resultMessage.updatedAt = Date.parse(message.edited_timestamp);
            }

            if (message.thread) {
              resultMessage.hasThread = true;
              resultMessage.threadId = message.thread.id;
            }

            if (message.reactions && message.reactions.length > 0) {
              reactions = message.reactions.map(reaction => ({
                emoji: reaction.emoji.name,
                count: reaction.count,
              }));

              resultMessage.reactions = reactions;
            }

            if (message.attachments && message.attachments.length > 0) {
              /**
               * Returns UNIX timestamp in milliseconds from specified discord snowflake id
               * More about snowflakes: https://discord.com/developers/docs/reference#snowflakes
               */
              const discordEpoch = 1420070400000;
              const getTimestamp = snowflake =>
                Number(BigInt(snowflake) >> BigInt(22)) + discordEpoch;

              attachments = message.attachments.map(attachment => {
                const createdAt = getTimestamp(attachment.id);
                const resultAttachment = {
                  id: attachment.id,
                  createdAt: createdAt,
                  fileName: attachment.filename,
                  url: attachment.url,
                };

                if (attachment.content_type) {
                  resultAttachment.mediaType = attachment.content_type;
                }

                return resultAttachment;
              });

              resultMessage.attachments = attachments;
            }

            if (
              message.message_reference &&
              message.message_reference.message_id
            ) {
              resultMessage.parentId = message.message_reference.message_id;
            }

            // TODO: implement composing URL
            // BLOCKER: unknown guild id
            // Format of public URL:          https://discord.com/channels/<guild-id>/<channel-id>/<message-id>
            // Format of URL poiting to API:  https://discord.com/api/channels/<channel-id>/messages/<message-id>

            return resultMessage;
          });
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return messages;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapRateLimitDetails(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      headers: (() => {
        with (vars) {
          return args.headers;
        }
      })(),
    });
    vars = Object.assign(vars, {
      details: (() => {
        with (vars) {
          return {};
        }
      })(),
    });
    vars = Object.assign(vars, {
      bucket: (() => {
        with (vars) {
          return headers['x-ratelimit-bucket'];
        }
      })(),
    });
    vars = Object.assign(vars, {
      totalRequests: (() => {
        with (vars) {
          return parseInt(headers['x-ratelimit-limit']);
        }
      })(),
    });
    vars = Object.assign(vars, {
      remainingRequests: (() => {
        with (vars) {
          return parseInt(headers['x-ratelimit-remaining']);
        }
      })(),
    });
    vars = Object.assign(vars, {
      resetTimestamp: (() => {
        with (vars) {
          return parseFloat(headers['x-ratelimit-reset']);
        }
      })(),
    });
    vars = Object.assign(vars, {
      resetAfter: (() => {
        with (vars) {
          return parseInt(headers['x-ratelimit-reset-after']);
        }
      })(),
    });
    vars = Object.assign(vars, {
      retryAfter: (() => {
        with (vars) {
          return parseInt(headers['Retry-After']);
        }
      })(),
    });
    vars = Object.assign(vars, {
      details: {
        bucket: (() => {
          with (vars) {
            return bucket;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      details: {
        totalRequests: (() => {
          with (vars) {
            return totalRequests;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      details: {
        remainingRequests: (() => {
          with (vars) {
            return remainingRequests;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      details: {
        resetAfter: (() => {
          with (vars) {
            return resetAfter;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      details: {
        resetTimestamp: (() => {
          with (vars) {
            return resetTimestamp * 1000;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      details: {
        retryAfter: (() => {
          with (vars) {
            return retryAfter;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      details: {
        remainingRequestsPercentage: (() => {
          with (vars) {
            return (details.remainingRequests / details.totalRequests) * 100;
          }
        })(),
      },
    });
    vars = Object.assign(vars, {
      details: (() => {
        with (vars) {
          return undefined;
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return details;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function GetSnowflake(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, { discordEpoch: 1420070400000 });
    vars = Object.assign(vars, {
      timestamp: (() => {
        with (vars) {
          return args.ts;
        }
      })(),
    });
    vars = Object.assign(vars, {
      processedDate: (() => {
        with (vars) {
          return timestamp - discordEpoch;
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return (BigInt(processedDate) << BigInt(22)).toString();
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapDiscordError(args, parameters, security) {
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
      discordError: (() => {
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
      rateLimit: (() => {
        const acc = [];
        {
          const outcome = MapRateLimitDetails(
            Object.assign(
              {},
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
            throw new Error(`Unexpected inline call failure: ${outcome.error}`);
          } else {
            acc.push(outcome.data);
          }
        }
        return acc[0];
      })(),
    });
    vars = Object.assign(vars, {
      detail: (() => {
        with (vars) {
          return discordError.message;
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
              return discordError;
            }
          })(),
        },
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
        { title: 'Unauthorized' },
        {
          detail: (() => {
            with (vars) {
              return detail;
            }
          })(),
        },
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
        { title: 'Forbidden' },
        {
          detail: (() => {
            with (vars) {
              return detail;
            }
          })(),
        },
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
              return detail;
            }
          })(),
        },
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
          return statusCode === 405;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Method not allowed' },
        {
          detail: (() => {
            with (vars) {
              return detail;
            }
          })(),
        },
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
        { title: 'Too Many Requests' },
        {
          detail: (() => {
            with (vars) {
              return `${detail} Retry after ${discordError.retry_after} seconds`;
            }
          })(),
        },
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
          return statusCode === 502;
        }
      })()
    ) {
      __outcome.data = Object.assign(
        {},
        { title: 'Bad gateway' },
        {
          detail: (() => {
            with (vars) {
              return detail;
            }
          })(),
        },
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
            return `Unknown error occurred. Status: ${statusCode}. Message: ${detail}.`;
          }
        })(),
      },
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
