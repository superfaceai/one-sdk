//! Entire implementation removese async nature of fetch API

import { messageExchange, jsonReviverMapValue, jsonReplacerMapValue, responseErrorToError } from './internal/message';
import { ensureMultimap } from './internal/util';
import { Bytes, ByteStream } from './internal/bytes';
import type { MultiMap } from './internal/types';
import { Buffer } from './internal/node_compat';

export type { MultiMap, Encoding } from './internal/types';

// Can't use Record<string, AnyValue> but can use { [s in string]: AnyValue }. Typescript go brr.
// The types here have defined message_exchange format and can safely be serialized and deserialized across the core<->map boundary.
export type AnyValue = null | string | number | boolean | AnyValue[] | { [s in string]: AnyValue };

export class MapError {
  constructor(public readonly errorResult: AnyValue) { }
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
export function takeContext(): AnyValue {
  const response = messageExchange({
    kind: 'take-context'
  }, undefined, jsonReviverMapValue);

  if (response.kind === 'ok') {
    return response.context;
  } else {
    throw responseErrorToError(response);
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
    throw responseErrorToError(response);
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
    throw responseErrorToError(response);
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

// Fetch https://fetch.spec.whatwg.org/#fetch-api
// Undici types (Node.js implementation) https://github.com/nodejs/undici/blob/main/types/fetch.d.ts

// https://fetch.spec.whatwg.org/#headers-class
export type HeadersInit = Record<string, string> | [string, string][];

export class Headers implements Iterable<[string, string[]]> {
  private guard: 'immutable' | 'request' | 'request-no-cors' | 'response' | 'none';
  private headersList: Map<string, string[]>;

  constructor(init?: HeadersInit) {
    this.guard = 'none';
    this.headersList = new Map();

    if (init !== undefined) {
      this.fill(init);
    }
  }

  *[Symbol.iterator](): Iterator<[string, string[]], any, undefined> {
    return this.headersList.entries();
  }

  // https://fetch.spec.whatwg.org/#dom-headers-append
  public append(name: string, value: string): void {
    const lowercasedName = name.toLowerCase();
    // TODO: validate name and value
    if (this.has(lowercasedName)) {
      const originalValue = this.headersList.get(lowercasedName) ?? [];
      this.headersList.set(lowercasedName, [...originalValue, value]);
    } else {
      this.headersList.set(lowercasedName, [value]);
    }
  }

  // https://fetch.spec.whatwg.org/#dom-headers-delete
  public delete(name: string): void {
    this.headersList.delete(name.toLowerCase());
  }

  // https://fetch.spec.whatwg.org/#dom-headers-get
  public get(name: string): string | null {
    const values = this.headersList.get(name.toLowerCase());
    if (values === undefined) {
      return null;
    }

    return values.join(', ');
  }

  // https://fetch.spec.whatwg.org/#dom-headers-getsetcookie
  public getSetCookie(): string[] {
    return this.headersList.get('set-cookie') ?? [];
  }

  // https://fetch.spec.whatwg.org/#dom-headers-has
  public has(name: string): boolean {
    return this.headersList.has(name.toLowerCase());
  }

  // https://fetch.spec.whatwg.org/#dom-headers-set
  public set(name: string, value: string): void {
    this.headersList.set(name.toLowerCase(), [value]);
  }

  private fill(object: HeadersInit) {
    if (Array.isArray(object)) {
      for (const header of object) {
        if (header.length !== 2) {
          throw new TypeError(`Expected name/value pair to be length 2, found ${header.length}.`)
        }

        this.append(header[0], header[1]);
      }
    } else if (typeof object === 'object' && object !== null) {
      for (const [name, value] of Object.entries(object)) {
        this.append(name, value);
      }
    } else {
      throw new TypeError("Headers must be: { string: string[] } | [string, string][]");
    }
  }
}

/**
 * Supports subset of https://fetch.spec.whatwg.org/#request-class
 * - url
 * - method
 * - headers
 * 
 * Adds custom property **security**
 */
class Request implements Body {
  public readonly url: string;
  public readonly method: string;
  public readonly headers: Headers;
  public readonly security: string | undefined;

  #body?: BodyInit;

  constructor(input: RequestInfo, init: RequestInit = {}) {
    // TODO validate init for semantics eg. body with get method
    // TODO validate request been instantiated correctly

    this.method = init.method ?? 'GET';
    this.headers = new Headers(init.headers);
    this.security = init.security;
    this.#body = init.body;

    if (input instanceof Request) {
      this.url = input.url;
      this.method = this.method ?? input.method;
      this.headers = this.headers ?? input.headers;
      this.security = this.security ?? input.security;
      this.#body = this.#body || init.body;
    } else {
      this.url = input;
    }
  }

  public get body(): ReadableStream | null {
    if (this.#body === null) {
      return null;
    }

    if (this.#body instanceof ReadableStream) {
      return this.#body;
    }

    throw new Error(); // TODO
  }

  public get bodyUsed(): boolean {
    throw new Error('BodyUsed not implemented.'); // TODO
  }

  public arrayBuffer(): ArrayBuffer {
    throw new Error('Method arrayBuffer() not implemented.'); // TODO
  }

  public blob(): Blob {
    throw new Error('Method blob() not implemented.'); // TODO
  }

  public formData(): FormData {
    throw new Error('Method formData() not implemented.'); // TODO
  }

  public json() {
    throw new Error('Method json() not implemented.'); // TODO
  }

  public text(): string {
    throw new Error('Method text() not implemented.'); // TODO
  }
}

export type USVString = string;
export type RequestInfo = USVString | Request;
export interface RequestInit {
  method?: string,
  headers?: HeadersInit,
  query?: MultiMap,
  body?: BodyInit,
  security?: string,
}

// https://fetch.spec.whatwg.org/#response-class
type ResponseMessage = {
  kind: 'ok';
  status: number,
  headers: Record<string, string[]>,
  body_stream?: number;
} | {
  kind: 'err',
  error_code: number,
  message: string,
};

export type XMLHttpRequestBodyInit = Buffer | USVString; // TODO: missing Blob, BufferSource, FormData, URLSearchParams
export type BodyInit = XMLHttpRequestBodyInit | ReadableStream;

export type ResponseInit = {
  status: number,
  statusText: string,
  headers: HeadersInit,
};
export enum ResponseType { 'basic', 'cors', 'default', 'error', 'opaque', 'opaqueredirect' };
export class Response implements Body {
  #handle: number;
  #response: ResponseMessage | undefined;
  #body: BodyInit | undefined;
  #init: ResponseInit;

  #status: number | undefined;
  #headers: Headers | undefined;
  #bodyStream: ByteStream | undefined;

  public readonly type: ResponseType;

  constructor(
    handle: number,
    body?: BodyInit,
    init: ResponseInit = { status: 200, statusText: '', headers: {} }
  ) {
    this.#handle = handle;
    this.#body = body;
    this.#init = init;
    this.type = ResponseType.default;
  }

  public get url(): USVString {
    return ''; // TODO: set it in fetch function
  }

  public get redirected(): boolean {
    return false; // TODO: do we know from responsemessage?
  }

  public get status(): number {
    if (this.#status === undefined) {
      if (this.response.kind === 'ok') {
        this.#status = this.response.status;
      } else {
        this.#status = 0;
      }
    }

    return this.#status;
  }

  public get ok(): boolean {
    if (this.status >= 200 && this.status <= 299) {
      return true;
    }
    return false;
  }

  public get statusText(): string {
    return '';
  }

  public get headers(): Headers {
    if (this.#headers === undefined) {
      if (this.response.kind === 'ok') {
        this.#headers = new Headers();
        for (const [name, values] of Object.entries(this.response.headers)) {
          for (const value of values) {
            this.#headers.append(name, value);
          }
        }
      } else {
        this.#headers = new Headers();
      }
    }

    return this.#headers;
  }

  public arrayBuffer(): ArrayBuffer {
    throw new Error('Method arrayBuffer() not implemented.'); // TODO
  }

  public blob(): Blob {
    throw new Error('Method blob() not implemented.'); // TODO
  }

  public formData(): FormData {
    throw new Error('Method formData() not implemented.'); // TODO
  }

  public json(): any {
    const text = this.text();

    if (text === undefined || text === '') {
      return undefined;
    }

    return JSON.parse(text);
  }

  public text(): string {
    const bytes = this.bodyBytes();
    if (bytes.len === 0) {
      return '';
    }

    // TODO: possibly infer encoding from headers?
    return bytes.decode();
  }

  public get body(): ReadableStream | null {
    if (this.#bodyStream === undefined) {
      return null;
    }

    return new ReadableStream();
  };

  public get bodyUsed(): boolean {
    throw new Error('BodyUsed not implemented.'); // TODO
  }

  private get response(): ResponseMessage {
    if (this.#response === undefined) {
      this.#response = messageExchange({
        kind: 'http-call-head',
        handle: this.#handle
      }) as ResponseMessage;
    }

    return this.#response;
  }

  private bodyBytes(): Bytes {
    // TODO work with #body

    if (this.#bodyStream === undefined) {
      if (this.response.kind === 'ok' && this.response.body_stream) {
        this.#bodyStream = new ByteStream(this.response.body_stream);
      } else {
        return new Bytes(Uint8Array.from([]), 0);
      }
    }

    const buffer = this.#bodyStream.readToEnd();
    this.#bodyStream.close();

    return buffer;
  }
}

// https://fetch.spec.whatwg.org/#body-mixin
export interface Body {
  readonly body: ReadableStream | null;
  readonly bodyUsed: boolean;
  // TODO: per specification all should be promises: Promise<ArrayBuffer>
  arrayBuffer(): ArrayBuffer;
  blob(): Blob;
  formData(): FormData;
  json(): any;
  text(): USVString;
}

export interface QueuingStrategy {
  highWaterMark?: number;
  size?: number;
}

// https://streams.spec.whatwg.org/#rs-class-definition
/**
 * Not supported
 */
export class ReadableStream {
  constructor(private readonly underlyingSource?: any, private readonly strategy: QueuingStrategy = {}) {
    throw new Error('ReadableStream is not implemented.');
  }

