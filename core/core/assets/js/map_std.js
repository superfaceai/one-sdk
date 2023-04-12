"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/internal/bytes.ts
  var Bytes = class {
    #buffer;
    #len;
    // TODO: private
    constructor(buffer, len) {
      this.#buffer = buffer;
      this.#len = len;
    }
    static withCapacity(capacity) {
      return new Bytes(new Uint8Array(capacity ?? 0), 0);
    }
    static fromArray(array) {
      return new Bytes(new Uint8Array(array), array.length);
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
    decode(encoding = "utf8") {
      const buffer = this.#buffer.buffer.slice(0, this.len);
      if (encoding === "utf8") {
        return __ffi.unstable.bytes_to_utf8(buffer);
      } else if (encoding === "base64") {
        return __ffi.unstable.bytes_to_base64(buffer);
      }
      throw new Error(`encoding "${encoding}" not implemented`);
    }
    static encode(string, encoding = "utf8") {
      let buffer;
      if (encoding === "utf8") {
        buffer = __ffi.unstable.utf8_to_bytes(string);
      } else if (encoding === "base64") {
        buffer = __ffi.unstable.base64_to_bytes(string);
      } else {
        throw new Error(`encoding "${encoding}" not implemented`);
      }
      return new Bytes(new Uint8Array(buffer), buffer.byteLength);
    }
  };
  var ByteStream = class {
    #handle;
    constructor(handle) {
      this.#handle = handle;
    }
    readToEnd() {
      const buffer = Bytes.withCapacity(8192);
      const readBuffer = new ArrayBuffer(8192);
      while (true) {
        const count = __ffi.unstable.stream_read(this.#handle, readBuffer);
        if (count === 0) {
          break;
        }
        buffer.extend(readBuffer.slice(0, count));
      }
      return buffer;
    }
    close() {
      __ffi.unstable.stream_close(this.#handle);
    }
  };

  // src/internal/node_compat.ts
  var Buffer2 = class {
    static from(value, encoding = "utf8") {
      if (typeof value === "string") {
        return new Buffer2(Bytes.encode(value, encoding));
      }
      if (Buffer2.isBuffer(value)) {
        return value;
      }
      if (Array.isArray(value)) {
        return new Buffer2(Bytes.fromArray(value));
      }
      throw new Error("not implemented");
    }
    static isBuffer(value) {
      if (value === void 0 || value === null) {
        return false;
      }
      if (value instanceof Buffer2) {
        return true;
      }
      return false;
    }
    #inner;
    constructor(inner) {
      this.#inner = inner;
    }
    /** @internal */
    get inner() {
      return this.#inner;
    }
    toString(encoding = "utf8") {
      return this.#inner.decode(encoding);
    }
  };

  // src/unstable.ts
  var unstable_exports = {};
  __export(unstable_exports, {
    CONTENT_TYPE: () => CONTENT_TYPE,
    HttpRequest: () => HttpRequest,
    HttpResponse: () => HttpResponse,
    MapError: () => MapError,
    fetch: () => fetch,
    print: () => print,
    resolveRequestUrl: () => resolveRequestUrl,
    setOutputFailure: () => setOutputFailure,
    setOutputSuccess: () => setOutputSuccess,
    takeInput: () => takeInput
  });

  // src/internal/message.ts
  function jsonReplacerMapValue(key, value) {
    if (Buffer2.isBuffer(value)) {
      return { type: "Buffer", data: value.inner.toArray() };
    }
    return value;
  }
  function jsonReviverMapValue(key, value) {
    if (typeof value === "object" && value !== null) {
      if (value["type"] === "Buffer" && Array.isArray(value["data"])) {
        return Buffer2.from(value["data"]);
      }
    }
    return value;
  }
  function messageExchange(message, replacer = void 0, reviver = void 0) {
    const response = __ffi.unstable.message_exchange(
      JSON.stringify(message, replacer)
    );
    return JSON.parse(response, reviver);
  }

  // src/internal/util.ts
  function ensureMultimap(map, lowercaseKeys = false) {
    const result = {};
    if (typeof map !== "object" || map === null) {
      return result;
    }
    for (let [key, value] of Object.entries(map)) {
      if (lowercaseKeys) {
        key = key.toLowerCase();
      }
      if (!Array.isArray(value)) {
        value = [value];
      }
      result[key] = value.filter((v) => v !== void 0 && v !== null).map((v) => v.toString());
    }
    return result;
  }

  // src/unstable.ts
  var HttpRequest = class {
    #handle;
    /** @internal */
    constructor(handle) {
      this.#handle = handle;
    }
    response() {
      const response = messageExchange({
        kind: "http-call-head",
        handle: this.#handle
      });
      if (response.kind === "ok") {
        return new HttpResponse(response.status, response.headers, response.body_stream);
      } else {
        throw new Error(response.error);
      }
    }
  };
  var HttpResponse = class {
    status;
    headers;
    #bodyStream;
    /** @internal */
    constructor(status, headers, bodyStream) {
      this.status = status;
      this.headers = headers;
      this.#bodyStream = new ByteStream(bodyStream);
    }
    // TODO: either make Bytes public or use a different type
    bodyBytes() {
      const buffer = this.#bodyStream.readToEnd();
      this.#bodyStream.close();
      return buffer;
    }
    bodyText() {
      const bytes = this.bodyBytes();
      if (bytes.len === 0) {
        return "";
      }
      return bytes.decode();
    }
    bodyJson() {
      const text = this.bodyText();
      if (text === void 0 || text === "") {
        return void 0;
      }
      return JSON.parse(text);
    }
    bodyAuto() {
      if (this.status === 204) {
        return void 0;
      }
      if (this.headers["content-type"]?.some((ct) => ct.indexOf(CONTENT_TYPE.JSON) >= 0) ?? false) {
        return this.bodyJson();
      }
      if (this.headers["content-type"]?.some((ct) => CONTENT_TYPE.RE_BINARY.test(ct)) ?? false) {
        return this.bodyBytes();
      }
      return this.bodyText();
    }
  };
  var MapError = class {
    constructor(output) {
      this.output = output;
    }
  };
  function print(message) {
    if (message === void 0) {
      __ffi.unstable.print("undefined");
    } else if (message === null) {
      __ffi.unstable.print("null");
    } else {
      __ffi.unstable.print(message.toString());
    }
  }
  function takeInput() {
    const response = messageExchange({
      kind: "take-input"
    }, void 0, jsonReviverMapValue);
    if (response.kind === "ok") {
      return response.input;
    } else {
      throw new Error(response.error);
    }
  }
  function setOutputSuccess(output) {
    const response = messageExchange({
      kind: "set-output-success",
      output: output ?? null
    }, jsonReplacerMapValue, void 0);
    if (response.kind === "ok") {
      return;
    } else {
      throw new Error(response.error);
    }
  }
  function setOutputFailure(output) {
    const response = messageExchange({
      kind: "set-output-failure",
      output: output ?? null
    }, jsonReplacerMapValue, void 0);
    if (response.kind === "ok") {
      return;
    } else {
      throw new Error(response.error);
    }
  }
  var CONTENT_TYPE = {
    JSON: "application/json",
    URLENCODED: "application/x-www-form-urlencoded",
    FORMDATA: "multipart/form-data",
    RE_BINARY: /application\/octet-stream|video\/.*|audio\/.*|image\/.*/
  };
  function resolveRequestUrl(url, options) {
    const { parameters, security } = options;
    let serviceId = options.serviceId ?? parameters.__provider.defaultService;
    if (url === "") {
      return parameters.__provider.services[serviceId].baseUrl;
    }
    const isRelative = /^\/([^/]|$)/.test(url);
    if (isRelative) {
      url = parameters.__provider.services[serviceId].baseUrl.replace(/\/+$/, "") + url;
    }
    return url;
  }
  function fetch(url, options) {
    const headers = ensureMultimap(options.headers ?? {}, true);
    let finalBody;
    let body = options.body;
    if (body !== void 0 && body !== null) {
      const contentType = headers["content-type"]?.[0] ?? "application/json";
      let bodyBytes;
      if (contentType.startsWith(CONTENT_TYPE.JSON)) {
        bodyBytes = Bytes.encode(JSON.stringify(body));
      } else if (contentType.startsWith(CONTENT_TYPE.URLENCODED)) {
        bodyBytes = Bytes.encode(
          __ffi.unstable.record_to_urlencoded(ensureMultimap(body))
        );
      } else if (CONTENT_TYPE.RE_BINARY.test(contentType)) {
        bodyBytes = Buffer2.from(body).inner;
      } else {
        throw new Error(`Content type not supported: ${contentType}`);
      }
      finalBody = Array.from(bodyBytes.data);
    }
    const response = messageExchange({
      kind: "http-call",
      method: options.method ?? "GET",
      url,
      headers,
      query: ensureMultimap(options.query ?? {}),
      body: finalBody
    });
    if (response.kind === "ok") {
      return new HttpRequest(response.handle);
    } else {
      throw new Error(response.error);
    }
  }

  // src/map_std.ts
  globalThis.std = {
    unstable: unstable_exports
  };
  globalThis.Buffer = Buffer2;
})();
