#!/usr/bin/env python3

from typing import Optional

import os
import os.path
import argparse
import subprocess

from model import load_cores_json
from template import dockerfile_template

def _build_cli():
	parser = argparse.ArgumentParser(
		prog = "build-a-core",
		description = "Script to parametrize core builds for testing and experimenting"
	)
	parser.add_argument(
		"-c", "--cores",
		default = None, type = str,
		dest = "CORES_FILE",
		help = "Path to the cores.json file"
	)
	subparsers = parser.add_subparsers(required = True)
	
	cmd_setup = subparsers.add_parser("setup", help = "Setup the local Dockerfile")
	cmd_setup.add_argument(
		"-o", "--out-file",
		default = None, type = str,
		dest = "OUT_FILE",
		help = "Path where to output the Dockerfile"
	)
	cmd_setup.add_argument("NAME", help = "Name of the core description")
	cmd_setup.set_defaults(cmd = main_setup)

	cmd_build = subparsers.add_parser("build", help = "Build the core in docker")
	cmd_build.add_argument(
		"--o", "--out-dir",
		default = None, type = str,
		dest = "OUT_DIR",
		help = "Path to where to the cores",
	)
	cmd_build.add_argument("NAMES", nargs = "+", help = "Names of the core descriptions")
	cmd_build.set_defaults(cmd = main_build)

	return parser

class Setup:
	def __init__(self, cores_file: Optional[str]):
		if cores_file is None:
			cores_file = os.path.join(os.path.dirname(__file__), "cores.json")
		self.cores = load_cores_json(os.path.abspath(cores_file))
	def prepare_dockerfile(self, name: str) -> str:
		desc = self.cores[name]
		dockerfile = dockerfile_template(
			name,
			desc.dependencies.toolchain_version,
			desc.dependencies.core_ref,
			desc.dependencies.wasi_sdk_ref,
			desc.dependencies.binaryen_ref,
			desc.cargo_profile.to_toml(),
			" ".join(desc.build_std.to_command()),
			" ".join(desc.wasm_opt.to_command())
		)

		return dockerfile

def _prepare_out_dir(out_dir: Optional[str]) -> str:
	if out_dir is not None:
		out_dir = os.path.abspath(out_dir)
	else:
		out_dir = os.path.join(os.path.dirname(__file__), "out")

	try:
		os.mkdir(out_dir)
	except FileExistsError:
		pass

	return out_dir

def main_setup(args):
	out_file = "-"
	if args.OUT_FILE is not None:
		out_file = args.OUT_FILE
	
	s = Setup(args.CORES_FILE)
	dockerfile = s.prepare_dockerfile(args.NAME)
	if out_file == "-":
		print(dockerfile)
	else:
		with open(out_file, "w") as file:
			print(dockerfile, file = file)

def main_build(args):
	out_dir = _prepare_out_dir(args.OUT_DIR)
	s = Setup(args.CORES_FILE)

	for name in args.NAMES:
		dockerfile = s.prepare_dockerfile(name)
		subprocess.run(
			["docker", "build", "-", "-o", out_dir],
			input = dockerfile.encode("utf-8")
		)

if __name__ == "__main__":
	args = _build_cli().parse_args()
	args.cmd(args)
