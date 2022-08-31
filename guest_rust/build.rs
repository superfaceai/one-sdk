use std::{env, fs, path::PathBuf};

fn main() {
	let witx_paths = vec![
		PathBuf::from("./assets/witx/wasi_snapshot_preview1.witx"),
		PathBuf::from("./assets/witx/superface_unstable.witx")
	];

	let result = witx_bindgen::generate(&witx_paths);

	let out_path: PathBuf = PathBuf::from(
		env::var_os("OUT_DIR").unwrap()
		// "./assets/generated"
	).join("wasi.rs");
	fs::write(out_path, &result).expect("Failed to write output file");

	{
		// TODO: for debugging only
		let out_path: PathBuf = PathBuf::from(
			"./assets/generated"
		).join("wasi.rs");
		fs::write(out_path, &result).expect("Failed to write output file");
	}

	for p in &witx_paths {
		println!("cargo:rerun-if-changed={}", p.display());
	}
}
