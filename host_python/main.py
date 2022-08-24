import sys
from wasmtime import Engine, Store, Module, Linker, WasiConfig, FuncType, ValType

engine = Engine()

linker = Linker(engine)
linker.define_wasi()

store = Store(engine)

wasi = WasiConfig()
wasi.inherit_stdout()
wasi.inherit_stderr()
store.set_wasi(wasi)

linker.define_func(
	"superface_unstable", "sock_open",
	FuncType([ValType.i32(), ValType.i32()], [ValType.i32()]),
	lambda x, y: 3
)

mod1 = Module.from_file(engine, sys.argv[1])
mod1 = linker.instantiate(store, mod1)
run = mod1.exports(store)["main"]

run(store, 0, 0)
