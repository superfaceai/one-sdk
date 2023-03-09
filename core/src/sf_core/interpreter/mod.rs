use crate::sf_std::host_to_core::unstable::perform::StructuredValue;

pub mod quickjs;
mod state;
// pub mod wasmi;

pub trait Interpreter {
    // TODO: define errors and don't use anyhow?
    fn run(
        &mut self,
        code: &[u8],
        entry: &str,
        input: StructuredValue,
    ) -> anyhow::Result<StructuredValue>;
}
