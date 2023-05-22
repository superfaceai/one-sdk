[Website](https://superface.ai) | [Get Started](https://superface.ai/docs/getting-started) | [Documentation](https://superface.ai/docs) | [Discord](https://sfc.is/discord) | [Twitter](https://twitter.com/superfaceai) | [Support](https://superface.ai/support)

<img src="https://github.com/superfaceai/one-sdk/raw/main/docs/LogoGreen.png" alt="Superface" width="100" height="100">

# Superface OneSDK

**One SDK for all the APIs you want to integrate with.**

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/superfaceai/one-sdk/ci_cd.yml)](https://github.com/superfaceai/one-sdk/actions/workflows/ci_cd.yml)
[![license](https://img.shields.io/npm/l/@superfaceai/one-sdk)](LICENSE)
![TypeScript](https://img.shields.io/static/v1?message=TypeScript&&logoColor=ffffff&color=007acc&labelColor=5c5c5c&label=built%20with)
[![Discord](https://img.shields.io/discord/819563244418105354?logo=discord&logoColor=fff)](https://sfc.is/discord)
[![npm](https://img.shields.io/npm/v/@superfaceai/one-sdk/alpha.svg)](https://www.npmjs.com/package/@superfaceai/one-sdk/v/alpha)
![TypeScript](https://img.shields.io/static/v1?message=TypeScript&&logoColor=ffffff&color=007acc&labelColor=5c5c5c&label=built%20with)

OneSDK is a universal API client which provides an unparalleled developer experience for every HTTP API. It enhances resiliency to API changes, and comes with built-in integration monitoring and provider failover.

For more details about Superface, visit [How it Works](https://superface.ai/how-it-works) and [Get Started](https://superface.ai/docs/getting-started).

## Important Links

- [Superface website](https://superface.ai)
- [Get Started](https://superface.ai/docs/getting-started)
- [Documentation](https://superface.ai/docs)
- [Discord](https://sfc.is/discord)

## Install

To install OneSDK into a Node.js project, run:

```shell
npm install @superfaceai/one-sdk@alpha
```

## Usage

1. Pick use-case:

    Use-cases can be discovered in [Superface catalog](https://superface.ai/catalog) or in [Station](https://github.com/superfaceai/station/tree/main_wasm) respository.

    **🚧 WASM powered OneSDK is newly using JavaScript to implement use-cases and not all were migrated yet 🚧**

2. Use in your code:

    OneSDK is using [EcmaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules). More on using ES modules is well described in [Pure ESM Package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) guide.

    ```js
    import { SuperfaceClient } from '@superfaceai/one-sdk';

    const client = new SuperfaceClient();

    async function main() {
      const profile = await client.getProfile({ id: '<profileName>', version: '<profileVersion>'});

      const result = await profile.getUseCase('<usecaseName>').perform({
        // Input parameters as defined in profile:
        '<key>': '<value>'
      },
      {
        provider: '<providerName>',
        parameters: {
          // Provider specific integration parameters:
          '<integrationParameterName>': '<integrationParameterValue>'
        },
        security: {
          // Provider specific security values:
          '<securityValueId>': {
            // Security values as described in provider or on profile page
          }
        }
      });

      console.log(result.unwrap());
    }

    main();
    ```

If you are missing a use case, [let us know](#support)! You can also always [add your own use-case or API provider](https://superface.ai/docs/guides/how-to-create).

## Todos & limitations

The next-gen OneSDK is still in alpha stage and several features are not yet implemented. We welcome any and all feedback. The current limitations include:

- OneSDK Client can't be instantiated in the global scope
  - We discovered Cloudflare is not allowing synchronisation between requests. We need to make sure, that two different requests are not accessing OneSDK Core at the same time. [The problem](https://zuplo.com/blog/the-script-will-never-generate-a-response-on-cloudflare-workers).
 
- Build-time integrations only
  - Currently the maps (integration glue) needs to be bundled with the worker at the build time
  - Future OneSDK will be fetching the maps at the runtime to enable dynamic healing and recovery

- Integrations monitoring won't work
  - Metrics are not yet send to Registry, so project dashboard will reamin empty.

### Cloudflare Workers specific

- The compiled WASM OneSDK is hitting the 1MB limit of the Cloudflare workers free tier

## License

OneSDK is licensed under the [MIT License](LICENSE).

© 2023 Superface s.r.o.