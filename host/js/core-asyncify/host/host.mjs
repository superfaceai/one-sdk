import * as Asyncify from 'asyncify-wasm';

import * as fs from 'fs';
import { WASI } from 'wasi';

const wasi = new WASI({
	args: process.argv,
	env: process.env,
});

const TEXT = {
	_encoder: new TextEncoder("utf-8"),
	_decoder: new TextDecoder("utf-8"),
	fromMemory(bytes) {
		return TEXT._decoder.decode(bytes);
	},
	toBytes(string) {
		return TEXT._encoder.encode(string);
	}
}
let MEMORY = undefined
function get_memory_bytes() {
	return new Uint8Array(MEMORY.buffer)
}

const importObject = {
	wasi_snapshot_preview1: wasi.wasiImport,
	sf_host_unstable: {
		http_call: async (url_ptr, url_len, out_ptr, out_len) => {
			const url = TEXT.fromMemory(get_memory_bytes().subarray(url_ptr, url_ptr + url_len))
			console.log(`http_call(${url}, ${out_ptr}, ${out_len})`);

			const response = await fetch(url);
			const responseBody = await response.text();

			const out = get_memory_bytes().subarray(out_ptr, out_ptr + out_len);
			const outData = TEXT.toBytes(responseBody);
			out.set(Array.from(outData));

			return outData.byteLength;
		}
	}
};

(async () => {
	const file = process.argv[2];
	const wasm = await WebAssembly.compile(fs.readFileSync(file));
	const instance = await Asyncify.instantiate(wasm, importObject);
	MEMORY = instance.exports.memory

	wasi.start(instance);
})();
