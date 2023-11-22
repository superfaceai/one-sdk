export type Stream = {
  /** Reads up to `out.length` bytes from the stream, returns number of bytes read or throws a `WasiError`. */
  read(out: Uint8Array): Promise<number>;
  /** Writes up to `data.length` bytes into the stream, returns number of bytes written or throws a `WasiError`. */
  write(data: Uint8Array): Promise<number>;
  /** Closes the stream, returns undefined or throws a `WasiError`. */
  close(): Promise<void>;
};
export class ReadableStreamAdapter implements Stream {
  private chunks: Uint8Array[];
  private readonly reader?: ReadableStreamDefaultReader<Uint8Array>;
  constructor(stream: ReadableStream<Uint8Array> | null) {
    this.reader = stream?.getReader();
    this.chunks = [];
  }
  async read(out: Uint8Array): Promise<number> {
    if (this.reader === undefined) {
      return 0;
    }

    if (this.chunks.length === 0) {
      const readResult = await this.reader.read();
      if (readResult.value === undefined) {
        return 0;
      }

      this.chunks.push(readResult.value);
    }

    // TODO: coalesce multiple smaller chunks into one read
    let chunk = this.chunks.shift()!;
    if (chunk.byteLength > out.byteLength) {
      const remaining = chunk.subarray(out.byteLength);
      chunk = chunk.subarray(0, out.byteLength);

      this.chunks.unshift(remaining);
    }

    const count = Math.min(chunk.byteLength, out.byteLength);
    for (let i = 0; i < count; i += 1) {
      out[i] = chunk[i];
    }

    return count;
  }
  async write(data: Uint8Array): Promise<number> {
    throw new Error('not implemented');
  }
  async close(): Promise<void> {
    // TODO: what to do here?
  }
}