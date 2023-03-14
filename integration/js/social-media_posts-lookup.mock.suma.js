// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'FindByHashtag':
      mapFn = FindByHashtag;
      break;
    case 'FindByMention':
      mapFn = FindByMention;
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

function FindByHashtag(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        posts: (() => {
          with (vars) {
            return [
              {
                id: '110658944785122_122332100284473',
                createdAt: '2022-01-07T15:43:27+0000',
                text: 'Post with attachments and #hashtag',
                url: 'https://www.facebook.com/sftest7904/photos/a.121467247037625/122332100284473/?type=3',
                author: {
                  id: '1466796521412771840',
                  username: 'superface_test',
                  followersCount: 42,
                  followingCount: 3,
                  postsCount: 321,
                },
                attachments: [
                  {
                    title: 'Photos on timeline',
                    type: 'photo',
                    url: 'https://www.facebook.com/sftest7904/photos/a.121467247037625/122332100284473/?type=3',
                  },
                ],
              },
              {
                id: '110658944785122_125744069943276',
                createdAt: '2022-01-20T12:15:45+0000',
                text: 'Simple text post wiht #hashtag.',
                url: 'https://www.facebook.com/110658944785122/posts/125744069943276/',
                author: {
                  id: '1466796521412771840',
                  username: 'superface_test',
                },
                attachments: [],
              },
            ];
          }
        })(),
      },
      {
        nextPage:
          'next:QVFIUjc2Y01oQ3F1bHk5WHNzNVVuS2ZAMSEtpdkxmbC1FV09XcGNmTUc4ZAkhrMlBPU19LYkM0dFY4RjZAKY3pYU1VMNll5Y24zcGhWS2pIUUVlSFBuTFI4X3haVmQ2amxtTU83R3JMRDJFd1hhUWJ0RWxfZAjN2ZAE51b2FBckhtZAG04SDN3',
      },
      {
        rateLimit: (() => {
          with (vars) {
            return {
              bucket: 'Search Recent Posts',
              totalRequests: 180,
              remainingRequests: 179,
              remainingRequestsPercentage: 99.4,
              resetTimestamp: 1643792793,
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
function FindByMention(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        posts: (() => {
          with (vars) {
            return [
              {
                id: '110658944785122_125744069943276',
                createdAt: '2022-01-20T12:15:45+0000',
                text: 'Post with mention',
                url: 'https://www.facebook.com/110658944785122/posts/125744069943276/',
                author: {
                  id: '1466796521412771840',
                  username: 'superface_test',
                  followersCount: 42,
                  followingCount: 3,
                  postsCount: 321,
                },
                replyId: '110658944785122_125744069943276',
                parentId: '110658944785122_125744069943276',
                attachments: [],
              },
            ];
          }
        })(),
      },
      {
        rateLimit: (() => {
          with (vars) {
            return {
              bucket: 'User mention timeline',
              remainingRequests: 179,
              remainingRequestsPercentage: 99.4,
              resetTimestamp: 1643792796,
              totalRequests: 180,
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
