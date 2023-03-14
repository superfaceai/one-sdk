// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetFollowers':
      mapFn = GetFollowers;
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

function GetFollowers(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        followers: (() => {
          with (vars) {
            return [
              {
                id: '1466796521412771840',
                username: 'superface_test',
                imageUrl:
                  'https://pbs.twimg.com/profile_images/1478302204306067462/5BEbrnPO_normal.jpg',
                followersCount: 42,
                followingCount: 3,
                postsCount: 321,
              },
            ];
          }
        })(),
      },
      {
        nextPage:
          'QVFIUjc2Y01oQ3F1bHk5WHNzNVVuS2ZAMSEtpdkxmbC1FV09XcGNmTUc4ZAkhrMlBPU19LYkM0dFY4',
      },
      {
        rateLimit: (() => {
          with (vars) {
            return {
              bucket: 'Follows lookup',
              totalRequests: 15,
              remainingRequests: 12,
              remainingRequestsPercentage: 80,
              resetTimestamp: 1643713585,
            };
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
