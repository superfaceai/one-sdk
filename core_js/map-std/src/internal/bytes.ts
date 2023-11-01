import type { Encoding } from './types';

export class Bytes {
  #buffer;
  #len;

  // TODO: private
  constructor(buffer: Uint8Array, len: number) {
    this.#buffer = buffer;
    this.#len = len;
  }

  static withCapacity(capacity: number): Bytes {
    return new Bytes(new Uint8Array(capacity ?? 0), 0);
  }

  static fromArray(array: number[]): Bytes {
    return new Bytes(new Uint8Array(array), array.length);
  }

  static isBytes(value: unknown): value is Bytes {
    if (value === undefined || value === null) {
      return false;
    }

    return value instanceof Bytes;
  }

  toArray(): number[] {
    return Array.from(this.data);
  }

  get len(): number {
    return this.#len;
  }

  get capacity(): number {
    return this.#buffer.byteLength;
  }

  get data(): Uint8Array {
    return this.#buffer.subarray(0, this.len);
  }

  get uninitData(): Uint8Array {
    return this.#buffer.subarray(this.len);
  }

  reserve(additional: number) {
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

  extend(buffer: ArrayBuffer) {
    this.reserve(buffer.byteLength);
    this.#buffer.set(new Uint8Array(buffer), this.len);
    this.#len += buffer.byteLength;
  }

  decode(encoding: Encoding = 'utf8'): string {
    // TODO: again support for TypedArrays in Javy
    const buffer = this.#buffer.buffer.slice(0, this.len);

    if (encoding === 'utf8') {
      return __ffi.unstable.bytes_to_utf8(buffer);
    } else if (encoding === 'base64') {
      return __ffi.unstable.bytes_to_base64(buffer);
    }

    throw new Error(`encoding "${encoding}" not implemented`);
  }

  static encode(string: string, encoding: Encoding = 'utf8'): Bytes {
    let buffer;
    if (encoding === 'utf8') {
      buffer = __ffi.unstable.utf8_to_bytes(string);
    } else if (encoding === 'base64') {
      buffer = __ffi.unstable.base64_to_bytes(string);
    } else {
      throw new Error(`encoding "${encoding}" not implemented`);
    }

    return new Bytes(new Uint8Array(buffer), buffer.byteLength);
  }
}

export class ByteStream {
  #handle: number;
  constructor(handle: number) {
    this.#handle = handle;
  }

  public readToEnd(): Bytes {
    const buffer = Bytes.withCapacity(8192);
    // TODO: support for TypedArrays in Javy - without them we have to read into a plain ArrayBuffer (which cannot be a subarray)
    // and then copy that data into our final buffer.
    //
    // If Javy supported TypedArrays (they are supported in quickjs, just not exposed in Javy), we could directly pass a subarray
    // to the `stream_read` call and we'd only need one buffer.
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

  public close() {
    __ffi.unstable.stream_close(this.#handle);
  }
}