import { Buffer as NodeBuffer } from './internal/node_compat';
import * as unstable from './unstable';

declare global {
  // types
  /** Any value that can be safely passed in and out of a map. */
  type AnyValue = unstable.AnyValue;
  /** The first argument of a use case. */
  type UseCaseContext<I extends AnyValue = AnyValue> = {
    input: I,
    parameters: Record<string, string>,
    services: Record<string, string>
  };
  /** The error thrown to return a defined error. */
  type MapError<R extends AnyValue = AnyValue> = unstable.MapError<R>;
  /** Safety of a use case. */
  type Safety = 'safe' | 'unsafe' | 'idempotent';
  type UseCaseOptions = {
    safety: Safety;
    input: Record<string, AnyValue>;
    result: AnyValue;
    error: AnyValue;
  };
  /** Type for defining a use case. */
  type UseCase<O extends UseCaseOptions> = {
    (context: UseCaseContext<O['input']>): O['result']
    examples?: UseCaseExample<O>[]
  }
  type UseCaseExample<O extends UseCaseOptions> = {
    name?: string;
    input: O['input'];
    result: O['result'];
  } | {
    name?: string;
    input: O['input'];
    error: O['error'];
  };
  // globals
  var std: {
    unstable: typeof unstable
  };
  var Buffer: typeof NodeBuffer;
  // functions
  function _start(useCaseName: string): void;
};
globalThis.std = { unstable };
globalThis.Buffer = NodeBuffer;

globalThis._start = function _start(useCaseName: string): void {
  const context = globalThis.std.unstable.takeContext() as Record<string, unstable.AnyValue>;

  // search for the use case as a freestanding function
  // TODO: this is best-effort - these are functions currently visible in the global scope
  const globalSymbols = new Set(['_start', 'Object', 'Function', 'Error', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError', 'InternalError', 'AggregateError', 'Array', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape', 'unescape', '__date_clock', 'Number', 'Boolean', 'String', 'Symbol', 'eval', 'Date', 'RegExp', 'Proxy', 'Map', 'Set', 'WeakMap', 'WeakSet', 'ArrayBuffer', 'SharedArrayBuffer', 'Uint8ClampedArray', 'Int8Array', 'Uint8Array', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'BigInt64Array', 'BigUint64Array', 'Float32Array', 'Float64Array', 'DataView', 'Promise', 'BigInt', 'Buffer']);
  const usecases = Object.getOwnPropertyNames(globalThis).filter(
    v => typeof (globalThis as any)[v] === 'function' && !globalSymbols.has(v)
  );
  if (!usecases.includes(useCaseName)) {
    throw new Error(`Use case ${useCaseName} not defined, use cases: ${usecases.join(', ')}`);
  }

  const usecase: UseCase<UseCaseOptions> = (globalThis as any)[useCaseName];

  try {
    const result = usecase({
      input: context.input as Record<string, AnyValue>,
      parameters: context.parameters as Record<string, string>,
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
