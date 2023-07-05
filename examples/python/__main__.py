from host.python.src.one_sdk import OneClient
# from one_sdk import OneClient

client = OneClient(
    assets_path = "../examples/comlinks/src",
    superface_api_url = "https://superface.dev",
    token = "sfs_x"
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
except Exception as e:
    print(f"ERROR: {e}")
