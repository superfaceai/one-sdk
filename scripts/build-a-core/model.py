from typing import Optional

from dataclasses import dataclass, field
from enum import Enum

import json

class QuotedStrEnum(Enum):
	def __str__(self):
		return f'"{self.value}"'

@dataclass
class Dependencies:
	toolchain_version: str = "1.17"
	core_ref: str = "main"
	wasi_sdk_ref: str = "wasi-sdk-20"
	binaryen_ref: str = "version_114"

	@staticmethod
	def from_json(data):
		return Dependencies(
			toolchain_version = data["toolchain-version"],
			core_ref = data["core-ref"],
			wasi_sdk_ref = data["wasi-sdk-ref"],
			binaryen_ref = data["binaryen-ref"]
		)

class CargoProfileOptLevel(Enum):
	NONE = 0
	QUICK = 1
	DEFAULT = 2
	SLOW = 3
	SIZE = "s"
	SIZZE = "z"

	def __str__(self) -> str:
		if isinstance(self.value, int):
			return str(self.value)
		else:
			return f'"{self.value}"'
class CargoProfileDebugInfo(QuotedStrEnum):
	NONE = "none"
	LINE_DIRECTIVES_ONLY = "line-directives-only"
	LINE_TABLES_ONLY = "line-tables-only"
	LIMITED = "limited"
	FULL = "full"
class CargoProfileStrip(QuotedStrEnum):
	NONE = "none"
	DEBUG_INFO = "debuginfo"
	SYMBOLS = "symbols"
class CargoProfileLto(QuotedStrEnum):
	OFF = "off"
	THIN = "thin"
	FAT = "fat"
class CargoProfilePanic(QuotedStrEnum):
	UNWIND = "unwind"
	ABORT = "abort"
@dataclass
class CargoProfile:
	opt_level: CargoProfileOptLevel = CargoProfileOptLevel.NONE
	debug_info: CargoProfileDebugInfo = CargoProfileDebugInfo.NONE
	strip: CargoProfileStrip = CargoProfileStrip.NONE
	debug_assertions: bool = True
	overflow_checks: bool = True
	lto: CargoProfileLto = CargoProfileLto.OFF
	panic: CargoProfilePanic = CargoProfilePanic.UNWIND
	codegen_units: int = 16

	@staticmethod
	def from_json(data):
		return CargoProfile(
			opt_level = CargoProfileOptLevel(data["opt-level"]),
			debug_info = CargoProfileDebugInfo(data["debug-info"]),
			strip = CargoProfileStrip(data["strip"]),
			debug_assertions = data["debug-assertions"],
			overflow_checks = data["overflow-checks"],
			lto = CargoProfileLto(data["lto"]),
			panic = CargoProfilePanic(data["panic"]),
			codegen_units = data["codegen-units"]
		)
	
	def to_toml(self) -> str:
		# split-debuginfo = '...'  # Platform-specific.
		return f"""
[profile.build-a-core]
inherits = "release"
opt-level = {self.opt_level}
debug = {self.debug_info}
strip = {self.strip}
debug-assertions = {str(self.debug_assertions).lower()}
overflow-checks = {str(self.overflow_checks).lower()}
lto = {self.lto}
panic = {self.panic}
incremental = false
codegen-units = {self.codegen_units}
rpath = false
"""

@dataclass
class BuildStdArgs:
	enabled: bool = False
	crates: list[str] = field(default_factory = lambda: ["std", "core", "alloc", "proc_macro", "panic_unwind", "compiler_builtins"])
	# https://github.com/rust-lang/cargo/blob/master/src/cargo/core/compiler/standard_lib.rs#L137
	# https://github.com/rust-lang/rust/blob/master/library/std/Cargo.toml#L51
	features: Optional[list[str]] = field(default_factory = lambda: ["default", "backtrace", "panic_unwind"])

	@staticmethod
	def from_json(data):
		if not data["enabled"]:
			return BuildStdArgs()

		return BuildStdArgs(
			enabled = data["enabled"],
			crates = data["crates"],
			features = data["features"]
		)
	
	def to_command(self) -> list[str]:
		if not self.enabled:
			return []

		crates = ",".join(self.crates)
		features = []
		if self.features is not None:
			f = ",".join(self.features)
			features = ["-Z", f"build-std-features={f}"]
		return ["-Z", f"build-std={crates}"] + features

class WasmOptArgsOptLevel(Enum):
	NONE = "0"
	QUICK = "1"
	DEFAULT = "2"
	SLOW = "3"
	SLOWW = "4" # it goes up to eleven
	SIZE = "s"
	SIZZE = "z"

	def __str__(self):
		return self.value
@dataclass
class WasmOptArgs:
	enabled: bool = False
	opt_level: WasmOptArgsOptLevel = WasmOptArgsOptLevel.NONE
	converge: bool = False
	asyncify: bool = False
	strip_debug: bool = False
	strip_dwarf: bool = False
	strip_eh: bool = False
	strip_producers: bool = False
	strip_target_features: bool = False

	@staticmethod
	def from_json(data):
		if not data["enabled"]:
			return WasmOptArgs()

		return WasmOptArgs(
			enabled = data["enabled"],
			opt_level = WasmOptArgsOptLevel(data["opt-level"]),
			converge = data["converge"],
			asyncify = data["asyncify"],
			strip_debug = data["strip-debug"],
			strip_dwarf = data["strip-dwarf"],
			strip_eh = data["strip-eh"],
			strip_producers = data["strip-producers"],
			strip_target_features = data["strip-target-features"]
		)
	
	def to_command(self) -> list[str]:
		if not self.enabled:
			return []

		command = [f"-O{self.opt_level}"]
		if self.converge:
			command += ["--converge"]
		if self.asyncify:
			command += ["--asyncify"]
		if self.strip_debug:
			command += ["--strip-debug"]
		if self.strip_dwarf:
			command += ["--strip-dwarf"]
		if self.strip_eh:
			command += ["--strip-eh"]
		if self.strip_producers:
			command += ["--strip-producers"]
		if self.strip_target_features:
			command += ["--strip-target-features"]

		return command

@dataclass
class CoreDescription:
	dependencies: Dependencies
	cargo_profile: CargoProfile
	build_std: BuildStdArgs
	wasm_opt: WasmOptArgs

def _filter_comments_hook(pairs):
	return dict(filter(
		lambda pair: not pair[0].startswith("//"),
		pairs
	))
	
def load_cores_json(path) -> dict[str, CoreDescription]:
	data = None
	with open(path, "r") as file:
		data = json.load(
			file,
			object_pairs_hook = _filter_comments_hook
		)
	
	result = {}
	for key, desc in data.items():
		result[key] = CoreDescription(
			dependencies = Dependencies.from_json(desc["dependencies"]),
			cargo_profile = CargoProfile.from_json(desc["cargo-profile"]),
			build_std = BuildStdArgs.from_json(desc["build-std"]),
			wasm_opt = WasmOptArgs.from_json(desc["wasm-opt"])
		)
	
	return result

if __name__ == "__main__":
	import sys
	d = load_cores_json(sys.argv[1])
	print(d)
