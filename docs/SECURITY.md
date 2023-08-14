# Security within Superface OneSDK

OneSDK interprets the map to fulfill the required usecase. This often requires making HTTP requests with authorization. Thus the user needs to provide Superface with the right secrets to access the capability exposed by the API.

## The purpose of secrets

The only purpose of user secrets within Superface is to authorize the user against the API. Superface does not use the secrets in any other way.

## Providing user secrets

Secrets are provided to the OneSDK through the `perform` function.

## How the SDK uses secrets

OneSDK applies secrets according to security requirements specified in the relevant map. These secrets are applied to the request right before the request is executed, and are not made available to the map.

Once the request is executed no secrets are accessed until another request is to be prepared.

## Logging

Another aspect to consider is logging. Logging is **disabled** by default, however on failure a developer log dump, which contains low-level data including secrets, is emitted. When enabled, logging may leak user secrets, so expose only as much information as is secure in given context.
