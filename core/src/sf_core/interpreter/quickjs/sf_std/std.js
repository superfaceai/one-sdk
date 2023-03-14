// TODO: module support is exposed in latest Javy git  - we could depend on git directly and rework this as a module
globalThis.std = globalThis.std ?? {};
// std private state, not exported
globalThis.std.private = {
  messageExchange(message) {
    const response = std.ffi.unstable.message_exchange(
      JSON.stringify(message)
    );
    return JSON.parse(response);
  },
  ensureMultimap(map, lowercaseKeys = false) {
    const result = {};

    if (typeof map !== 'object' || map === null) {
      return result;
    }

    for (let [key, value] of Object.entries(map)) {
      if (lowercaseKeys) {
        key = key.toLowerCase();
      }

      if (!Array.isArray(value)) {
        value = [value];
      }

      result[key] = value.map((v) => v.toString());
    }

    return result;
  },
  Bytes: class Bytes {
    #buffer;
    #len;

    constructor(buffer, len) {
      this.#buffer = buffer;
      this.#len = len;
    }

    static withCapacity(capacity) {
      return new std.private.Bytes(new Uint8Array(capacity ?? 0), 0);
    }

    get len() {
      return this.#len;
    }

    get capacity() {
      return this.#buffer.byteLength;
    }

    get data() {
      return this.#buffer.subarray(0, this.len);
    }

    get uninitData() {
      return this.#buffer.subarray(this.len);
    }

    reserve(additional) {
      const want = this.len + additional;
      if (this.capacity >= want) {
        return;
      }

      // resize exponentially, copy old data into new buffer
      const newCapacity = Math.max(this.capacity * 2, want);
      const newBuffer = new Uint8Array(newCapacity);
      newBuffer.set(this.data, 0);

      this.#buffer = newBuffer;
    }

    extend(buffer) {
      this.reserve(buffer.byteLength);
      this.#buffer.set(new Uint8Array(buffer), this.len);
      this.#len += buffer.byteLength;
    }

    // TODO: support other encodings, currently this is always utf-8
    decode() {
      // TODO: again support for TypedArrays in Javy
      const buffer = this.#buffer.buffer.slice(0, this.len);
      return std.ffi.unstable.decode_str_utf8(buffer);
    }

    // TODO: support other encodings, currently this is always utf-8
    static encode(string) {
      const buffer = std.ffi.unstable.encode_str_utf8(string);
      return new std.private.Bytes(new Uint8Array(buffer), buffer.byteLength);
    }

    static readStreamToEnd(handle) {
      const buffer = std.private.Bytes.withCapacity(8192);
      // TODO: support for TypedArrays in Javy - without them we have to read into a plain ArrayBuffer (which cannot be a subarray)
      // and then copy that data into our final buffer.
      //
      // If Javy supported TypedArrays (they are supported in quickjs, just not exposed in Javy), we could directly pass a subarray
      // to the `stream_read` call and we'd only need one buffer.
      const readBuffer = new ArrayBuffer(128);

      while (true) {
        const count = std.ffi.unstable.stream_read(handle, readBuffer);
        if (count === 0) {
          break;
        }

        buffer.extend(readBuffer.slice(0, count));
      }

      return buffer;
    }
  },
  CONTENT_TYPE_JSON: 'application/json',
  CONTENT_TYPE_URLENCODED: 'application/x-www-form-urlencoded',
  CONTENT_TYPE_FORMDATA: 'multipart/form-data',
  CONTENT_TYPE_REGEX_BINARY: /application\/octet-stream|video\/.*|audio\/.*|image\/.*/
};
globalThis.std.unstable = {
  print(message) {
    if (message === undefined) {
      std.ffi.unstable.print('undefined');
    } else if (message === null) {
      std.ffi.unstable.print('null');
    } else {
      std.ffi.unstable.print(message.toString());
    }
  },
  abort() {
    std.ffi.unstable.abort();
  },

  takeInput() {
    const response = std.private.messageExchange({
      kind: 'take-input'
    });

    if (response.kind === 'ok') {
      // TODO: revive while parsing JSON to support custom types (streams)
      return { input: response.input, parameters: response.parameters, security: response.security };
    } else {
      throw new Error(response.error);
    }
  },
  setOutputSuccess(output) {
    const response = std.private.messageExchange({
      kind: 'set-output-success',
      output
    });

    if (response.kind === 'ok') {
      return;
    } else {
      throw new Error(response.error);
    }
  },
  setOutputFailure(output) {
    const response = std.private.messageExchange({
      kind: 'set-output-failure',
      output
    });

    if (response.kind === 'ok') {
      return;
    } else {
      throw new Error(response.error);
    }
  },
  resolveRequestUrl(url, options) {
    const { parameters, security, serviceId } = options;

    if (url === '') {
      return parameters.provider.services[serviceId].baseUrl;
    }
    const isRelative = /^\/([^/]|$)/.test(url);
    if (isRelative) {
      url = parameters.provider.services[serviceId].baseUrl.replace(/\/+$/, '') + url;
    }

    return url;
  },
  fetch(url, options) {
    const headers = std.private.ensureMultimap(options.headers ?? {}, true);

    let body = options.body;
    if (body !== undefined && body !== null) {
      const contentType = headers['content-type']?.[0];

      if (contentType === undefined) {
        throw new Error(`Content type header missing`);
      }

      if (contentType.startsWith(std.private.CONTENT_TYPE_JSON)) {
        body = std.private.Bytes.encode(
          JSON.stringify(body)
        );
      } else if (contentType.startsWith(std.private.CONTENT_TYPE_URLENCODED)) {
        body = std.private.Bytes.encode(
          std.ffi.unstable.encode_map_urlencode(std.private.ensureMultimap(body))
        );
      } else if (std.private.CONTENT_TYPE_REGEX_BINARY.test(contentType)) {
        body = new std.private.Bytes(body, body.byteLength);
      } else {
        throw new Error(`Content type not supported: ${contentType}`);
      }
      // TODO: support formdata

      // turn Bytes into number[] to serialize correctly
      body = Array.from(body.data);
    }

    const response = std.private.messageExchange({
      kind: 'http-call',
      method: options.method ?? 'GET',
      url,
      headers,
      query: std.private.ensureMultimap(options.query ?? {}),
      body
    });

    if (response.kind === 'ok') {
      return new std.unstable.HttpRequest(response.handle);
    } else {
      throw new Error(response.error);
    }
  },
  HttpRequest: class HttpRequest {
    #handle;
    constructor(handle) {
      this.#handle = handle;
    }

    response() {
      const response = std.private.messageExchange({
        kind: 'http-call-head',
        handle: this.#handle
      });

      if (response.kind === 'ok') {
        return new std.unstable.HttpResponse(response.status, response.headers, response.body_stream);
      } else {
        throw new Error(response.error);
      }
    }
  },
  HttpResponse: class HttpResponse {
    #bodyStream;
    constructor(status, headers, bodyStream) {
      this.status = status;
      this.headers = Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
      );
      this.#bodyStream = bodyStream;
    }

    bodyBytes() {
      const buffer = std.private.Bytes.readStreamToEnd(this.#bodyStream);
      std.ffi.unstable.stream_close(this.#bodyStream);

      return buffer;
    }

    bodyText() {
      // TODO: possibly infer encoding from headers?
      return this.bodyBytes().decode();
    }

    bodyJson() {
      return JSON.parse(this.bodyText());
    }

    bodyAuto() {
      if (this.status === 204) {
        return undefined;
      }

      if (this.headers['content-type']?.some(ct => ct.indexOf(std.private.CONTENT_TYPE_JSON) >= 0) ?? false) {
        return this.bodyJson();
      }

      if (this.headers['content-type']?.some(ct => std.private.CONTENT_TYPE_REGEX_BINARY.test(ct)) ?? false) {
        return this.bodyBytes();
      }

      return this.bodyText();
    }
  },
  MapError: class MapError {
    constructor(output) {
      this.output = output;
    }
  }
};
