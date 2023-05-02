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

  try {
    const result = ((globalThis as unknown as Record<string, UsecaseFn>)[usecaseName])({
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
