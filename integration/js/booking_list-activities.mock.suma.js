// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'ListActivities':
      mapFn = ListActivities;
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

function ListActivities(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    __outcome.data = Object.assign(
      {},
      {
        activities: (() => {
          with (vars) {
            return [
              {
                id: 'ACT-1',
                name: 'Fly to the moon!',
                description:
                  'Take a flight to outer space and experience the beauty of the moon from a different perspective.',
                shortDescription:
                  'Experience the beauty of the moon from a different perspective.',
                images: [
                  {
                    url: 'https://example.com/moon.jpg',
                    thumbnailUrl: 'https://example.com/moon-thumb.jpg',
                    caption: 'A flight to the moon.',
                  },
                ],
                videos: [
                  {
                    url: 'https://example.com/moon-vid.mp4',
                    thumbnailUrl: 'https://example.com/moon-vid-thumb.jpg',
                    caption: 'A video of a flight to the moon.',
                  },
                ],
                tags: ['SPACE', 'TRAVEL'],
                customFields: [],
              },
              {
                id: 'ACT-2',
                name: 'Wine Tasting',
                description:
                  'Experience the best of local wineries and sample five of the finest wines from the region.',
                shortDescription:
                  'Sample five of the finest wines from the region.',
                images: [
                  {
                    url: 'https://example.com/wine-tasting.jpg',
                    thumbnailUrl: 'https://example.com/wine-tasting-thumb.jpg',
                    caption: 'A wine tasting experience at a local winery.',
                  },
                ],
                videos: [
                  {
                    url: 'https://example.com/wine-tasting-vid.mp4',
                    thumbnailUrl:
                      'https://example.com/wine-tasting-vid-thumb.jpg',
                    caption:
                      'A video of a wine tasting experience at a local winery.',
                  },
                ],
                tags: ['WINE', 'FOOD'],
                customFields: [
                  {
                    key: 'DURATION_HR',
                    value: 3.5,
                  },
                  {
                    key: 'PREREQUISITES',
                    value: 'Participants must be over 18 years old.',
                  },
                ],
              },
              {
                id: 'ACT-3',
                name: 'Surfing Lesson',
                description:
                  'Learn to surf with an experienced instructor, who will show you the basics of this popular beach sport.',
                shortDescription:
                  'Learn to surf with an experienced instructor.',
                images: [
                  {
                    url: 'https://example.com/surfing-lesson.jpg',
                    thumbnailUrl:
                      'https://example.com/surfing-lesson-thumb.jpg',
                    caption: 'A surfing lesson on the beach.',
                  },
                ],
                videos: [
                  {
                    url: 'https://example.com/surfing-lesson-vid.mp4',
                    thumbnailUrl:
                      'https://example.com/surfing-lesson-vid-thumb.jpg',
                    caption: 'A video of a surfing lesson on the beach.',
                  },
                ],
                tags: ['SPORT', 'SURFING', 'BEACH'],
                customFields: [
                  {
                    key: 'DURATION_HR',
                    value: 6.0,
                  },
                ],
              },
            ];
          }
        })(),
      },
      { total: 3 }
    );
    /* return */ break FN_BODY;
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
