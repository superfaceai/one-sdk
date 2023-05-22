[Website](https://superface.ai) | [Get Started](https://superface.ai/docs/getting-started) | [Documentation](https://superface.ai/docs) | [Discord](https://sfc.is/discord) | [Twitter](https://twitter.com/superfaceai) | [Support](https://superface.ai/support)

<img src="https://github.com/superfaceai/one-sdk/raw/main/docs/LogoGreen.png" alt="Superface" width="100" height="100">

# Superface OneSDK

**One SDK for all the APIs you want to integrate with.**

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/superfaceai/one-sdk/ci_cd.yml)](https://github.com/superfaceai/one-sdk/actions/workflows/ci_cd.yml)
[![license](https://img.shields.io/npm/l/@superfaceai/one-sdk)](LICENSE)
![TypeScript](https://img.shields.io/static/v1?message=TypeScript&&logoColor=ffffff&color=007acc&labelColor=5c5c5c&label=built%20with)
[![Discord](https://img.shields.io/discord/819563244418105354?logo=discord&logoColor=fff)](https://sfc.is/discord)

This is a new implementation of [OneSDK for Node.js](https://github.com/superfaceai/one-sdk-js) using WebAssembly under the hood. Which allows us to give users OneSDK in their favorite language.

For more details about Superface, visit [How it Works](https://superface.ai/how-it-works) and [Get Started](https://superface.ai/docs/getting-started).

## Try it out

A simple demonstration can be run with `./examples/run.sh node [CORE_MODE=default|docker|lax]`. It builds entire projects and Node.js host, then runs the example.

This will require to have Development requirements installed. In case of building the core in Docker `node` and `yarn` are still required.

## Supported languages

- [🦄 JavaScript/TypeScript](https://github.com/superfaceai/one-sdk/tree/chore/repo_community_standards/host/js)
  - [Node.js](https://github.com/superfaceai/one-sdk/tree/chore/repo_community_standards/host/js/src/node)
  - [Cloudflare Workers](https://github.com/superfaceai/one-sdk/tree/chore/repo_community_standards/host/js/src/cloudflare)
- [🐍 Python](https://github.com/superfaceai/one-sdk/tree/chore/repo_community_standards/host/python)

## Contributing

We welcome all kinds of contributions! Please see the [Contribution Guide](docs/CONTRIBUTING.md) to learn how to participate.

## License

OneSDK is licensed under the [MIT License](LICENSE).

© 2023 Superface s.r.o.