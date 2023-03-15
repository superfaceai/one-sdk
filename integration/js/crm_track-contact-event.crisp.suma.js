// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'TrackContactEvent':
      mapFn = TrackContactEvent;
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

function TrackContactEvent(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(
        `/v1/website/${parameters.WEBSITE_ID}/people/events/${input.contactId}`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign({}, { 'X-Crisp-Tier': 'plugin' });
      requestOptions.headers['content-type'] = ['application/json'];
      requestOptions.body = (() => {
        with (vars) {
          return {
            text: input.eventName,
            data: { ...input.eventProperties },
          };
        }
      })();
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
          if (
            (() => {
              with (vars) {
                return body.reason === 'added';
              }
            })()
          ) {
            __outcome.data = Object.assign(
              {},
              {
                contactId: (() => {
                  with (vars) {
                    return input.contactId;
                  }
                })(),
              }
            );
            /* return */ break FN_BODY;
          }
          __outcome.error = Object.assign(
            {},
            { title: 'Unexpected error' },
            {
              detail: (() => {
                with (vars) {
                  return `Crisp responsed with: ${JSON.stringify(body)}`;
                }
              })(),
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 400 "*" "*" */
        if (response.status === 400) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Invalid data' },
            {
              detail:
                'Invalid data was sent to Crisp server. Hint: Crisp only accepts flat object for event properties',
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 401 "*" "*" */
        if (response.status === 401) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Unauthenticated' },
            {
              detail:
                "Please make sure you're providing a valid Crisp API credentials",
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 402 "*" "*" */
        if (response.status === 402) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Crisp subscription upgrade required' }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 403 "*" "*" */
        if (response.status === 403) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign({}, { title: 'Not allowed' });
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 404 "*" "*" */
        if (response.status === 404) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Not found' },
            {
              detail:
                'Contact or website was not found or Crisp plugin is not subscribed. Make sure the Crisp website exists and uses your plugin',
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 423 "*" "*" */
        if (response.status === 423) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Quota limit exceeded' },
            {
              detail:
                'Wait until the limit is reset or send requests less frequently.',
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 429 "*" "*" */
        if (response.status === 429) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Rate limit exceeded' },
            {
              detail:
                'Wait until the limit is reset or send requests less frequently.',
            }
          );
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 500 "*" "*" */
        if (response.status === 500) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: "Error on Crisp's side" },
            {
              detail:
                "It looks like Crisp is temporarily having difficulties processing your request. Please try again or contact Crisp's support",
            }
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
