fn mem_as_str(memory: &[u8], ptr: i32, len: i32) -> &str {
    // TODO: error handling
    std::str::from_utf8(&memory[ptr as usize..][..len as usize]).unwrap()
}

pub mod unstable {
    use anyhow::Context;
    use wasmi::{core::Trap, Caller, Extern, Func, Linker, Store};

    use super::mem_as_str;

    const MODULE_NAME: &str = "sf_core_unstable";

    pub type HttpHandle = u32;
    pub trait SfCoreUnstable {
        fn test_me(&mut self, value: i32) -> Result<i32, Trap>;

        fn abort(&mut self) -> Result<(), Trap>;
        fn http_get(&mut self, url: &str, headers: &[[&str; 2]]) -> HttpHandle;
        // fn http_response_headers(&mut self, handle: HttpHandle, ) TODO
        fn http_response_read(&mut self, handle: HttpHandle, out: &mut [u8]) -> usize;
    }

    // TODO: should not be anyhow::Result
    pub fn link_to<H: SfCoreUnstable>(
        linker: &mut Linker<H>,
        mut store: &mut Store<H>,
    ) -> anyhow::Result<()> {
        let abort = Func::wrap(
            &mut store,
            |mut caller: Caller<'_, H>| -> Result<(), Trap> { caller.data_mut().abort() },
        );
        // TODO: maybe should be in env::abort?
        linker
            .define(MODULE_NAME, "abort", abort)
            .context("Failed to define sf_unstable::abort")?;

        let test_me = Func::wrap(
            &mut store,
            |mut caller: Caller<'_, H>, param: i32| -> Result<i32, Trap> {
                caller.data_mut().test_me(param)
            },
        );
        linker
            .define(MODULE_NAME, "test_me", test_me)
            .context("Failed to define sf_unstable::test_me")?;

        let http_get = Func::wrap(
            &mut store,
            |mut caller: Caller<'_, H>,
             url_ptr: i32,
             url_len: i32,
             headers_ptr: i32,
             headers_len: i32|
             -> i32 {
                let memory = caller
                    .get_export("memory")
                    .and_then(Extern::into_memory)
                    .unwrap();
                let (memory, state) = memory.data_and_store_mut(&mut caller);

                let url = mem_as_str(memory, url_ptr, url_len);

                let mut headers = Vec::<[&str; 2]>::new();
                let headers_str = mem_as_str(memory, headers_ptr, headers_len);
                for pair_str in headers_str.split('\n').filter(|s| !s.is_empty()) {
                    let (name, value) = pair_str.split_once(':').unwrap();

                    headers.push([name, value]);
                }

                state.http_get(url, headers.as_slice()) as i32
            },
        );
        linker
            .define(MODULE_NAME, "http_get", http_get)
            .context("Failed to define sf_unstable::http_get")?;

        let http_read_response = Func::wrap(
            &mut store,
            |mut caller: Caller<'_, H>, handle: i32, out_ptr: i32, out_len: i32| -> i32 {
                let memory = caller
                    .get_export("memory")
                    .and_then(Extern::into_memory)
                    .unwrap();
                let (memory, state) = memory.data_and_store_mut(&mut caller);

                let handle = handle as u32;
                let out = &mut memory[out_ptr as usize..][..out_len as usize];

                state.http_response_read(handle, out) as i32
            },
        );
        linker
            .define(MODULE_NAME, "http_read_response", http_read_response)
            .context("Failed to define sf_unstable::http_read_response")?;

        Ok(())
    }
}
