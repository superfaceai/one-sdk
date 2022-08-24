import { readFile } from "node:fs/promises"
import { WASI } from "wasi"
import { argv, env } from "node:process"

const context = new WASI({
	args: argv,
	env,
	preopens: {}
})

const strace_buffer = []
function strace(module) {
	return Object.fromEntries(
		Object.entries(module).map(
			([key, fn]) => [
				key,
				(...args) => {
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
const THE_FD = 3

// Haha exfiltrating memory object goes brrr
let MEMORY = undefined
function get_memory() {
	return new DataView(MEMORY.buffer)
}

function sleep_sync(ms) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

const STATE = {
	accept_state: 0
}
const wasi_exports = {
	...context.wasiImport,
	// "fd_fdstat_get": (
	// 	fd,
	// 	out_ptr_fdstat
	// ) => {
	// 	const memory = get_memory()

	// 	// fdstat::fs_filetype
	// 	// filetype::socket_stream
	// 	memory.setUint8(out_ptr_fdstat, 6)
	// 	// fdstat::fs_flags
	// 	memory.setUint16(out_ptr_fdstat + 2, 15, true)
	// 	// fdstat::fs_rights_base
	// 	memory.setBigUint64(out_ptr_fdstat + 8, 1073741823n, true)
	// 	// fdstat::fs_rights_inheriting
	// 	memory.setBigUint64(out_ptr_fdstat + 16, 1073741823n, true)

	// 	return ERRNO_SUCCESS
	// },
	"sock_accept": (
		fd,
		in_ptr_flags,
		out_ptr_fd
	) => {
		if (fd != THE_FD) {
			return ERRNO_INVAL
		}

		if (STATE.accept_state > 0) {
			return ERRNO_AGAIN
			// sleep_sync(10000)
		}

		const memory = get_memory()
		memory.setUint32(out_ptr_fd, fd + 100 + STATE.accept_state, true)

		STATE.accept_state += 1
		return ERRNO_SUCCESS
	},
	// "fd_fdstat_set_flags": (...args) => {
	// 	return ERRNO_SUCCESS
	// },
	// "clock_time_get": (...args) => {
	// 	return ERRNO_SUCCESS
	// },
	// "poll_oneoff": (
	// 	in_ptr_subscription,
	// 	out_ptr_event,
	// 	subscriptions,
	// 	out_ptr_n
	// ) => {
	// 	const memory = get_memory()

	// 	const subs = []
	// 	for (let i = 0; i < subscriptions; i += 1) {
	// 		subs.push(
	// 			{
	// 				"userdata": memory.getBigUint64(in_ptr_subscription + i * 48, true),
	// 				"type": memory.getUint32(in_ptr_subscription + i * 48 + 8, true),
	// 				"fd": memory.getUint32(in_ptr_subscription + i * 48 + 8 + 8, true)
	// 			}
	// 		)
	// 	}
	// 	console.log("Polling one of", subs)

	// 	// event::userdata
	// 	memory.setBigUint64(out_ptr_event, subs[0].userdata, true)
	// 	// event::error
	// 	memory.setUint16(out_ptr_event + 8, 0, true)
	// 	// event::type
	// 	memory.setUint8(out_ptr_event + 10, 1)
	// 	// event_fd_readwrite::nbytes
	// 	memory.setBigUint64(out_ptr_event + 16, 5n, true)
	// 	// event_fd_readwrite::flags
	// 	// eventrwflags::fd_readwrite_hangup
	// 	memory.setUint8(out_ptr_event + 24, 0)

	// 	// number of events written
	// 	memory.setUint32(out_ptr_n, 1, true)

	// 	sleep_sync(1000)
	// 	return ERRNO_SUCCESS
	// }
}
const superface_exports = {
	"sock_open": (...args) => {
		return THE_FD
	}
}

const binary = await readFile(argv[2])
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
