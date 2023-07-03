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
export type HeadersInit = Record<USVString, USVString> | [USVString, USVString][];
export class Headers implements Iterable<[USVString, USVString]> {
  private guard: 'immutable' | 'request' | 'request-no-cors' | 'response' | 'none';
  private headersList: [USVString, USVString][];

  constructor(init?: HeadersInit) {
    this.guard = 'none';
    this.headersList = [];

    if (init !== undefined) {
      this.fill(init);
    }
  }

  *[Symbol.iterator](): Iterator<[USVString, USVString], any, undefined> {
    for (const [name, value] of this.toMap()) {
      yield [name, value];
    }
  }

  // https://fetch.spec.whatwg.org/#dom-headers-append
  public append(name: USVString, value: USVString): void {
    this.headersList.push([name, value]);
  }

  // https://fetch.spec.whatwg.org/#dom-headers-delete
  public delete(name: USVString): void {
    const lowerCaseName = name.toLowerCase();
    this.headersList = this.headersList.filter(([name]) => name.toLowerCase() !== lowerCaseName);
  }

  // https://fetch.spec.whatwg.org/#dom-headers-get
  public get(name: USVString): USVString | null {
    const loweCaseName = name.toLowerCase();
    const values = [];

    for (const [headerName, headerValue] of this.headersList) {
      if (headerName.toLowerCase() === loweCaseName) {
        values.push(headerValue);
      }
    }

    if (values.length === 0) {
      return null;
    }

    return values.reduce(
      (acc, curr) => { return acc === '' ? curr : this.foldValues(acc, curr); },
      ''
    );
  }

  // https://fetch.spec.whatwg.org/#dom-headers-getsetcookie
  public getSetCookie(): USVString[] {
    const cookies: USVString[] = [];

    for (const [headerName, headerValue] of this.headersList) {
      if (headerName.toLowerCase() === 'set-cookie') {
        cookies.push(headerValue);
      }
    }

    return cookies;
  }

  // https://fetch.spec.whatwg.org/#dom-headers-has
  public has(name: USVString): boolean {
    const lowerCaseName = name.toLowerCase();
    for (const [headerName] of this.headersList) {
      if (headerName.toLowerCase() === lowerCaseName) {
        return true;
      }
    }

    return false;
  }

  // https://fetch.spec.whatwg.org/#dom-headers-set
  public set(name: USVString, value: USVString): void {
    this.delete(name);
    this.headersList.push([name, value]);
  }

  public forEach(
    callbackfn: (key: USVString, value: USVString, iterable: Headers) => void,
    thisArg?: Map<USVString, USVString>
  ): void {
    this.toMap().forEach((value, key) => { callbackfn(value, key, this) }, thisArg);
  }

  public keys() {
    return this.toMap().keys();
  }

  public values() {
    return this.toMap().values();
  }

  public entries() {
    return this.toMap().entries();
  }

  public *raw() {
    for (const header of this.headersList) {
      yield header;
    }
  }

  private toMap(): Map<USVString, USVString> {
    const map = new Map<USVString, USVString>();

    for (const [name, value] of this.headersList) {
      const lowerCaseName = name.toLowerCase();
      const originalValue = map.get(lowerCaseName);
      if (originalValue) {
        map.set(lowerCaseName, this.foldValues(originalValue, value));
      } else {
        map.set(lowerCaseName, value);
      }
    }

    return map;
  }

