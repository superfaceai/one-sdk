// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'NearbyPoi':
      mapFn = NearbyPoi;
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

function NearbyPoi(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      categories: (() => {
        with (vars) {
          return input.categories || [];
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(
        `/maps/api/place/nearbysearch/json`,
        { parameters, security, serviceId: 'default' }
      );
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.query = Object.assign(
        {},
        {
          location: (() => {
            with (vars) {
              return `${input.center.latitude},${input.center.longitude}`;
            }
          })(),
        },
        {
          radius: (() => {
            with (vars) {
              return input.radius;
            }
          })(),
        },
        {
          type: (() => {
            const acc = [];
            {
              const outcome = BuildCategoryQueryType(
                Object.assign(
                  {},
                  {
                    categories: (() => {
                      with (vars) {
                        return categories;
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
          if (
            (() => {
              with (vars) {
                return body.status === 'ZERO_RESULTS';
              }
            })()
          ) {
            __outcome.data = (() => {
              with (vars) {
                return [];
              }
            })();
            /* return */ break FN_BODY;
          }
          if (
            (() => {
              with (vars) {
                return body.status !== 'OK';
              }
            })()
          ) {
            __outcome.error = (() => {
              with (vars) {
                return {
                  status: body.status,
                  message: body.error_message
                    ? body.error_message
                    : body.status,
                };
              }
            })();
            /* return */ break FN_BODY;
          }
          vars = Object.assign(vars, {
            points: (() => {
              const acc = [];
              {
                for (const place of (() => {
                  with (vars) {
                    return body.results;
                  }
                })()) {
                  const outcome = ConvertResponse(
                    Object.assign(
                      {},
                      {
                        place: (() => {
                          with (vars) {
                            return place;
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
              }
              return acc;
            })(),
          });
          vars = Object.assign(vars, {
            points: (() => {
              with (vars) {
                return points.filter(p =>
                  p.categories.some(c => categories.includes(c))
                );
              }
            })(),
          });
          __outcome.data = (() => {
            with (vars) {
              return points;
            }
          })();
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
function BuildCategoryQueryType(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    if (
      (() => {
        with (vars) {
          return args.categories.length !== 1;
        }
      })()
    ) {
      __outcome.data = (() => {
        with (vars) {
          return undefined;
        }
      })();
      /* return */ break FN_BODY;
    }
    vars = Object.assign(vars, {
      types: (() => {
        const acc = [];
        {
          const outcome = CategoriesToTypes(
            Object.assign(
              {},
              {
                categories: (() => {
                  with (vars) {
                    return args.categories;
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
    __outcome.data = (() => {
      with (vars) {
        return types[0];
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function ConvertResponse(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      categories: (() => {
        with (vars) {
          return [];
        }
      })(),
    });
    vars = Object.assign(vars, {
      categories: (() => {
        const acc = [];
        {
          const outcome = TypesToCategories(
            Object.assign(
              {},
              {
                types: (() => {
                  with (vars) {
                    return args.place.types;
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
      point: (() => {
        with (vars) {
          return {
            coordinates: {
              latitude: args.place.geometry.location.lat,
              longitude: args.place.geometry.location.lng,
            },
            name: args.place.name || args.place.place_id,
            categories: categories,
          };
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return point;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function CategoriesToTypes(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    if (
      (() => {
        with (vars) {
          return !args.categories;
        }
      })()
    ) {
      __outcome.data = (() => {
        with (vars) {
          return [];
        }
      })();
      /* return */ break FN_BODY;
    }
    vars = Object.assign(vars, {
      categoryTypeMap: (() => {
        with (vars) {
          return {
            RESTAURANT: ['restaurant'],
            CAFE: ['cafe'],
            BAR: ['bar'],
            BANK: ['bank'],
            ATM: ['atm'],
            HEALTHCARE: ['doctor', 'hospital'],
            SCHOOL: [
              'university',
              'primary_school',
              'school',
              'secondary_school',
            ],
            TAXI: ['taxi_stand'],
            POST: ['post_office'],
            POLICE: ['police'],
            PARKING: ['parking'],
          };
        }
      })(),
    });
    vars = Object.assign(vars, {
      amenities: (() => {
        with (vars) {
          return args.categories.flatMap(category => categoryTypeMap[category]);
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return amenities;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function TypesToCategories(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    if (
      (() => {
        with (vars) {
          return !args.types;
        }
      })()
    ) {
      __outcome.data = (() => {
        with (vars) {
          return [];
        }
      })();
      /* return */ break FN_BODY;
    }
    vars = Object.assign(vars, {
      typeCategoryMap: (() => {
        with (vars) {
          return {
            //Restaurant
            restaurant: 'RESTAURANT',
            //Cafe
            cafe: 'CAFE',
            //Bar
            bar: 'BAR',
            //Healthcare
            doctor: 'HEALTHCARE',
            hospital: 'HEALTHCARE',
            //Bank
            bank: 'BANK',
            //ATM
            atm: 'ATM',
            //School
            university: 'SCHOOL',
            primary_school: 'SCHOOL',
            school: 'SCHOOL',
            secondary_school: 'SCHOOL',
            //Taxi
            taxi_stand: 'TAXI',
            //Post
            post_office: 'POST',
            //Police
            police: 'POLICE',
            //Parking
            parking: 'PARKING',
          };
        }
      })(),
    });
    vars = Object.assign(vars, {
      types: (() => {
        with (vars) {
          return (() => {
            const types = [];

            for (const type of args.types) {
              const category = typeCategoryMap[type];
              if (category !== undefined && !types.includes(category)) {
                types.push(category);
              }
            }

            return types;
          })();
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return types;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
