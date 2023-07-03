/// <reference types="@superface/map-std" />

const manifest = {
  profile: 'wasm-sdk/example@0.1',
  provider: 'localhost'
};

function Example({ input, parameters, services }) {
  __ffi.unstable.printDebug('Input:', input);
  __ffi.unstable.printDebug('Parameters:', parameters);
  __ffi.unstable.printDebug('Services:', services);

  const url = `${services.default}/api/${input.id}`;

  const init = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'accept': 'plain/text'
    },
    security: 'basic_auth',
    query: {
      'foo': ['bar', 'baz'],
      'qux': ['2']
    }
  };

  try {
    const response = std.unstable.fetch(url, init);
    __ffi.unstable.printDebug('response:', response);
    __ffi.unstable.printDebug('status:', response.status);

    const body = response.json();
    __ffi.unstable.printDebug('body:', body);

    if (response.status !== 200) {
      throw new std.unstable.MapError({
        title: 'Error response',
        detail: `${JSON.stringify(response)} - ${JSON.stringify(body)}`
      });
    }

    const u1 = new std.unstable.URL("schema://user:pass@domain.tld:8000/path?foo=1&bar=baz#hash");
    __ffi.unstable.printDebug('URL1', u1.toString());

    __ffi.unstable.printDebug('URL1', u1.toString());

    __ffi.unstable.printDebug('URL1', u1.toString());

    return {
      url: body.url,
      method: body.method,
      query: body.query,
      headers: body.headers,
    };
  } catch (err) {
    __ffi.unstable.printDebug('err:', err);

    throw new std.unstable.MapError({
      title: err.name,
      detail: err.message,
    });
  }
}