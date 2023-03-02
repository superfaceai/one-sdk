// Node: This import isn't really here to import the decorator, it is here because the decorator drives a compiler
// transform pass which generates code that requires this import
import { JSON } from 'json-as';

import { EXCHANGE_MESSAGE, HeadersMultiMap } from './unstable';

class InHttpCall {
	readonly kind: 'http-call' = 'http-call';
	
	constructor(
		public readonly url: string,
		public readonly method: string,
		public readonly headers: HeadersMultiMap,
		public readonly body: ArrayBuffer | null
	) {}

	to_json(): string {
		return `{"kind":"http-call","url":"${this.url}","method":"${this.method}"}`;
	}
}
class OutHttpCall {
	// TODO: union types are not supported - figure out how to model this better
	// for now we just make this an implementational detail and ignore the hack
	public kind: string = 'err'
	// ok
	public handle: u32 = 0
	// err
	public error: string = '<invalid>'

	from_json(json: string): void {

	}
}

class InHttpCallHead {
	readonly kind: 'http-call-head' = 'http-call-head';

	constructor(
		private readonly handle: usize
	) {}

	to_json(): string {
		return '';
	}
}
class OutHttpCallHead {
	// TODO: union types not supported
	public kind: string = 'err'
	// ok
	public status: u16 = 0
	public headers: HeadersMultiMap = new Map()
	public body_stream: string | null = null // TODO: streams
	// err
	public error: string = '<invalid>'

	from_json(json: string): void {

	}
}

export class HttpResponse {
	constructor(
		public readonly status: number,
		public readonly headers: HeadersMultiMap,
		private readonly body_stream: string | null // TODO: streams
	) {}
}
export class HttpRequest {	
	private constructor(
		private readonly handle: usize
	) {}

	public static fire(url: string, method: string, headers: HeadersMultiMap, body: ArrayBuffer | null): HttpRequest {
		const response = EXCHANGE_MESSAGE.invoke_json<InHttpCall, OutHttpCall>(new InHttpCall(url, method, headers, body));

		if (response.kind === 'ok') {
			return new HttpRequest(response.handle);
		} else {
			throw new Error(response.error);
		}
	}

	public toString(): string {
		return `HttpRequest(${this.handle})`;
	}

	public response(): HttpResponse {
		const response = EXCHANGE_MESSAGE.invoke_json<InHttpCallHead, OutHttpCallHead>(new InHttpCallHead(this.handle));
		
		if (response.kind === 'ok') {
			return new HttpResponse(response.status, response.headers, response.body_stream);
		} else {
			throw new Error(response.error);
		}
	}
}