  private foldValues(a: USVString, b: USVString): USVString {
    return `${a}, ${b}`;
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

// https://url.spec.whatwg.org/#url-class
export class URL {
  private parts: any;
  _searchParams: URLSearchParams;

  constructor(url: USVString, base?: USVString) {
    this.parts = __ffi.unstable.url_parse(url, base);
    this._searchParams = new URLSearchParams(this.parts.search);
  }

  get href(): string {
    return this.toJSON();
  }
  get origin(): string {
    return this.parts.origin ?? "";
  }

  get protocol(): string {
    return this.parts.protocol.endsWith(':') ? this.parts.protocol : this.parts.protocol + ':';
  }
  set protocol(value: string) {
    this.parts.protocol = value;
  }

  get username(): string {
    return this.parts.usernamel
  }
  set username(value: string) {
    this.parts.username = this.username;
  }

  get password(): string {
    return this.parts.password;
  }
  set password(value: string) {
    this.parts.password = value;
  }

  get host(): string {
    return this.parts.host;
  }
  set host(value: string) {
    this.parts.host = value;
  }

  get hostname(): string {
    return this.parts.hostname;
  }
  set hostname(value: string) {
    this.hostname = value;
  }

  get port(): string {
    return this.parts.port;
  }
  set port(value: string) {
    this.parts.port = value;
  }

  get pathname(): string {
    return this.parts.pathname;
  }
  set pathname(value: string) {
    this.parts.pathname = value;
  }

  get search(): string {
    return this.parts.search;
  }
  set search(value: string) {
    this.parts.search = new URLSearchParams(value);
  }

  get searchParams(): URLSearchParams {
    return this._searchParams;
  }

  get hash(): string {
    return this.parts.hash;
  }
  set hash(value: string) {
    this.parts.hash = value;
  }

  public toString(): string {
    return __ffi.unstable.url_format({
      host: this.host,
      hostname: this.hostname,
      origin: this.origin,
      password: this.password,
      pathname: this.pathname,
      port: this.port,
      protocol: this.protocol,
      search: this._searchParams.toString(),
      username: this.username,
    });
  }

  public toJSON(): any {
    return this.toString();
  }
}

// https://url.spec.whatwg.org/#interface-urlsearchparams
export type URLSearchParamsInit = [USVString, USVString][] | Record<USVString, USVString> | USVString;
export class URLSearchParams {
  private list: [string, string][];

  constructor(init?: URLSearchParamsInit) {
    this.list = [];

    if (init) {
      this.fill(init);
    }
  }

  // https://url.spec.whatwg.org/#dom-urlsearchparams-append
  public append(name: USVString, value: USVString) {
    this.list.push([name, value]);
  }

  // https://url.spec.whatwg.org/#dom-urlsearchparams-delete
  public delete(name: USVString) {
    const lowerCaseName = name.toLowerCase();
    this.list = this.list.filter(([name]) => name.toLowerCase() !== lowerCaseName);
  }

  // https://url.spec.whatwg.org/#dom-urlsearchparams-get
  public get(name: USVString): USVString | undefined {
    for (const param in this.list) {
      if (name === param[0]) {
        return param[1];
      }
    }

    return undefined;
  }

  // https://url.spec.whatwg.org/#dom-urlsearchparams-getall
  public getAll(name: USVString): USVString[] {
    const values = [];

    for (const param in this.list) {
      if (name === param[0]) {
        values.push(param[1]);
      }
    }

    return values;
  }

  // https://url.spec.whatwg.org/#dom-urlsearchparams-has
  public has(name: USVString): boolean {

    for (const param in this.list) {
      if (name === param[0]) {
        return true;
      }
    }

    return false;
  }

  // https://url.spec.whatwg.org/#dom-urlsearchparams-set
  public set(name: USVString, value: USVString): void {
    this.delete(name);
    this.list.push([name, value]);
  }

  // https://url.spec.whatwg.org/#dom-urlsearchparams-sort
  public sort(): void {
    this.list = this.list.sort((a, b) => a[0].localeCompare(b[0]));
  }

  *[Symbol.iterator](): Iterator<[USVString, USVString], any, undefined> {
    for (const [name, value] of this.list) {
      yield [name, value];
    }
  }

  public toString(): string {
    const pairs = [];

    for (const param of this.list) {
      pairs.push(param.join('='));
    }

    return pairs.join('&');
  }

  public *raw() {
    for (const param of this.list) {
      yield param;
    }
  }

  private fill(init: URLSearchParamsInit) {
    if (Array.isArray(init)) {
      for (const [name, value] of init) {
        this.list.push([name, value]);
      }
    } else if (typeof init === 'string') {
      for (const pair of init.split('&')) {
        const [name, value] = pair.split('=');
        this.list.push([name, value]);
      }
    } else if (typeof init === 'object' && init !== null) {
      for (const [name, value] of Object.entries<USVString>(init)) {
        this.list.push([name, `${value}`]);
      }
    } else {
      throw new TypeError("init value must be one of '{ string: string } | [string, string][] | string'");
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
    throw new Error('Response.redeirected() is not supported'); // TODO: do we know from response message?
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

function headersToJson(headers: Headers): [string, string][] {
  const result: [string, string][] = [];

  for (const header of headers.raw()) {
    result.push(header)
  }

  return result;
}