  public static from(): ReadableStream {
    return new ReadableStream();
  }
}

/**
 * Not supported
 */
export class Blob {
  // TODO implement
}

/**
 * Not supported
 */
export class FormData {
  // TODO implement
}

// https://fetch.spec.whatwg.org/#fetch-api
export function fetch(input: RequestInfo, init: RequestInit = {}): Response {
  const url = typeof input === 'string' ? input : input.url;
  const headers = new Headers(init.headers);

  let finalBody: number[] | undefined;
  let body: BodyInit | ReadableStream | undefined = init.body;
  if (input instanceof Request && input.body !== null) {
    body = input.body;
  }

  if (body !== undefined && body !== null) {
    const contentType = headers.get('content-type') ?? 'application/json';

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

    // turn Bytes into number[] to serialize correctly
    finalBody = Array.from(bodyBytes.data);
  }

  const response = messageExchange({
    kind: 'http-call',
    url,
    method: init.method ?? 'GET',
    headers: headersToJson(headers), // TODO: serialize Headers to HeradersInit
    query: ensureMultimap(init.query ?? {}),
    body: finalBody,
    security: init.security,
  });

  if (response.kind === 'ok') {
    return new Response(response.handle);
  } else {
    throw responseErrorToError(response);
  }
}

function headersToJson(headers: Headers): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const [key, value] of headers) {
    result[key] = value;
  }

  return result;
}
