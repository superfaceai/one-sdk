export { App } from './app';
export type { TextCoder, FileSystem, Timers, Network } from './app';
export { HandleMap } from './handle_map';

// @ts-ignore
import coreModule from '../assets/core-async.wasm';
export { coreModule };
