import { Bytes } from './bytes';
import type { Encoding } from './types';

export class Buffer {
  static from(value: unknown, encoding: Encoding = 'utf8'): Buffer {
    if (typeof value === 'string') {
      return new Buffer(Bytes.encode(value, encoding));
    }

    if (Bytes.isBytes(value)) {
      return new Buffer(value);
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

    return value instanceof Buffer;
  }

  static concat(list: Buffer[], totalLength?: number): Buffer {
    if (totalLength == undefined) {
      totalLength = list.reduce((acc, curr) => acc + curr.length, 0)
    }

    const bytes = Bytes.withCapacity(totalLength)
    for (const buf of list) {
      if (bytes.len === bytes.capacity) {
        break;
      }
      
      const remaining = bytes.capacity - bytes.len;
      if (buf.length <= remaining) {
        bytes.extend(buf.inner.data);
      } else {
        bytes.extend(buf.inner.data.subarray(0, remaining));
      }
    }

    return new Buffer(bytes)
  }

  #inner: Bytes;
  private constructor(inner: Bytes) {
    this.#inner = inner;
  }

  /** @internal */
  get inner(): Bytes {
    return this.#inner;
  }

  get length(): number {
    return this.#inner.len;
  }

  public toString(encoding: Encoding = 'utf8'): string {
    return this.#inner.decode(encoding);
  }
}
