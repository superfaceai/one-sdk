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
  __ffi.unstable.printDebug(
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
      center: (() => {
        with (vars) {
          return input.center;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/api/interpreter`, {
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
      requestOptions.headers['content-type'] = [
        'application/x-www-form-urlencoded',
      ];
      requestOptions.body = Object.assign(
        {},
        {
          data: (() => {
            const acc = [];
            {
              const outcome = BuildQuery(
                Object.assign(
                  {},
                  {
                    latitude: (() => {
                      with (vars) {
                        return center.latitude;
                      }
                    })(),
                  },
                  {
                    longitude: (() => {
                      with (vars) {
                        return center.longitude;
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
                    categories: (() => {
                      with (vars) {
                        return input.categories || [];
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
        __ffi.unstable.printDebug(response);
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
                return body.remarks && body.remarks.includes('Query timed out');
              }
            })()
          ) {
            __outcome.error = (() => {
              with (vars) {
                return {
                  status: 'TIMEOUT',
                  message: body.remarks,
                };
              }
            })();
            /* return */ break FN_BODY;
          }
          vars = Object.assign(vars, {
            points: (() => {
              const acc = [];
              {
                for (const node of (() => {
                  with (vars) {
                    return body.elements;
                  }
                })()) {
                  const outcome = ConvertResponse(
                    Object.assign(
                      {},
                      {
                        node: (() => {
                          with (vars) {
                            return node;
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
          __outcome.data = (() => {
            with (vars) {
              return points;
            }
          })();
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 400 "*" "*" */
        if (response.status === 400) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = (() => {
            with (vars) {
              return {
                status: statusCode,
                message: 'Invalid parameters',
              };
            }
          })();
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response * "*" "*" */
        const statusCode = response.status;
        const headers = response.headers;
        const body = response.bodyAuto();
        __outcome.error = (() => {
          with (vars) {
            return {
              status: statusCode,
              message: body,
            };
          }
        })();
        /* return */ break FN_BODY;
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
function BuildQuery(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      amenities: (() => {
        const acc = [];
        {
          const outcome = CategoriesToAmenities(
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
    vars = Object.assign(vars, { amenityFilter: '' });
    vars = Object.assign(vars, {
      amenityFilter: (() => {
        with (vars) {
          return `[amenity~"^(${amenities.join('|')})$"]`;
        }
      })(),
    });
    vars = Object.assign(vars, {
      query: (() => {
        with (vars) {
          return `
    [out:json][timeout:10];
    node(around:${args.radius},${args.latitude},${args.longitude})${amenityFilter};

    out;
  `;
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return query;
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
      nodeTags: (() => {
        with (vars) {
          return args.node.tags || {};
        }
      })(),
    });
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
          const outcome = AmenitiesToCategories(
            Object.assign(
              {},
              {
                amenities: (() => {
                  with (vars) {
                    return [nodeTags.amenity];
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
              latitude: args.node.lat,
              longitude: args.node.lon,
            },
            name: nodeTags.name || args.node.id.toString(),
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
function CategoriesToAmenities(args, parameters, security) {
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
      categoryAmenityMap: (() => {
        with (vars) {
          return {
            RESTAURANT: ['restaurant', 'fast_food', 'food_court'],
            CAFE: ['cafe'],
            BAR: ['bar', 'pub', 'biergarten'],
            SCHOOL: [
              'school',
              'college',
              'kindergarten',
              'language_school',
              'music_school',
              'university',
            ],
            TAXI: ['taxi'],
            POST: ['post_box', 'post_depot', 'post_office'],
            HEALTHCARE: ['clinic', 'doctors', 'hospital'],
            BANK: ['bank'],
            ATM: ['atm'],
            POLICE: ['police'],
            PARKING: ['parking', 'parking_entrance', 'parking_space'],
          };
        }
      })(),
    });
    vars = Object.assign(vars, {
      amenities: (() => {
        with (vars) {
          return args.categories.flatMap(
            category => categoryAmenityMap[category]
          );
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
function AmenitiesToCategories(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    if (
      (() => {
        with (vars) {
          return !args.amenities;
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
      amenityCategoryMap: (() => {
        with (vars) {
          return {
            //Restaurant
            restaurant: 'RESTAURANT',
            fast_food: 'RESTAURANT',
            food_court: 'RESTAURANT',
            //Cafe
            cafe: 'CAFE',
            //Bar
            bar: 'BAR',
            pub: 'BAR',
            biergarten: 'BAR',
            //School
            school: 'SCHOOL',
            college: 'SCHOOL',
            kindergarten: 'SCHOOL',
            language_school: 'SCHOOL',
            music_school: 'SCHOOL',
            university: 'SCHOOL',
            //Taxi
            taxi: 'TAXI',
            //Post
            post_box: 'POST',
            post_depot: 'POST',
            post_office: 'POST',
            //Police
            police: 'POLICE',
            //Healthcare
            clinic: 'HEALTHCARE',
            doctors: 'HEALTHCARE',
            hospital: 'HEALTHCARE',
            //Bank
            bank: 'BANK',
            //ATM
            atm: 'ATM',
            //Parking
            parking: 'PARKING',
            parking_entrance: 'PARKING',
            parking_space: 'PARKING',
          };
        }
      })(),
    });
    vars = Object.assign(vars, {
      categories: (() => {
        with (vars) {
          return (() => {
            const categories = [];

            for (const amenity of args.amenities) {
              const category = amenityCategoryMap[amenity];
              if (category !== undefined && !categories.includes(category)) {
                categories.push(category);
              }
            }

            return categories;
          })();
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return categories;
      }
    })();
    /* return */ break FN_BODY;
  }
  return __outcome;
}
