// TODO: module support is exposed in latest Javy git  - we could depend on git directly and rework this as a module
globalThis.std = globalThis.std ?? {};
// std private state, not exported
globalThis.std.private = {
  jsonReplacerMapValue(key, value) {
    // TODO: this is how node Buffer gets serialized - do we want that?
    // to keep in line with our core convention, this should be some kind of `$MapValue::Buffer` and only transformed to the NodeJS buffer for the sake of tests
    if (std.unstable.Buffer.isBuffer(value)) {
      return { type: 'Buffer', data: value.inner.toArray() };
    }

    return value;
  },
  jsonReviverMapValue(key, value) {
    if (typeof value === 'object' && value !== null) {
      if (value['type'] === 'Buffer' && Array.isArray(value['data'])) {
        return std.unstable.Buffer.from(value['data']);
      }
    }
    
    // TODO: revive streams
    return value;
  },
  messageExchange(message, replacer = undefined, reviver = undefined) {
    const response = std.ffi.unstable.message_exchange(
      JSON.stringify(message, replacer)
    );
    return JSON.parse(response, reviver);
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

      result[key] = value.filter((v) => v !== undefined && v !== null).map((v) => v.toString());
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

    static fromArray(array) {
      return new std.private.Bytes(new Uint8Array(array), array.length);
    }

    toArray() {
      return Array.from(this.data);
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
    decode(encoding = 'utf8') {
      // TODO: again support for TypedArrays in Javy
      const buffer = this.#buffer.buffer.slice(0, this.len);

      if (encoding === 'utf8') {
        return std.ffi.unstable.bytes_to_utf8(buffer);
      } else if (encoding === 'base64') {
        return std.ffi.unstable.bytes_to_base64(buffer);
      }
      
      throw new Error(`encoding "${encoding}" not implemented`);
    }

    // TODO: support other encodings, currently this is always utf-8
    static encode(string, encoding = 'utf8') {
      let buffer;
      if (encoding === 'utf8') {
        buffer = std.ffi.unstable.utf8_to_bytes(string);
      } else if (encoding === 'base64') {
        buffer = std.ffi.unstable.base64_to_bytes(string);
      } else {
        throw new Error(`encoding "${encoding}" not implemented`);
      }

      return new std.private.Bytes(new Uint8Array(buffer), buffer.byteLength);
    }

    static readStreamToEnd(handle) {
      const buffer = std.private.Bytes.withCapacity(8192);
      // TODO: support for TypedArrays in Javy - without them we have to read into a plain ArrayBuffer (which cannot be a subarray)
      // and then copy that data into our final buffer.
      //
      // If Javy supported TypedArrays (they are supported in quickjs, just not exposed in Javy), we could directly pass a subarray
      // to the `stream_read` call and we'd only need one buffer.
      const readBuffer = new ArrayBuffer(8192);

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
    }, undefined, std.private.jsonReviverMapValue);

    if (response.kind === 'ok') {
      return { input: response.input, parameters: response.parameters, security: response.security };
    } else {
      throw new Error(response.error);
    }
  },
  setOutputSuccess(output) {
    const response = std.private.messageExchange({
      kind: 'set-output-success',
      output: output ?? null
    }, std.private.jsonReplacerMapValue, undefined);

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
    }, std.private.jsonReplacerMapValue, undefined);

    if (response.kind === 'ok') {
      return;
    } else {
      throw new Error(response.error);
    }
  },
  resolveRequestUrl(url, options) {
    const { parameters, security } = options;
    let serviceId = options.serviceId ?? parameters.__provider.defaultService;

    if (url === '') {
      return parameters.__provider.services[serviceId].baseUrl;
    }
    const isRelative = /^\/([^/]|$)/.test(url);
    if (isRelative) {
      url = parameters.__provider.services[serviceId].baseUrl.replace(/\/+$/, '') + url;
    }

    return url;
  },
  fetch(url, options) {
    const headers = std.private.ensureMultimap(options.headers ?? {}, true);

    let body = options.body;
    if (body !== undefined && body !== null) {
      const contentType = headers['content-type']?.[0] ?? 'application/json';

      if (contentType.startsWith(std.private.CONTENT_TYPE_JSON)) {
        body = std.private.Bytes.encode(
          JSON.stringify(body)
        );
      } else if (contentType.startsWith(std.private.CONTENT_TYPE_URLENCODED)) {
        body = std.private.Bytes.encode(
          std.ffi.unstable.map_to_urlencode(std.private.ensureMultimap(body))
        );
      } else if (std.private.CONTENT_TYPE_REGEX_BINARY.test(contentType)) {
        std.ffi.unstable.printDebug(">>> body", body, Buffer.isBuffer(body));
        body = std.unstable.Buffer.from(body).inner;
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
      const bytes = this.bodyBytes();
      if (bytes.len === 0) {
        return '';
      }

      // TODO: possibly infer encoding from headers?
      return bytes.decode();
    }

    bodyJson() {
      const text = this.bodyText();
      if (text === undefined || text === '') {
        return undefined;
      }

      return JSON.parse(text);
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
  },
  Buffer: class Buffer {
    static from(value, encoding = 'utf8') {
      if (typeof value === 'string') {
        return new Buffer(std.private.Bytes.encode(value, encoding));
      }

      if (Buffer.isBuffer(value)) {
        return value;
      }

      if (Array.isArray(value)) {
        return new Buffer(std.private.Bytes.fromArray(value));
      }

      throw new Error('not implemented');
    }

    static isBuffer(value) {
      if (value === undefined || value === null) {
        return false;
      }

      if (value instanceof std.unstable.Buffer) {
        return true;
      }

      return false;
    }

    #inner;
    constructor(inner) {
      this.#inner = inner;
    }

    get inner() {
      return this.#inner;
    }

    toString(encoding = 'utf8') {
      return this.#inner.decode(encoding);
    }
  }
};
globalThis.Buffer = std.unstable.Buffer;
