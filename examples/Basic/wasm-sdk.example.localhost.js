const manifest = {
  profile: 'wasm-sdk/example@0.1',
  provider: 'localhost'
};

function Example(input, provider, parameters) {
  __ffi.unstable.printDebug('Input:', input);
  __ffi.unstable.printDebug('Provider:', provider);
  __ffi.unstable.printDebug('Parameters:', parameters);

  const url = `${provider.services.default}/api/people/${input.id}`;

  const options = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    security: 'basic_auth',
  };

  const response = std.unstable.fetch(url, options).response();

  const body = response.bodyAuto() ?? {};

  if (std.unstable.random() > 0.5) {
    throw new MapError('Random error');
  }

  return {
    name: body.name,
    height: body.height,
    param: parameters.PARAM,
  };
}