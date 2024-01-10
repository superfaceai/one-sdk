export abstract class AppBase {
  abstract get memory(): WebAssembly.Memory;
  get memoryBytes(): Uint8Array {
    return new Uint8Array(this.memory.buffer);
  }
  get memoryView(): DataView {
    return new DataView(this.memory.buffer);
  }
}
export abstract class AppContext extends AppBase {
  abstract handleMessage(message: any): Promise<any>;
  abstract readStream(handle: number, out: Uint8Array): Promise<number>;
  abstract writeStream(handle: number, data: Uint8Array): Promise<number>;
  abstract closeStream(handle: number): Promise<void>;
}
export abstract class AppContextSync extends AppBase {
  abstract handleMessage(message: any): any;
  abstract readStream(handle: number, out: Uint8Array): number;
  abstract writeStream(handle: number, data: Uint8Array): number;
  abstract closeStream(handle: number): void;
}
export interface TextCoder {
  decodeUtf8(buffer: ArrayBufferLike): string;
  encodeUtf8(string: string): ArrayBuffer;
}
