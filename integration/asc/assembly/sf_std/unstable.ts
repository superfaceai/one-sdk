import { PairRepr, Ptr, ResultRepr, Size, MessageFn } from './abi';

export { HttpRequest } from './http';

export type HeadersMultiMap = Map<string, string[]>;

export const EXCHANGE_MESSAGE: MessageFn = new MessageFn(__import_message_exchange, __import_message_exchange_retrieve);

export function print(message: string): void {
	const message_utf8 = String.UTF8.encode(message);

	__import_print(
		changetype<Ptr>(message_utf8), <Size>message_utf8.byteLength
	);
}

export function abort(message: string, file: string, line: u32, column: u32): void {
	const message_utf8 = String.UTF8.encode(message);
	const file_utf8 = String.UTF8.encode(file);
	
	__import_abort(
		changetype<usize>(message_utf8), message_utf8.byteLength,
		changetype<usize>(file_utf8), file_utf8.byteLength,
		line, column
	);
}

@external('sf_core_unstable', 'print')
declare function __import_print(msg_ptr: Ptr, msg_len: Size): void;

@external('sf_core_unstable', 'abort')
declare function __import_abort(msg_ptr: Ptr, msg_len: Size, filename_ptr: Ptr, filename_len: Size, line: Size, column: Size): void;

@external('sf_core_unstable', 'message_exchange')
declare function __import_message_exchange(msg_ptr: Ptr, msg_len: Size, out_ptr: Ptr, out_len: Size): PairRepr;

@external('sf_core_unstable', 'message_exchange_retrieve')
declare function __import_message_exchange_retrieve(handle: Size, out_ptr: Ptr, out_len: Size): ResultRepr;

// TODO: stream_read, stream_write, stream_close imports
