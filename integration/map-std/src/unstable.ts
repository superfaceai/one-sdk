import { messageExchange, jsonReviverMapValue, jsonReplacerMapValue } from './internal/message';
import { ensureMultimap } from './internal/util';
import { Bytes, ByteStream } from './internal/bytes';
import type { MultiMap } from './internal/types';
import { Buffer } from './internal/node_compat';

export type { MultiMap, Encoding } from './internal/types';

export type FetchOptions = {
  method?: string,
  headers?: MultiMap,
  query?: MultiMap,
  body?: string | number[] | Buffer,
  security?: string,
};

// Can't use Record<string, AnyValue> but can use { [s in string]: AnyValue }. Typescript go brr.
// The types here have defined message_exchange format and can safely be serialized and deserialized across the core<->map boundary.
export type AnyValue = null | string | number | boolean | AnyValue[] | { [s in string]: AnyValue };

export class HttpRequest {
  #handle: number;
  /** @internal */
  constructor(handle: number) {
    this.#handle = handle;
  }

  response(): HttpResponse {
    const response = messageExchange({
      kind: 'http-call-head',
      handle: this.#handle
    });

    if (response.kind === 'ok') {
      return new HttpResponse(response.status, response.headers, response.body_stream);
    } else {
      throw new Error(response.error);
    }
  }
}
export class HttpResponse {
  public readonly status: number;
  public readonly headers: MultiMap;
  #bodyStream: ByteStream;

  /** @internal */
  constructor(status: number, headers: MultiMap, bodyStream: number) {
    this.status = status;
    this.headers = headers;
    this.#bodyStream = new ByteStream(bodyStream);
  }

  // TODO: either make Bytes public or use a different type
  private bodyBytes(): Bytes {
    const buffer = this.#bodyStream.readToEnd();
    this.#bodyStream.close();

    return buffer;
  }

  public bodyText(): string {
    const bytes = this.bodyBytes();
    if (bytes.len === 0) {
      return '';
    }

    // TODO: possibly infer encoding from headers?
    return bytes.decode();
  }

  public bodyJson(): unknown {
    const text = this.bodyText();
    if (text === undefined || text === '') {
      return undefined;
    }

    return JSON.parse(text);
  }

  public bodyAuto(): unknown {
    if (this.status === 204) {
      return undefined;
    }

    if (this.headers['content-type']?.some(ct => ct.indexOf(CONTENT_TYPE.JSON) >= 0) ?? false) {
      return this.bodyJson();
    }

    if (this.headers['content-type']?.some(ct => CONTENT_TYPE.RE_BINARY.test(ct)) ?? false) {
      return this.bodyBytes();
    }

    return this.bodyText();
  }
}

export class MapError {
  constructor(public readonly errorResult: AnyValue) {}
}

// env
export function print(message: unknown) {
  if (message === undefined) {
    __ffi.unstable.print('undefined');
  } else if (message === null) {
    __ffi.unstable.print('null');
  } else {
    __ffi.unstable.print(message.toString());
  }
}

// input and output
export function takeInput(): AnyValue {
  const response = messageExchange({
    kind: 'take-input'
  }, undefined, jsonReviverMapValue);

  if (response.kind === 'ok') {
    return response.input;
  } else {
    throw new Error(response.error);
  }
}
export function setOutputSuccess(output: AnyValue) {
  const response = messageExchange({
    kind: 'set-output-success',
    output: output ?? null
  }, jsonReplacerMapValue, undefined);

  if (response.kind === 'ok') {
    return;
  } else {
    throw new Error(response.error);
  }
}
export function setOutputFailure(output: AnyValue) {
  const response = messageExchange({
    kind: 'set-output-failure',
    output: output ?? null
  }, jsonReplacerMapValue, undefined);

  if (response.kind === 'ok') {
    return;
  } else {
    throw new Error(response.error);
  }
}

export const CONTENT_TYPE = {
  JSON: 'application/json',
  URLENCODED: 'application/x-www-form-urlencoded',
  FORMDATA: 'multipart/form-data',
  RE_BINARY: /application\/octet-stream|video\/.*|audio\/.*|image\/.*/
};

export function resolveRequestUrl(url: string, options: { parameters: any, security: any, serviceId?: string }): string {
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
}
export function fetch(url: string, options: FetchOptions): HttpRequest {
  const headers = ensureMultimap(options.headers ?? {}, true);

  let finalBody: number[] | undefined;
  let body = options.body;
  if (body !== undefined && body !== null) {
    const contentType = headers['content-type']?.[0] ?? 'application/json';

    let bodyBytes: Bytes;
    if (contentType.startsWith(CONTENT_TYPE.JSON)) {
      bodyBytes = Bytes.encode(JSON.stringify(body));
    } else if (contentType.startsWith(CONTENT_TYPE.URLENCODED)) {
      bodyBytes = Bytes.encode(
        __ffi.unstable.record_to_urlencoded(ensureMultimap(body))
      );
    } else if (CONTENT_TYPE.RE_BINARY.test(contentType)) {
      bodyBytes = Buffer.from(body).inner;
    } else {
      throw new Error(`Content type not supported: ${contentType}`);
    }
    // TODO: support formdata

    // turn Bytes into number[] to serialize correctly
    finalBody = Array.from(bodyBytes.data);
  }

  const response = messageExchange({
    kind: 'http-call',
    method: options.method ?? 'GET',
    url,
    headers,
    query: ensureMultimap(options.query ?? {}),
    body: finalBody,
    security: options.security,
  });

  if (response.kind === 'ok') {
    return new HttpRequest(response.handle);
  } else {
    throw new Error(response.error);
  }
}
