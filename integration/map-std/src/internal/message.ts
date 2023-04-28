import { Buffer } from './node_compat';

export function jsonReplacerMapValue(key: any, value: any): any {
  // TODO: this is how node Buffer gets serialized - do we want that?
  // to keep in line with our core convention, this should be some kind of `$MapValue::Buffer` and only transformed to the NodeJS buffer for the sake of tests
  if (Buffer.isBuffer(value)) {
    return { type: 'Buffer', data: value.inner.toArray() };
  }

  return value;
}
export function jsonReviverMapValue(key: any, value: any): any {
  if (typeof value === 'object' && value !== null) {
    if (value['type'] === 'Buffer' && Array.isArray(value['data'])) {
      return Buffer.from(value['data']);
    }
  }

  // TODO: revive streams
  return value;
}
export type JsonReplacer = (this: any, key: string, value: any) => any;
export type JsonReviver = (this: any, key: string, value: any) => any;
export function messageExchange(message: unknown, replacer: JsonReplacer | undefined = undefined, reviver: JsonReviver | undefined = undefined) {
  const response = __ffi.unstable.message_exchange(
    JSON.stringify(message, replacer)
  );
  return JSON.parse(response, reviver);
}