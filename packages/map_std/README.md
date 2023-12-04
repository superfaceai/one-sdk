[Website](https://superface.ai) | [Get Started](https://superface.ai/docs/getting-started) | [Documentation](https://superface.ai/docs) | [GitHub Discussions](https://sfc.is/discussions) | [Twitter](https://twitter.com/superfaceai) | [Support](https://superface.ai/support)
<br />
<br />
<img src="https://github.com/superfaceai/one-sdk/raw/main/docs/LogoGreen.png" alt="Superface" width="100" height="100">

# Superface OneSDK Map standard library

Types for development against the OneSDK map standard library.

## Setup

To setup an environment for language support when developing tools:

```shell
npm install @superfaceai/map-std
```

To define a usecase define a new type in a TypeScript `example.profile.ts` file:

```typescript
/// <reference types="@superface/map-std" />

type Example = Usecase<{
  safety: 'safe'
  input: {
    /** Id of the thing to fetch. */
    id: AnyValue
  }
  result: { name: string }
  error: { title: AnyValue, detail?: AnyValue }
}>;
```

Then develop a map with type support:

```javascript
/// <reference types="@superface/map-std" />
/// <reference path="./example.profile.ts" />
// @ts-check

/** @type {Example} */
var Example = ({ input, parameters, services }) => {
  return { name: "hardcoded example" }
}
```

For more examples see [examples in OneSDK repository](https://github.com/superfaceai/one-sdk/tree/main/examples/comlinks).

## License

OneSDK is licensed under the [MIT License](LICENSE).

© 2023 Superface s.r.o.
