/// <reference types="@superfaceai/map-std" />
/// <reference path="./wasm-sdk.example.profile.ts" />
// @ts-check

const manifest = {
  profile: 'wasm-sdk/example@0.1',
  provider: 'localhost'
};

// var to hoist it like a function would be - can't be a function because then the type annotation doesn't work
/** @type {Example} */
var Example = ({ input, parameters, services }) => {
  // @ts-ignore
  __ffi.unstable.printDebug('Input:', input);
  // @ts-ignore
  __ffi.unstable.printDebug('Parameters:', parameters);
  // @ts-ignore
  __ffi.unstable.printDebug('Services:', services);

  const url = `${services.default}/api/${input.id}`;

  const options = {
    method: 'GET',
    headers: {
      'Accept': ['application/json'],
      'x-custom-header': [parameters.PARAM]
    },
    security: 'basic_auth',
    // security: { kind: "first-valid", ids: ['authic_base', 'basic_auth'] },
    // security: { kind: "all", ids: ['authic_base', 'basic_auth'] },
    query: {
      'foo': ['bar', 'baz'],
      'qux': ['2']
    }
  };

  let response
  let body
  try {
    response = std.unstable.fetch(url, options).response();
    body = /** @type {Record<string, AnyValue>} */ (response.bodyAuto() ?? {});
  } catch (err) {
    throw new std.unstable.MapError({
      title: err.name,
      detail: err.message,
    });
  }

  if (response.status !== 200) {
    throw new std.unstable.MapError({
      title: `Error response ${response.status}`,
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
