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
    vars = Object.assign(vars, {
      trackingNumber: (() => {
        with (vars) {
          return input.trackingNumber;
        }
      })(),
    });
    vars = Object.assign(vars, { transitStatus: 'transit' });
    vars = Object.assign(vars, { preTransitStatus: 'pre_transit' });
    vars = Object.assign(vars, {
      shipments: (() => {
        with (vars) {
          return [
            {
              carrier: 'Mocked carrier',
              trackingNumber: trackingNumber,
              origin: {
                address: {
                  countryCode: 'US',
                  postalCode: '94103',
                  addressLocality: 'San Francisco',
                },
              },
              destination: {
                address: {
                  countryCode: 'US',
                  postalCode: '60611',
                  addressLocality: 'Chicago',
                },
              },
              status: {
                timestamp: '2021-05-04T22:49:23.204Z',
                statusCode: transitStatus,
                statusText: 'Your shipment has departed from the origin.',
                location: {
                  address: {
                    countryCode: 'US',
                    postalCode: '94103',
                    addressLocality: 'San Francisco',
                  },
                },
              },
              events: [
                {
                  timestamp: '2021-05-04T22:49:23.204Z',
                  statusCode: transitStatus,
                  statusText: 'Your shipment has departed from the origin.',
                  location: {
                    address: {
                      countryCode: 'US',
                      postalCode: '94103',
                      addressLocality: 'San Francisco',
                    },
                  },
                },
                {
                  timestamp: '2021-05-03T18:49:23.204Z',
                  statusCode: preTransitStatus,
                  statusText:
                    'The carrier has received the electronic shipment information.',
                },
              ],
              estimatedDeliveryDate: '2021-05-11T05:44:01.431Z',
            },
          ];
        }
      })(),
    });
    __outcome.data = (() => {
      with (vars) {
        return shipments;
      }
    })();
  }
  if (__outcome.error !== undefined) {
    throw new std.unstable.MapError(__outcome.error);
  } else {
    return __outcome.data;
  }
}
