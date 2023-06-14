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
  const { parameters } = options;
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

// https://fetch.spec.whatwg.org/#headers-class
export type HeadersInit = Record<string, string> | [string, string][];
export class Headers implements Iterable<[string, string]> {
  private guard: 'immutable' | 'request' | 'request-no-cors' | 'response' | 'none';
  private headersList: Map<string, string[]>;

  constructor(init?: HeadersInit) {
    this.guard = 'none';
    this.headersList = new Map();

    if (init !== undefined) {
      this.fill(init);
    }
  }

  *[Symbol.iterator](): Iterator<[string, string], any, undefined> {
    for (const [name, value] of this.headersList) {
      yield [name, value.join(',')]
    }
  }

  // https://fetch.spec.whatwg.org/#dom-headers-append
  public append(name: string, value: string): void {
    const lowercasedName = name.toLowerCase();
    // TODO: validate name and value
    if (this.has(lowercasedName)) {
      const originalValue = this.headersList.get(lowercasedName) ?? '';
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
    return this.headersList.get(name.toLowerCase())?.join(',') ?? null;
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

  public forEach(
    callbackfn: (key: string, value: string, iterable: Headers) => void,
    thisArg?: Map<string, string>
  ): void {
    this.headersList.forEach((value, key) => {
      callbackfn(value.join(','), key, this)
    }, thisArg);
  }

  public keys() {
    return this.headersList.keys();
  }

  public *values() {
    // return this.headersList.values();
    for (const values of this.headersList.values()) {
      yield values.join(',');
    }
  }

  public entries() {
    return this.headersList.entries();
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
      throw new TypeError("Headers must be: { string: string } | [string, string][]");
    }
  }
}

export type USVString = string;
export interface RequestInit {
  method?: string,
  headers?: HeadersInit,
  query?: MultiMap,
  body?: BodyInit,
  security?: string,
}
export type Request = RequestInit & { url: USVString };
export type RequestInfo = USVString | Request;

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

export type XMLHttpRequestBodyInit = Buffer | USVString; // TODO: Blob, BufferSource, FormData, URLSearchParams
export type BodyInit = XMLHttpRequestBodyInit; // TODO ReadableStream

export type ResponseInit = {
  status?: number,
  statusText?: string,
  headers?: HeadersInit,
};
export enum ResponseType { 'basic', 'cors', 'default', 'error', 'opaque', 'opaqueredirect' };
export class Response implements Body {
  #handle: number;
  #init: ResponseInit & { url: USVString };
  #body: BodyInit | undefined;
  #response: ResponseMessage | undefined;
  #status: number | undefined;
  #headers: Headers | undefined;
  #bodyStream: ByteStream | undefined;

  public readonly type: ResponseType;

  constructor(
    body?: BodyInit,
    init?: ResponseInit,
  ) {
    this.#handle = -1;
    this.#init = { url: '', status: 200, statusText: '', headers: {}, ...init };
    this.#body = body;
    this.type = ResponseType.default;
  }

  static handle(handle: number, init: ResponseInit & { url: USVString }): Response {
    const response = new Response(undefined, init);
    response.#handle = handle;
    return response;
  }

  public get url(): USVString {
    return this.#init.url;
  }

  public get redirected(): boolean {
    return false; // TODO: do we know from response message?
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
  // Per specification all should be promises: Promise<ArrayBuffer>
  // but we are trating all integration code as synchronous
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

export type BufferSource = ArrayBuffer | ArrayBufferView;
export type BlobPart = BufferSource | Blob | USVString;
/**
 * Not supported
 */
export class Blob {
  constructor(private readonly blobParts?: BlobPart[], private readonly options?: {}) {
    throw new Error('Blob is not implemented.')
  }
}

/**
 * Not supported
 */
export class FormData {
  constructor(private readonly form?: {}, private readonly submitter?: {}) {
    throw new Error('FormData is not implemented');
  }
}

// https://fetch.spec.whatwg.org/#fetch-api
/**
 * Limited and synchronous implementation of [Fetch](https://fetch.spec.whatwg.org)
 * for OneClient integration code.
 * 
 * @param input {RequestInfo}
 * @param init  {RequestInit}
 * @returns {Response}
 */
export function fetch(input: RequestInfo, init: RequestInit = {}): Response {
  const url = typeof input === 'string' ? input : input.url;
  const headers = new Headers(init.headers);

  let finalBody: number[] | undefined;
  let body: BodyInit | ReadableStream | undefined = init.body;
  if (body === undefined && typeof input === 'object') {
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
    headers: headersToJson(headers),
    query: ensureMultimap(init.query ?? {}),
    body: finalBody,
    security: init.security,
  });

  if (response.kind === 'ok') {
    return Response.handle(response.handle, { url });
  } else {
    throw responseErrorToError(response);
  }
}

function headersToJson(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of headers) {
    result[key] = value;
  }

  return result;
}
