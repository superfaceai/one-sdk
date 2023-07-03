from host.python.src.superfaceai.one_sdk import OneClient
# from superfaceai.one_sdk import OneClient

client = OneClient(
    env = {
        "ONESDK_DEV_LOG": "trace",
        "ONESDK_CONFIG_CACHE_DURATION": "10"
    },
    assets_path = "../examples/comlinks/src",
    superface_api_url = "https://superface.dev"
)

profile = client.get_profile("wasm-sdk/example")
use_case = profile.get_usecase("Example")
try:
    r = use_case.perform(
        { "id": 1 },
        provider = "localhost",
        parameters = { "PARAM": "parameter_value" },
        security = { "basic_auth": { "username": "username", "password": "password" } }
    )
    print(f"RESULT: {r}")
except e:
    print(f"ERROR: {e}")

