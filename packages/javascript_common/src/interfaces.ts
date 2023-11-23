export interface AppContext {
  memoryBytes: Uint8Array;
  memoryView: DataView;

  handleMessage(message: any): Promise<any>;
  readStream(handle: number, out: Uint8Array): Promise<number>;
  writeStream(handle: number, data: Uint8Array): Promise<number>;
  closeStream(handle: number): Promise<void>;
}
export interface FileSystem {
  /** Return true if the file exists (can be `stat`ed). */
  exists(path: string): Promise<boolean>;
  open(path: string, options: { createNew?: boolean, create?: boolean, truncate?: boolean, append?: boolean, write?: boolean, read?: boolean }): Promise<number>;
  /** Read bytes and write them to `out`. Returns number of bytes read. */
  read(handle: number, out: Uint8Array): Promise<number>;
  /** Write bytes from `data`. Returns number of bytes written. */
  write(handle: number, data: Uint8Array): Promise<number>;
  close(handle: number): Promise<void>;
}
export interface Network {
  fetch(
    input: RequestInfo,
    init?: RequestInit
  ): Promise<Response>
}
export interface TextCoder {
  decodeUtf8(buffer: ArrayBufferLike): string;
  encodeUtf8(string: string): ArrayBuffer;
}
export interface Timers {
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(handle: number): void;
}
export interface WasiContext {
  wasiImport: WebAssembly.ModuleImports;
  initialize(instance: object): void;
}

export interface Persistence {
  /** Persist metrics generated by the core.
   * 
   * It is up to the host platform whether to dispatch these over HTTP or log them in a file or store them somewhere else.
   * 
   * The `events` elements are guaranteed to be stringified JSON objects.
  */
  persistMetrics(events: string[]): Promise<void>;
  /** Process developer dump after the core has panicked.
   * 
   * It is up to the host platform whether to write these in a file, or write to stderr, or store them somewhere else.
   */
  persistDeveloperDump(events: string[]): Promise<void>;
}
