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

`OneClient` is a universal API client which provides an unparalleled developer experience for every HTTP API. It enhances resiliency to API changes, and comes with built-in integration monitoring and provider failover.

For more details about Superface, visit [How it Works](https://superface.ai/how-it-works) and [Get Started](https://superface.ai/docs/getting-started).

## Important Links

- [Superface website](https://superface.ai)
- [Get Started](https://superface.ai/docs/getting-started)
- [Documentation](https://superface.ai/docs)
- [Discord](https://sfc.is/discord)

## Install

To install OneSDK into the project, run:

```shell
npm install @superfaceai/one-sdk@alpha
```

## Setup

OneClient uses three files (also called Comlink) which together make the integration:
- **Profile** - describe business capabilities apart from the implementation details, what is expected as input and what will be the result. Profile name have optional scope before `/` and required name `[scope/]<name>`
- **Provider** - Define a provider's API services and security schemes to use in a Comlink Map
- **Map** - describe implementation details for fulfilling a business capability from a Comlink Profile

To glue all the parts together, OneClient uses name and file structure convention.

```
.
└── superface/ - directory with all the Comlinks in project root
    ├── <profileScope>.<profileName>.profile - profile file
    ├── <providerName>.provider.json - provider file
    ├── <profileScope>.<profileName>.<providerName>.map.js - map file
    └── ... - repeat for all the Comlinks
```

### Send email example

As an example, lets send an email with [Mailchimp](https://github.com/superfaceai/one-sdk/blob/main/examples/maps/src/mailchimp.provider.json). The use-case is described in the profile [communication/send-email](https://github.com/superfaceai/one-sdk/blob/main/examples/maps/src/communication.send-email.profile) and the map with [implementation](https://github.com/superfaceai/one-sdk/blob/feat/superface_assets_convention/examples/maps/src/communication.send-email.mailchimp.map.js).

1. Start with creating a new directory `superface` in the root of your project.
2. Add the profile. Because profile name contains have scope we need to replace `/` with `.`. So, the profile with name `communication/send-email` have corresponding filename `communication.send-email.profile`.
3. Add the provider. The provider name is the same as the filename. So the provider with name `mailchimp` have corresponding filename `mailchimp.provider.json`.
4. Add the map. Map connects profile and provider, so the filename is consists of both as well `communication.send-email.mailchimp.map.js`.

The final structure should look like this:
```
.
└── superface/
    ├── communication.send-email.mailchimp.map.js
    ├── communication.send-email.profile
    └── mailchimp.provider.json
```

## Use in Node.js

Create `index.mjs` file with following content and update 

```js
import { OneClient } from '@superfaceai/one-sdk';

async function main() {
  const client = new OneClient();
  const profile = await client.getProfile('<profileName>');

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

Then run the script with:

```shell
node --experimental-wasi-unstable-preview1 index.mjs
```

---

OneSDK uses [ECMAScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules). More on using ECMAScript modules is well described in [Pure ESM Package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c) guide.

## Use in Cloudflare

The main difference compared to Node.js is a need to use a virtual filesystem to load the Comlink files. It is needed due to the deployment process, where all files need to be bundled together.

```js
import { OneClient, PerformError, UnexpectedError } from '@superfaceai/one-sdk/cloudflare';

import profileFile from '../superface/[scope.]<name>.profile';
import mapFile from '../superface/[scope.]<name>.<providerName>.map.js';
import providerFile from '../superface/<providerName>.provider.json';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const client = new OneClient({
      env: {
        OSDK_LOG: 'info' // use `debug` or `trace` for development debugging
      },
      // preopens describes the virtual filesystem whith the OneClient file convention mapped to assets
      preopens: {
        'superface/[scope.]<name>.profile': new Uint8Array(profileFile),
        'superface/[scope.]<name>.<providerName>.map.js': new Uint8Array(mapFile),
        'superface/<providerName>.provider.json': new Uint8Array(providerFile)
      }
    });
    const profile = await client.getProfile('<profileName>');  // profile id as defined in *.profile
    const usecase = profile.getUseCase('<usecaseName>'); // use case name as defined in the profile
    const result = usecase.perform(
      // Input parameters as defined in profile:
      '<key>': '<value>'
      // provider configuration
      {
        provider: '<providerName>', // provider name as defined in *.provider.json
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
      }
    );

    try {
      // result as defined in the profile
      const ok = await result;
      return new Response(`Result: ${JSON.stringify(ok, null, 2)}`);
    } catch (error) {
      if (error instanceof PerformError) {
        // error as defined in the profile
        return new Response(`Error: ${JSON.stringify(error.errorResult, null, 2)}`, { status: 400 });
      } else {
        // exception - should not be part of a normal flow
        return new Response(`${error.name}\n${error.message}`, { status: 500 });
      }
    }
  }
}
```

Check full demo with [Shopify](https://github.com/superfaceai/demo-cloudflare-shopify/tree/main) use-cases and more details.

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