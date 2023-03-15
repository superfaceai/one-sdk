// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'PullRequest':
      mapFn = PullRequest;
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

function PullRequest(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      id: (() => {
        with (vars) {
          return encodeURIComponent(input.owner + '/' + input.repo);
        }
      })(),
    });
    vars = Object.assign(vars, {
      identifier: (() => {
        with (vars) {
          return input.identifier;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/v4/projects/${vars.id}/merge_requests/${vars.identifier}`,
        { parameters, security, serviceId: undefined }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response * "*" "*" */
        const statusCode = response.status;
        const headers = response.headers;
        const body = response.bodyAuto();
        if (
          (() => {
            with (vars) {
              return statusCode === 200;
            }
          })()
        ) {
          __outcome.data = (() => {
            with (vars) {
              return {
                title: body.title,
                id: body.iid,
                url: body.web_url,
                sha: body.sha,
              };
            }
          })();
        }
        if (
          (() => {
            with (vars) {
              return statusCode !== 200;
            }
          })()
        ) {
          __outcome.error = (() => {
            with (vars) {
              return {
                message: body.message,
                statusCode: statusCode,
              };
            }
          })();
        }
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
