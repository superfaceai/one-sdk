import type { TextCoder, AppContext, AppContextSync } from './interfaces.js';
import { Asyncify, AsyncifyState } from './asyncify.js'
import { HandleMap } from './handle_map.js'
import { WasiErrno } from './error.js';

type AbiResult = number;
// @ts-ignore ignore the unused parameter
type Ptr<T> = number;
type Size = number;

type Fn<A extends unknown[], R> = (...args: A) => R;
function strace<A extends unknown[], R>(name: string, fn: Fn<A, R>, asyncify: Asyncify): Fn<A, R> {
  return (...args: A): R => {
    const result: any = fn(...args);

    // TODO: control this from variable
    if (asyncify.getState() === AsyncifyState.Normal) {
      console.debug(`host: [strace] ${name}(${args}) = ${result}`);
    } else {
      console.debug(`host: [strace] ${name}(${args}) = <async suspended (${result})>`);
    }

    return result;
  }
}
// @ts-ignore ignore unused function
function strace_module(moduleName: string, module: WebAssembly.ModuleImports, asyncify: Asyncify): WebAssembly.ModuleImports {
  for (const fnName of Object.keys(module)) {
    const fn: any = module[fnName];
    const name = `${moduleName}::${fnName}`;
    module[fnName] = strace(name, fn, asyncify);
  }

  return module;
}

function join_abi_result(lower: number, upper: number): number {
  const l = lower & 0x7FFFFFFF;
  const u = (upper & 0x1) << 31;

  return l | u;
}
// @ts-ignore ignore unused funtion
function split_abi_result(value: number): [lower: number, upper: number] {
  const lower = value & 0x7FFFFFFF;
  const upper = (value >> 31) & 0x1;

  return [lower, upper];
}
function abi_ok(value: number): number {
  return join_abi_result(value, 0);
}
function abi_err(value: number): number {
  return join_abi_result(value, 1);
}

function writeBytes(source: ArrayBuffer, dest: Uint8Array) {
  const src = new Uint8Array(source);
  for (let i = 0; i < src.byteLength; i += 1) {
    dest[i] = src[i];
  }
}

export function link(app: AppContext, textCoder: TextCoder, asyncify: Asyncify): WebAssembly.Imports {
  const messageStore = new HandleMap<ArrayBuffer>();

  async function __export_message_exchange(msg_ptr: Ptr<8>, msg_len: Size, out_ptr: Ptr<8>, out_len: Size, ret_handle: Ptr<32>): Promise<Size> {
    const msg = JSON.parse(textCoder.decodeUtf8(
      app.memoryBytes.subarray(msg_ptr, msg_ptr + msg_len)
    ));
    const response = await app.handleMessage(msg);

    let messageHandle = 0;
    const responseBytes = textCoder.encodeUtf8(JSON.stringify(response));
    if (responseBytes.byteLength > out_len) {
      messageHandle = messageStore.insert(responseBytes);
    } else {
      const out = app.memoryBytes.subarray(out_ptr, out_ptr + out_len);
      writeBytes(responseBytes, out);
    }

    app.memoryView.setInt32(ret_handle, messageHandle, true);
    return responseBytes.byteLength;
  }
  function __export_message_exchange_retrieve(handle: number, out_ptr: Ptr<8>, out_len: Size): AbiResult {
    const responseBytes = messageStore.remove(handle);
    if (responseBytes === undefined) {
      return abi_err(WasiErrno.EBADF);
    }
    if (out_len < responseBytes.byteLength) {
      return abi_err(WasiErrno.ERANGE);
    }

    const out = app.memoryBytes.subarray(out_ptr, out_ptr + out_len);
    writeBytes(responseBytes, out);

    return abi_ok(responseBytes.byteLength);
  }

  async function __export_stream_read(handle: number, out_ptr: Ptr<8>, out_len: Size): Promise<AbiResult> {
    const out = app.memoryBytes.subarray(out_ptr, out_ptr + out_len);

    return app.readStream(handle, out).then(c => abi_ok(c), e => abi_err(e.errno));
  }
  async function __export_stream_write(handle: number, in_ptr: Ptr<8>, in_len: Size): Promise<AbiResult> {
    const data = app.memoryBytes.subarray(in_ptr, in_ptr + in_len);

    return app.writeStream(handle, data).then(c => abi_ok(c), e => abi_err(e.errno));
  }
  async function __export_stream_close(handle: number): Promise<AbiResult> {
    return await app.closeStream(handle).then(_ => abi_ok(0), e => abi_err(e.errno))
  }

  return {
    sf_host_unstable: {
      message_exchange: asyncify.wrapImport(__export_message_exchange, 0),
      message_exchange_retrieve: __export_message_exchange_retrieve,
      stream_read: asyncify.wrapImport(__export_stream_read, 0),
      stream_write: asyncify.wrapImport(__export_stream_write, 0),
      stream_close: asyncify.wrapImport(__export_stream_close, 0)
    }
  }
}

