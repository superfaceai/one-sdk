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
    __outcome.data = Object.assign(
      {},
      {
        posts: (() => {
          with (vars) {
            return [
              {
                id: '110658944785122_122332100284473',
                createdAt: '2022-01-07T15:43:27+0000',
                text: 'Post with attachments',
                url: 'https://www.facebook.com/sftest7904/photos/a.121467247037625/122332100284473/?type=3',
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
                text: 'Simple text post.',
                url: 'https://www.facebook.com/110658944785122/posts/125744069943276/',
                attachments: [],
              },
            ];
          }
        })(),
      },
      {
        nextPage:
          'next:QVFIUjc2Y01oQ3F1bHk5WHNzNVVuS2ZAMSEtpdkxmbC1FV09XcGNmTUc4ZAkhrMlBPU19LYkM0dFY4RjZAKY3pYU1VMNll5Y24zcGhWS2pIUUVlSFBuTFI4X3haVmQ2amxtTU83R3JMRDJFd1hhUWJ0RWxfZAjN2ZAE51b2FBckhtZAG04SDN3',
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
