import { PairRepr, Ptr, ResultRepr, Size, MessageFn } from "./abi";

@external('sf_core_unstable', 'print')
declare function __import_print(msg_ptr: Ptr, msg_len: Size): void;

@external('sf_core_unstable', 'message_exchange')
declare function __import_message_exchange(msg_ptr: Ptr, msg_len: Size, out_ptr: Ptr, out_len: Size): PairRepr;

@external('sf_core_unstable', 'message_exchange_retrieve')
declare function __import_message_exchange_retrieve(handle: Size, out_ptr: Ptr, out_len: Size): ResultRepr;

export const EXCHANGE_MESSAGE: MessageFn = new MessageFn(__import_message_exchange, __import_message_exchange_retrieve);

export function print(message: string): void {
	const message_utf8 = String.UTF8.encode(message);

	__import_print(
		changetype<Ptr>(message_utf8), <Size>message_utf8.byteLength
	);
}
