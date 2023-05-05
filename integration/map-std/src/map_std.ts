import { Buffer as NodeBuffer } from './internal/node_compat';
import * as unstable from './unstable';

declare global {
  type UsecaseFn = (context: {input: unstable.AnyValue, parameters: Record<string, unstable.AnyValue>, services: Record<string, string> }) => unstable.AnyValue;
  var std: {
    unstable: typeof unstable
  };
  function _start(usecaseName: string): void;
  var Buffer: typeof NodeBuffer;
};
globalThis.std = { unstable };
globalThis.Buffer = NodeBuffer;

globalThis._start = (usecaseName: string): void => {
  const context = globalThis.std.unstable.takeContext() as Record<string, unstable.AnyValue>;

  // TODO: this is best-effort - these are functions currently visible in the global scope
  const globalSymbols = new Set(['_start', 'Object', 'Function', 'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'InternalError', 'AggregateError', 'Array', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape', 'unescape', '__date_clock', 'Number', 'Boolean', 'String', 'Symbol', 'eval', 'Date', 'RegExp', 'Proxy', 'Map', 'Set', 'WeakMap', 'WeakSet', 'ArrayBuffer', 'SharedArrayBuffer', 'Uint8ClampedArray', 'Int8Array', 'Uint8Array', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'BigInt64Array', 'BigUint64Array', 'Float32Array', 'Float64Array', 'DataView', 'Promise', 'BigInt', 'Buffer']);
  const usecases = Object.getOwnPropertyNames(globalThis).filter(
    v => typeof (globalThis as any)[v] === 'function' && !globalSymbols.has(v)
  );
  if (!usecases.includes(usecaseName)) {
    throw new Error(`Usecase ${usecaseName} not defined, usecases: ${usecases.join(', ')}`);
  }
  
  const usecase: UsecaseFn = (globalThis as any)[usecaseName];
  try {
    const result = usecase({
      input: context.input,
      parameters: context.parameters as Record<string, unstable.AnyValue>,
      services: context.services as Record<string, string>
    });
    globalThis.std.unstable.setOutputSuccess(result);
  } catch (e) {
    if (e instanceof unstable.MapError) {
      globalThis.std.unstable.setOutputFailure(e.errorResult);
    } else {
      throw e;
    }
  }
}
