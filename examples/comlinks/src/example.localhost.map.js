/// <reference types="@superface/map-std" />

const manifest = {
  profile: 'example@1.0',
  provider: 'localhost'
};

function Main({ input, parameters, services }) {
  __ffi.unstable.printDebug('Input:', input);
  __ffi.unstable.printDebug('Parameters:', parameters);
  __ffi.unstable.printDebug('Services:', services);

  const url = `${services.default}/api/${input.id}`;

  const options = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    },
    security: 'basic_auth',
    query: {
      'foo': ['bar', 'baz'],
      'qux': ['2']
    },
    body: {
      untyped: 'untyped',
      required_field: 'required field',
      required_value: 'required value',
      required: 'required field and value',
      bool: true,
      str: 'string',
      num: 42,
      named_field: 'named string',
      object_model: {
        field1: 'required stirng'
      },
      list_model: ['string item'],
      enum_model: 'FOO',
      union_model: {
        foo: 'foo',
        bar: 'bar',
      },
      alias_model: {
        foo: 'foo',
      },
      scalar_model: 'scalar model',
      scalar_string_model: 'scalar model'
    }
  };

  try {
    const response = std.unstable.fetch(url, options).response();
    const body = response.bodyAuto() ?? {};

    if (response.status !== 200) {
      throw new std.unstable.MapError({
        title: 'Error response',
        detail: `${JSON.stringify(response)} - ${JSON.stringify(body)}`
      });
    }

    return body.body;
  } catch (err) {
    throw new std.unstable.MapError({
      title: err.name,
      detail: err.message,
    });
  }
}