[Website](https://superface.ai) | [Get Started](https://superface.ai/docs/getting-started) | [Documentation](https://superface.ai/docs) | [Discord](https://sfc.is/discord) | [Twitter](https://twitter.com/superfaceai) | [Support](https://superface.ai/support)
<br />
<br />
<img src="https://github.com/superfaceai/one-sdk/raw/main/docs/LogoGreen.png" alt="Superface" width="100" height="100">

# Superface OneSDK

**One SDK for all the APIs you want to integrate with.**

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/superfaceai/one-sdk/ci_cd.yml)](https://github.com/superfaceai/one-sdk/actions/workflows/ci_cd.yml)
[![license](https://img.shields.io/npm/l/@superfaceai/one-sdk)](LICENSE)
[![Discord](https://img.shields.io/discord/819563244418105354?logo=discord&logoColor=fff)](https://sfc.is/discord)
[![npm](https://img.shields.io/pypi/v/one-sdk)](https://pypi.org/project/one-sdk/)

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
python3 -m pip install one-sdk
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

## Use

Create `__main__.py` file with following content and update:

```py
import os

from one_sdk import OneClient, PerformError, UnexpectedError

client = OneClient()

profile = client.get_profile("<profileName>")
use_case = profile.get_usecase("<usecaseName>")
try:
    r = use_case.perform(
        {
            # Input parameters as defined in profile:
            '<key>': '<value>'
        },
        provider = "<providerName>",
        # Provider specific integration parameters:
        parameters = {
            '<integrationParameterName>': '<integrationParameterValue>'
        },
        security = { 
            # Provider specific security values:
            '<securityValueId>': {
                # Security values as described in provider or on profile page
            }
        }
    )
    print(f"RESULT: {r}")
except Exception as e:
    if isinstance(e, PerformError):
        print(f"ERROR RESULT: {e.error_result}")
    elif isinstance(e, UnexpectedError):
        print(f"ERROR:", e, file=sys.stderr)
    else:
        raise e
finally:
    client.send_metrics_to_superface()
```

Then run the script with:

```shell
python __main__.py
```

## License

OneSDK is licensed under the [MIT License](LICENSE).

© 2023 Superface s.r.o.