declare const __ffi: StdFfi;
declare type StdFfi = {
  unstable: {
    // messages
    message_exchange(message: string): string,
    // streams
    stream_read(handle: number, out: ArrayBuffer): number,
    stream_write(handle: number, data: ArrayBuffer): number,
    stream_close(handle: number): void,
    // coding
    bytes_to_utf8(bytes: ArrayBuffer): string,
    utf8_to_bytes(utf8: string): ArrayBuffer,
    bytes_to_base64(bytes: ArrayBuffer): string,
    base64_to_bytes(base64: string): ArrayBuffer,
    record_to_urlencoded(value: Record<string, string[]>): string,
    // env
    print(message: string): void,
    printDebug(...data: unknown[]): void,
    // url
    url_parse(url: string, base?: string): any,
    url_format(url: string): string,
  }
};