export function linkSync(app: AppContextSync, textCoder: TextCoder): WebAssembly.Imports {
  const messageStore = new HandleMap<ArrayBuffer>();

  function __export_message_exchange(msg_ptr: Ptr<8>, msg_len: Size, out_ptr: Ptr<8>, out_len: Size, ret_handle: Ptr<32>): Size {
    const msg = JSON.parse(textCoder.decodeUtf8(
      app.memoryBytes.subarray(msg_ptr, msg_ptr + msg_len)
    ));
    const response = app.handleMessage(msg);

    let messageHandle = 0;
    const responseBytes = textCoder.encodeUtf8(JSON.stringify(response));
    if (responseBytes.byteLength > out_len) {
      messageHandle = messageStore.insert(responseBytes);
    } else {
      const out = app.memoryBytes.subarray(out_ptr, out_ptr + out_len);
      writeBytes(responseBytes, out);
    }

    app.memoryView.setInt32(ret_handle, messageHandle, true);
    return responseBytes.byteLength;
  }
  function __export_message_exchange_retrieve(handle: number, out_ptr: Ptr<8>, out_len: Size): AbiResult {
    const responseBytes = messageStore.remove(handle);
    if (responseBytes === undefined) {
      return abi_err(WasiErrno.EBADF);
    }
    if (out_len < responseBytes.byteLength) {
      return abi_err(WasiErrno.ERANGE);
    }

    const out = app.memoryBytes.subarray(out_ptr, out_ptr + out_len);
    writeBytes(responseBytes, out);

    return abi_ok(responseBytes.byteLength);
  }

  function __export_stream_read(handle: number, out_ptr: Ptr<8>, out_len: Size): AbiResult {
    const out = app.memoryBytes.subarray(out_ptr, out_ptr + out_len);

    try {
      const c = app.readStream(handle, out)
      return abi_ok(c)
    } catch (e: any) {
      return abi_err(e.errno)
    }
  }
  function __export_stream_write(handle: number, in_ptr: Ptr<8>, in_len: Size): AbiResult {
    const data = app.memoryBytes.subarray(in_ptr, in_ptr + in_len);

    try {
      const c = app.writeStream(handle, data)
      return abi_ok(c)
    } catch (e: any) {
      return abi_err(e.errno)
    }
  }
  function __export_stream_close(handle: number): AbiResult {
    try {
      app.closeStream(handle)
      return abi_ok(0)
    } catch (e: any) {
      return abi_err(e.errno)
    }
  }

  return {
    sf_host_unstable: {
      message_exchange: __export_message_exchange,
      message_exchange_retrieve: __export_message_exchange_retrieve,
      stream_read: __export_stream_read,
      stream_write: __export_stream_write,
      stream_close: __export_stream_close,
    }
  }
}
