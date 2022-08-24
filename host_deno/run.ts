import Context from "https://deno.land/std@0.152.0/wasi/snapshot_preview1.ts"

const context = new Context({
	args: Deno.args,
	env: Deno.env.toObject(),
})

function strace(module: Record<string, Function>): Record<string, Function> {
	return Object.fromEntries(
		Object.entries(module).map(
			([key, fn]) => [
				key,
				(...args: unknown[]) => {
					const result = fn(...args)
					console.debug(`${key}(${args}) = ${result}`)

					return result
				}
			]
		)
	)
}

const ERRNO_SUCCESS = 0
const ERRNO_AGAIN = 6
const ERRNO_INVAL = 28

// Haha exfiltrating memory object goes brrr
let MEMORY: any = undefined
function get_memory_view(): DataView {
	return new DataView(MEMORY.buffer)
}
function get_memory_bytes(): Uint8Array {
	return new Uint8Array(MEMORY.buffer)
}

const STATE = {
	input_read_state: 0
}
const wasi_exports: Record<string, Function> = {
	...context.exports
} as any
const superface_exports: Record<string, Function> = {
	"input_read": (
		str_offset: number,
		str_size: number,
		read_offset: number
	): number => {
		const string = '{ "hello": "world", "foo": 1 }'
		const encoder = new TextEncoder()
		
		let data = encoder.encode(string)
		data = data.slice(STATE.input_read_state)
		const read_count = Math.min(str_size, data.length)
		data = data.slice(0, read_count)

		{
			const memory = get_memory_bytes()
			memory.set(data, str_offset)
		}

		{
			const memory = get_memory_view()
			memory.setUint32(read_offset, data.length, true)

			STATE.input_read_state += data.length
		}

		return ERRNO_SUCCESS
	},

	"result_write": (
		str_offset: number,
		str_size: number
	) => {

	}
}

const binary = await Deno.readFile(Deno.args[0])
const module = await WebAssembly.compile(binary)
const instance = await WebAssembly.instantiate(module, {
	"wasi_snapshot_preview1": strace(wasi_exports),
	"superface_unstable": strace(superface_exports)
})
MEMORY = instance.exports.memory

try {
	context.start(instance)
} catch (e) {
	console.error("Failed with", e)
}
