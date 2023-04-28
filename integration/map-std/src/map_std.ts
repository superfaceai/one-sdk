import { Buffer } from './internal/node_compat';
import * as unstable from './unstable';

export declare const globalThis: {
  Buffer: typeof Buffer,
  std: {
    unstable: typeof unstable
  },
  _start(usecaseName: string): void
};
globalThis.std = {
  unstable
};
globalThis.Buffer = Buffer;

export type UsecaseFn = (input: unstable.AnyValue, parameters: Record<string, unstable.AnyValue>, services: Record<string, string>) => unstable.AnyValue;
globalThis._start = (usecaseName: string): void => {
  const { input, parameters, services } = globalThis.std.unstable.takeInput() as any;

  try {
    const result = (globalThis[usecaseName] as UsecaseFn)(input, parameters, services);
    globalThis.std.unstable.setOutputSuccess(result);
  } catch (e) {
    if (e instanceof unstable.MapError) {
      globalThis.std.unstable.setOutputFailure(e.errorResult);
    } else {
      throw e;
    }
  }
}
