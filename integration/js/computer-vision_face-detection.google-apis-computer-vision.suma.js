// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'FaceDetection':
      mapFn = FaceDetection;
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

function FaceDetection(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const url = std.unstable.resolveRequestUrl(`/v1/images:annotate`, {
        parameters,
        security,
        serviceId: undefined,
      });
      const requestOptions = {
        method: 'POST',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.headers = Object.assign(
        {},
        { 'Content-Type': 'application/json' }
      );
      requestOptions.body = Object.assign(
        {},
        {
          requests: (() => {
            with (vars) {
              return [
                {
                  features: [
                    {
                      maxResults: 1,
                      type: 'FACE_DETECTION',
                    },
                  ],
                  image: {
                    source: {
                      imageUri: input.imageUrl,
                    },
                  },
                },
              ];
            }
          })(),
        }
      );
      const response = std.unstable.fetch(url, requestOptions).response();
      HTTP_RESPONSE: {
        /* response * "*" "*" */
        const statusCode = response.status;
        const headers = response.headers;
        const body = response.bodyAuto();
        if (
          (() => {
            with (vars) {
              return body.responses.length === 1 && body.responses[0].error;
            }
          })()
        ) {
          __outcome.error = Object.assign(
            {},
            {
              code: (() => {
                with (vars) {
                  return body.responses[0].error.code;
                }
              })(),
            },
            {
              message: (() => {
                with (vars) {
                  return body.responses[0].error.message;
                }
              })(),
            }
          );
          /* return */ break FN_BODY;
        }
        __outcome.data = (() => {
          with (vars) {
            return body.responses.map(res => {
              return {
                faces: res.faceAnnotations.map(faceAnnotation => {
                  const resolveLikelihood = value => {
                    if (value === 'VERY_UNLIKELY') {
                      return 'veryUnlikely';
                    }

                    if (value === 'UNLIKELY') {
                      return 'unlikely';
                    }

                    if (value === 'POSSIBLE') {
                      return 'possible';
                    }

                    if (value === 'LIKELY') {
                      return 'likely';
                    }

                    if (value === 'VERY_LIKELY') {
                      return 'verylikely';
                    }

                    return 'unknown';
                  };

                  return {
                    faceRectangle: {
                      bottomLeft: {
                        x: faceAnnotation.boundingPoly.vertices[0].x,
                        y: faceAnnotation.boundingPoly.vertices[0].y,
                      },
                      bottomRight: {
                        x: faceAnnotation.boundingPoly.vertices[1].x,
                        y: faceAnnotation.boundingPoly.vertices[1].y,
                      },
                      topRight: {
                        x: faceAnnotation.boundingPoly.vertices[2].x,
                        y: faceAnnotation.boundingPoly.vertices[2].y,
                      },
                      topLeft: {
                        x: faceAnnotation.boundingPoly.vertices[3].x,
                        y: faceAnnotation.boundingPoly.vertices[3].y,
                      },
                    },
                    landmarks: faceAnnotation.landmarks
                      .map(landmark => {
                        //Left eyebrow
                        if (landmark.type === 'LEFT_OF_LEFT_EYEBROW') {
                          return {
                            kind: 'eyebrowLeftOuter',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        if (landmark.type === 'RIGHT_OF_LEFT_EYEBROW') {
                          return {
                            kind: 'eyebrowLeftInner',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        //Right eyebrow
                        if (landmark.type === 'RIGHT_OF_RIGHT_EYEBROW') {
                          return {
                            kind: 'eyebrowRightOuter',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        if (landmark.type === 'LEFT_OF_RIGHTT_EYEBROW') {
                          return {
                            kind: 'eyebrowRightInner',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        //Mouth
                        if (landmark.type === 'MOUTH_LEFT') {
                          return {
                            kind: 'mouthLeft',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        if (landmark.type === 'MOUTH_RIGHT') {
                          return {
                            kind: 'mouthRight',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        //Nose
                        if (landmark.type === 'NOSE_BOTTOM_LEFT') {
                          return {
                            kind: 'noseRootLeft',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        if (landmark.type === 'NOSE_BOTTOM_RIGHT') {
                          return {
                            kind: 'noseRootRight',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        if (landmark.type === 'NOSE_TIP') {
                          return {
                            kind: 'noseTip',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        //Left eye
                        if (landmark.type === 'LEFT_EYE') {
                          return {
                            kind: 'leftPupil',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        if (landmark.type === 'LEFT_EYE_TOP_BOUNDARY') {
                          return {
                            kind: 'eyeLeftTop',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        if (landmark.type === 'LEFT_EYE_RIGHT_CORNER') {
                          return {
                            kind: 'eyeLeftInner',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        if (landmark.type === 'LEFT_EYE_LEFT_CORNER') {
                          return {
                            kind: 'eyeLeftOuter',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        if (landmark.type === 'LEFT_EYE_BOTTOM_BOUNDARY') {
                          return {
                            kind: 'eyeLeftBottom',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        //Right eye
                        if (landmark.type === 'RIGHT_EYE') {
                          return {
                            kind: 'rightPupil',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        if (landmark.type === 'RIGHT_EYE_TOP_BOUNDARY') {
                          return {
                            kind: 'eyeRightTop',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        if (landmark.type === 'RIGHT_EYE_LEFT_CORNER') {
                          return {
                            kind: 'eyeRightInner',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        if (landmark.type === 'RIGHT_EYE_RIGHT_CORNER') {
                          return {
                            kind: 'eyeRightOuter',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                        if (landmark.type === 'RIGHT_EYE_BOTTOM_BOUNDARY') {
                          return {
                            kind: 'eyeRightBottom',
                            x: landmark.position.x,
                            y: landmark.position.y,
                          };
                        }
                      })
                      .filter(landmark => landmark !== undefined),

                    emotions: {
                      happiness: resolveLikelihood(
                        faceAnnotation.joyLikelihood
                      ),
                      anger: resolveLikelihood(faceAnnotation.angerLikelihood),
                      sadness: resolveLikelihood(
                        faceAnnotation.sorrowLikelihood
                      ),
                      surprise: resolveLikelihood(
                        faceAnnotation.surpriseLikelihood
                      ),
                    },
                  };
                }),
              };
            });
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
