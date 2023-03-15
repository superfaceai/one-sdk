// TODO: MapHeaderNode

function _start(usecaseName) {
  let mapFn = undefined;

  switch (usecaseName) {
    case 'ShipmentInfo':
      mapFn = ShipmentInfo;
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

function ShipmentInfo(input, parameters, security) {
  const __outcome = { result: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    {
      const outcome = FetchShipment(
        Object.assign(
          {},
          {
            trackingNumber: (() => {
              with (vars) {
                return input.trackingNumber;
              }
            })(),
          },
          {
            carrier: (() => {
              with (vars) {
                return input.carrier;
              }
            })(),
          }
        ),
        parameters,
        security
      );
      if (
        (() => {
          with (vars) {
            return !outcome.error;
          }
        })()
      ) {
        __outcome.data = (() => {
          with (vars) {
            return outcome.data;
          }
        })();
        /* return */ break FN_BODY;
      }
      __outcome.error = Object.assign(
        {},
        {
          title: (() => {
            with (vars) {
              return outcome.error.title;
            }
          })(),
        }
      );
      /* return */ break FN_BODY;
    }
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
function FetchShipment(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      trackingNumber: (() => {
        with (vars) {
          return args.trackingNumber;
        }
      })(),
    });
    {
      const url = std.unstable.resolveRequestUrl(`/track/shipments`, {
        parameters,
        security,
        serviceId: undefined,
      });
      const requestOptions = {
        method: 'GET',
        headers: {},
        query: {},
        body: undefined,
      };
      requestOptions.query = Object.assign(
        {},
        {
          trackingNumber: (() => {
            with (vars) {
              return trackingNumber;
            }
          })(),
        },
        {
          service: (() => {
            with (vars) {
              return args.carrier;
            }
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
          vars = Object.assign(vars, {
            shipments: (() => {
              const acc = [];
              {
                for (const shipment of (() => {
                  with (vars) {
                    return body.shipments;
                  }
                })()) {
                  const outcome = MapShipment(
                    Object.assign(
                      {},
                      {
                        shipment: (() => {
                          with (vars) {
                            return shipment;
                          }
                        })(),
                      },
                      {
                        trackingNumber: (() => {
                          with (vars) {
                            return trackingNumber;
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
              return shipments;
            }
          })();
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 404 "*" "*" */
        if (response.status === 404) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'No shipment with given tracking number found' }
          );
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 401 "*" "*" */
        if (response.status === 401) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign({}, { title: 'Invalid api key' });
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        /* response 429 "*" "*" */
        if (response.status === 429) {
          const statusCode = response.status;
          const headers = response.headers;
          const body = response.bodyAuto();
          __outcome.error = Object.assign(
            {},
            { title: 'Too many requests within defined time period' }
          );
          /* return */ break FN_BODY;
          /* end handler */ break HTTP_RESPONSE;
        }
        throw new Error('Unexpected response');
      }
    }
  }
  return __outcome;
}
function MapShipment(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, {
      estimatedDeliveryDate: (() => {
        with (vars) {
          return null;
        }
      })(),
    });
    vars = Object.assign(vars, {
      shipment: (() => {
        with (vars) {
          return args.shipment;
        }
      })(),
    });
    vars = Object.assign(vars, {
      estimatedDeliveryDate: (() => {
        with (vars) {
          return shipment.estimatedDeliveryDate;
        }
      })(),
    });
    vars = Object.assign(vars, {
      status: (() => {
        const acc = [];
        {
          const outcome = MapEvent(
            Object.assign(
              {},
              {
                event: (() => {
                  with (vars) {
                    return shipment.status;
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
      events: (() => {
        const acc = [];
        {
          for (const event of (() => {
            with (vars) {
              return shipment.events;
            }
          })()) {
            const outcome = MapEvent(
              Object.assign(
                {},
                {
                  event: (() => {
                    with (vars) {
                      return event;
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
    __outcome.data = Object.assign(
      {},
      {
        trackingNumber: (() => {
          with (vars) {
            return args.trackingNumber;
          }
        })(),
      },
      {
        origin: (() => {
          with (vars) {
            return shipment.origin;
          }
        })(),
      },
      {
        destination: (() => {
          with (vars) {
            return shipment.destination;
          }
        })(),
      },
      {
        status: (() => {
          with (vars) {
            return status;
          }
        })(),
      },
      {
        events: (() => {
          with (vars) {
            return events;
          }
        })(),
      },
      {
        estimatedDeliveryDate: (() => {
          with (vars) {
            return estimatedDeliveryDate;
          }
        })(),
      },
      {
        carrier: (() => {
          with (vars) {
            return shipment.service;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
function MapEvent(args, parameters, security) {
  const __outcome = { data: undefined, error: undefined };
  let vars = {};
  FN_BODY: {
    vars = Object.assign(vars, { statusCode: 'pre_transit' });
    vars = Object.assign(vars, {
      statusCode: (() => {
        with (vars) {
          return args.event.statusCode;
        }
      })(),
    });
    __outcome.data = Object.assign(
      {},
      {
        timestamp: (() => {
          with (vars) {
            return args.event.timestamp;
          }
        })(),
      },
      {
        statusCode: (() => {
          with (vars) {
            return statusCode;
          }
        })(),
      },
      {
        statusText: (() => {
          with (vars) {
            return args.event.status;
          }
        })(),
      },
      {
        location: (() => {
          with (vars) {
            return args.event.location;
          }
        })(),
      }
    );
    /* return */ break FN_BODY;
  }
  return __outcome;
}
