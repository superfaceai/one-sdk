import { Bytes } from './bytes';
import type { Encoding } from './types';

// TODO: Comlink/node map compat
export class Buffer {
	static from(value: unknown, encoding: Encoding = 'utf8'): Buffer {
		if (typeof value === 'string') {
			return new Buffer(Bytes.encode(value, encoding));
		}

		if (Buffer.isBuffer(value)) {
			return value;
		}

		if (Array.isArray(value)) {
			return new Buffer(Bytes.fromArray(value));
		}

		throw new Error('not implemented');
	}

	static isBuffer(value: unknown): value is Buffer {
		if (value === undefined || value === null) {
			return false;
		}

		if (value instanceof Buffer) {
			return true;
		}

		return false;
	}

	#inner: Bytes;
	private constructor(inner: Bytes) {
		this.#inner = inner;
	}

	/** @internal */
	get inner(): Bytes {
		return this.#inner;
	}

	public toString(encoding: Encoding = 'utf8'): string {
		return this.#inner.decode(encoding);
	}
}