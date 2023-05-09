const manifest = {
  profile: 'wasm-sdk/example@0.1',
  provider: 'localhost'
};

function Example({ input, parameters, services }) {
  __ffi.unstable.printDebug('Input:', input);
  __ffi.unstable.printDebug('Parameters:', parameters);
  __ffi.unstable.printDebug('Services:', services);

  const url = `${services.default}/api/people/${input.id}?foo=x`;

  const options = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    security: 'basic_auth',
    query: {
      'foo': ['bar', 'baz'],
      'qux': ['2']
    }
  };

  const response = std.unstable.fetch(url, options).response();

  const body = response.bodyAuto() ?? {};

  if (std.unstable.random() > 0.5) {
    throw new std.unstable.MapError('Random error');
  }

  return {
    name: body.name,
    height: body.height,
    param: parameters.PARAM,
  };
}