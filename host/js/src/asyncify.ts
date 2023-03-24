// Based on https://github.com/GoogleChromeLabs/asyncify/blob/master/asyncify.mjs
//
// We can affort to be less defensive against the code that uses this (since we control it), so we don't use Proxies nor WeakMaps.
// We also add support for our extension to asyncify - unwind stack allocation with the help of the host.

enum AsyncifyState {
  Normal = 0,
  Unwinding = 1,
  Rewinding = 2
}

type AsyncifyExports = {
  // our extension of asyncify
  asyncify_alloc_stack(dataAddress: number, size: number): void;
  // default asyncify methods
  asyncify_start_rewind(dataAddress: number): void;
  asyncify_stop_rewind(): void;
  asyncify_start_unwind(dataAddress: number): void;
  asyncify_stop_unwind(): void;
  asyncify_get_state(): number;
};

type Fn<A extends unknown[], R> = (...args: A) => R;

export class Asyncify {
  private static DEFAULT_DATA_ADDRESS: number = 16;
  private static DEFAULT_STACK_SIZE: number = 8 * 1024;

  static async instantiate(
    module: WebAssembly.Module,
    imports: (self: Asyncify) => WebAssembly.Imports,
    options?: {
      dataAddress: number,
      unwindStackSize: number
    }
  ): Promise<[WebAssembly.Instance, Asyncify]> {
    const asyncify = new Asyncify(options?.dataAddress ?? Asyncify.DEFAULT_DATA_ADDRESS);
    const instance = await WebAssembly.instantiate(module, imports(asyncify));
    
    const exports = instance.exports;
    if (
      typeof exports.asyncify_alloc_stack !== 'function'
      || typeof exports.asyncify_start_rewind !== 'function'
      || typeof exports.asyncify_stop_rewind !== 'function'
      || typeof exports.asyncify_start_unwind !== 'function'
      || typeof exports.asyncify_stop_unwind !== 'function'
      || typeof exports.asyncify_get_state !== 'function'
    ) {
      throw new Error('Some or all asyncify exports missing from module exports');
    }
    asyncify.exports = exports as AsyncifyExports;

    asyncify.exports.asyncify_alloc_stack(asyncify.dataAddress, options?.unwindStackSize ?? Asyncify.DEFAULT_STACK_SIZE);

    return [instance, asyncify];
  }
  
  private exports: AsyncifyExports | undefined;
  private readonly dataAddress: number;
  // Promise from async import is stored here during unwind
  // Resolved value from async import is stored here during rewind
  private storedValue: Promise<unknown> | unknown | undefined;
  private constructor(dataAddress: number) {
    // Put `__asyncify_data` somewhere, just like the original code.
    this.dataAddress = dataAddress;
  }

  public wrapImport<A extends unknown[], R>(fn: Fn<A, Promise<R>>, dummyValue: R): Fn<A, R> {
    return (...args: A): R => {
      const state = this.getState();
      switch (state) {
        // -> export[rewinding] -> wasm[rewinding] -> import[rewinding]
        case AsyncifyState.Rewinding: {
          // we just rewound into this import, resolved value is ready and we will return it
          this.exports!!.asyncify_stop_rewind();
          const value = this.storedValue as R;
          this.storedValue = undefined;
          return value; // -> wasm[normal]
        };

        // -> export[normal] -> wasm[normal] -> import[normal]
        case AsyncifyState.Normal: {
          // we entered this import from host call
          // we will store this value in `pendingValue` and unwind
          this.storedValue = fn(...args);
          this.exports!!.asyncify_start_unwind(this.dataAddress);

          return dummyValue; // -> wasm[unwinding] -> export[unwinding]
        };

        case AsyncifyState.Unwinding: throw new Error('Invalid Unwinding state in an import');
      }
    };
  }

  public wrapExport<A extends unknown[], R>(fn: Fn<A, R>): Fn<A, Promise<R>> {
    return async (...args: A): Promise<R> => {
      let state = this.getState();
      if (state !== AsyncifyState.Normal) {
        throw new Error(`Invalid asyncify state ${state} at the beginning of an export`);
      }

      let result = fn(...args);
      while (true) {
        state = this.getState();
        switch (state) {
          // -> export[normal] -> wasm[normal] -> import[normal] -> wasm[unwinding] -> export[unwinding]
          case AsyncifyState.Unwinding: {
            this.exports!!.asyncify_stop_unwind(); // in theory, another export could be called while wait for this one, but that requires careful synchronization
            this.storedValue = await this.storedValue;

            state = this.getState();
            if (state !== AsyncifyState.Normal) {
              throw new Error(`Invalid state ${state} after awaiting valud in export`);
            }
            this.exports!!.asyncify_start_rewind(this.dataAddress);
            result = fn(...args); // -> wasm[rewinding] -> import[rewinding]
          } break;

          // -> export[normal]
          case AsyncifyState.Normal: {
            return result as R; // -> wasm[normal]
          };

          case AsyncifyState.Rewinding: throw new Error('Invalid Rewinding state in an export');
        }
      }
    }
  }

  private getState(): AsyncifyState {
    return this.exports!!.asyncify_get_state() as AsyncifyState;
  }
}
