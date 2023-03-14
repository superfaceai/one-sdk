// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'GetProfiles':
      mapFn = GetProfiles;
      break;
    case 'GetProfilesByUsername':
      mapFn = GetProfilesByUsername;
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

function GetProfiles(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        profiles: (() => {
          with (vars) {
            return [
              {
                description:
                  'NASA Mars rover. Launch: July 30, 2020. Landing: Feb. 18, 2021. Hobbies: Photography, collecting rocks, off-roading. 🚀 Team HQ @NASAJPL',
                followersCount: 2909944,
                followingCount: 58,
                id: '1232783237623119872',
                imageUrl:
                  'https://pbs.twimg.com/profile_images/1379527227436531712/QasZP9s-_normal.jpg',
                postsCount: 860,
                profileUrl: 'https://twitter.com/NASAPersevere',
                username: 'NASAPersevere',
                website: 'https://t.co/GpTOmL7zGl',
              },
            ];
          }
        })(),
      },
      {
        rateLimit: (() => {
          with (vars) {
            return {
              bucket: 'User lookup',
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
function GetProfilesByUsername(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        profiles: (() => {
          with (vars) {
            return [
              {
                description:
                  'NASA Mars rover. Launch: July 30, 2020. Landing: Feb. 18, 2021. Hobbies: Photography, collecting rocks, off-roading. 🚀 Team HQ @NASAJPL',
                followersCount: 2909944,
                followingCount: 58,
                id: '1232783237623119872',
                imageUrl:
                  'https://pbs.twimg.com/profile_images/1379527227436531712/QasZP9s-_normal.jpg',
                postsCount: 860,
                profileUrl: 'https://twitter.com/NASAPersevere',
                username: 'NASAPersevere',
                website: 'https://t.co/GpTOmL7zGl',
              },
            ];
          }
        })(),
      },
      {
        rateLimit: (() => {
          with (vars) {
            return {
              bucket: 'User lookup',
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
