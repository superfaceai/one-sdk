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

enum Errno {
	SUCCESS = 0,
	AGAIN = 6,
	INVAL = 28
}
enum Stream {
	Perform = 100,
	Http = 101
}

// Haha exfiltrating memory object goes brrr
let MEMORY: any = undefined
function get_memory_view(): DataView {
	return new DataView(MEMORY.buffer)
}
function get_memory_bytes(): Uint8Array {
	return new Uint8Array(MEMORY.buffer)
}

const TEXT = {
	encoder: new TextEncoder(),
	decoder: new TextDecoder()
}
const STATE = {
	perform: {
		input: {
			data: TEXT.encoder.encode(JSON.stringify(
				{ characterName: "Luke Skywalker" }
			)),
			pos: 0
		},
		result: {
			data: new Uint8Array()
		}
	},
	http: {
		request: {
			data: new Uint8Array()
		},
		response: {
			data: new Uint8Array(),
			pos: 0,
			pending: false
		}
	}
}
function do_http_request(data: any) {
	STATE.http.response.pending = true
	fetch("https://example.com").then(
		r => {
			STATE.http.response.data = TEXT.encoder.encode(JSON.stringify(
				{
					body: {
						results: [
							{ name: "Anakin Skywalker", height: 1, mass: 2, birth_year: "3" },
							{ name: "Luke Skywalker", height: 4, mass: 5, birth_year: "6" }
						]
					}
				}
			))
			STATE.http.response.pending = false

			console.log("Mock request finished")
		}
	)
}

const wasi_exports: Record<string, Function> = {
	...context.exports
} as any

// host writes to guest
function syscall_read_write(
	source: Uint8Array,
	destination: Uint8Array,
	destination_offset: number,
	destination_len: number
): number {
	const read_count = Math.min(source.length, destination_len)

	destination.set(
		source.slice(0, read_count),
		destination_offset
	)

	return read_count
}


const superface_exports: Record<string, Function> = {
	"sf_read": (
		stream: number,
		buf_offset: number,
		buf_len: number,
		read_offset: number
	): number => {
		let stream_name: string
		let state: {
			data: Uint8Array,
			pos: number
		}

		if (stream == Stream.Perform) {
			stream_name = "perform"
			state = STATE.perform.input
		} else if (Stream.Http) {
			stream_name = "http"
			state = STATE.http.response

			if (STATE.http.response.pending) {
				let i = 1_000_000_000
				while (i > 0) {
					i -= 1
				}
				return Errno.AGAIN
			}
		} else {
			return Errno.INVAL
		}

		const count = syscall_read_write(
			state.data.slice(state.pos),
			get_memory_bytes(),
			buf_offset,
			buf_len
		)
		{
			const memory = get_memory_view()
			memory.setUint32(read_offset, count, true)

			state.pos += count
		}

		console.log(`sf_read(${stream_name}) = ${count}`)
		return Errno.SUCCESS
	},

	"sf_write": (
		stream: number,
		buf_offset: number,
		buf_len: number,
		wrote_offset: number
	): number => {
		let stream_name: string
		let state: Record<"data", Uint8Array>

		if (stream == Stream.Perform) {
			stream_name = "perform"
			state = STATE.perform.result
		} else if (stream == Stream.Http) {
			stream_name = "http"
			state = STATE.http.request
		} else {
			return Errno.INVAL
		}

		const merged = new Uint8Array(state.data.length + buf_len)
		merged.set(state.data, 0)
		
		const count = syscall_read_write(
			get_memory_bytes().slice(buf_offset, buf_offset + buf_len),
			merged,
			state.data.length,
			buf_len
		)
		state.data = merged

		{
			const memory = get_memory_view()
			memory.setUint32(wrote_offset, count, true)
		}

		console.log(`sf_write(${stream_name}) = ${count}`)

		return Errno.SUCCESS
	},

	"sf_flush": (
		stream: number
	): number => {
		if (stream == Stream.Perform) {
			try {
				const obj = JSON.parse(TEXT.decoder.decode(STATE.perform.result.data))
				STATE.perform.result.data = new Uint8Array()
				
				console.log("result:", obj)
				return Errno.SUCCESS
			} catch {
				return Errno.INVAL
			}
		} else if (Stream.Http) {
			try {
				const obj = JSON.parse(TEXT.decoder.decode(STATE.http.request.data))
				STATE.http.request.data = new Uint8Array()

				console.log("request:", obj)
				do_http_request(obj)

				return Errno.SUCCESS
			} catch {
				return Errno.INVAL
			}
		} else {
			return Errno.INVAL
		}
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
