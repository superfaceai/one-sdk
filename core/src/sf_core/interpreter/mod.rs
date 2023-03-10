use crate::sf_std::host_to_core::unstable::HostValue;

pub mod quickjs;
mod state;

pub trait Interpreter {
    // TODO: define errors and don't use anyhow?
    fn run(
        &mut self,
        code: &[u8],
        entry: &str,
        input: HostValue,
        parameters: HostValue,
        security: HostValue,
    ) -> anyhow::Result<HostValue>;
}
