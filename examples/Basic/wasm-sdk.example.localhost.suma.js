const manifest = {
  profile: 'wasm-sdk/example@0.1',
  provider: 'localhost'
};

function Example({ input, parameters, services }) {
  __ffi.unstable.printDebug('Input:', input);
  __ffi.unstable.printDebug('Parameters:', parameters);
  __ffi.unstable.printDebug('Services:', services);

  const url = `${services.default}/api/${input.id}`;

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

  if (response.status !== 200) {
    throw new std.unstable.MapError({
      title: 'Error response',
      detail: `${JSON.stringify(response)} - ${JSON.stringify(body)}`
    });
  }

  return {
    url: body.url,
    method: body.method,
    query: body.query,
    headers: body.headers,
  };
}