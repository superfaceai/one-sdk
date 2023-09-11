[Website](https://superface.ai) | [Get Started](https://superface.ai/docs/getting-started) | [Documentation](https://superface.ai/docs) | [GitHub Discussions](https://sfc.is/discussions) | [Twitter](https://twitter.com/superfaceai) | [Support](https://superface.ai/support)

<img src="https://github.com/superfaceai/one-sdk/raw/main/docs/LogoGreen.png" alt="Superface" width="100" height="100">

# Superface OneSDK

**One SDK for all the APIs you want to integrate with.**

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/superfaceai/one-sdk/ci_cd.yml)](https://github.com/superfaceai/one-sdk/actions/workflows/ci_cd.yml)
[![license](https://img.shields.io/npm/l/@superfaceai/one-sdk)](LICENSE)
[![GitHub Discussions](https://img.shields.io/github/discussions/superfaceai/.github?logo=github&logoColor=fff)](https://github.com/orgs/superfaceai/discussions)

This is a new implementation of [OneSDK for Node.js](https://github.com/superfaceai/one-sdk-js) using WebAssembly under the hood. Which allows us to give users OneSDK in their favorite language.

For more details about Superface, visit [How it Works](https://superface.ai/how-it-works) and [Get Started](https://superface.ai/docs/getting-started).

## Try it out

A simple demonstration can be run with `./examples/run.sh node [CORE_MODE=default|docker|lax]`. It builds the entire project and Node.js host, then runs the example.

This will require to have Development requirements installed. In case of building the core in Docker `node` and `yarn` are still required.

### Environment variables

The OneSDK uses these environment variables:

- `ONESDK_LOG=on` - controls logging intended for users. Values `1`, `on`, `yes` and `true` are recognized as positive.
- `ONESDK_REGISTRY_URL=http://localhost:8321` - Superface registry base URL
- `ONESDK_CONFIG_CACHE_DURATION=3600` - duration in seconds of how long to cache documents (profiles, maps, providers) before downloading or reading them from the file system again
- `ONESDK_CONFIG_DEV_DUMP_BUFFER_SIZE=1048576` - size of the developer log dump ring buffer
- `ONESDK_DEV_LOG=off` - controls the level of logging intended for developers. Set to `trace` to see everything that is logged, including user log and metrics. See [tracing_subscriber directives](https://docs.rs/tracing-subscriber/latest/tracing_subscriber/filter/struct.EnvFilter.html#directives) for full syntax.

## Supported languages

- [🦄 JavaScript/TypeScript](https://github.com/superfaceai/one-sdk/tree/main/host/javascript)
  - [Node.js](https://github.com/superfaceai/one-sdk/tree/main/host/javascript/src/node)
  - [Cloudflare Workers](https://github.com/superfaceai/one-sdk/tree/main/host/javascript/src/cloudflare)
- [🐍 Python](https://github.com/superfaceai/one-sdk/tree/main/packages/python_host)

## Contributing

We welcome all kinds of contributions! Please see the [Contribution Guide](docs/CONTRIBUTING.md) to learn how to participate.

## License

OneSDK is licensed under the [MIT License](LICENSE).

© 2023 Superface s.r.o.
