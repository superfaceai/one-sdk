import { Buffer } from './internal/node_compat';
import * as unstable from './unstable';

export declare const globalThis: {
	Buffer: typeof Buffer,
	std: {
		unstable: typeof unstable
	}
};
globalThis.std = {
	unstable
};
globalThis.Buffer = Buffer;
