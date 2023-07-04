import unittest
import os.path

from one_sdk import OneClient

ASSETS_PATH = os.path.abspath(os.path.join(__file__, "../../../../examples/comlinks/src"))

class TestOneClient(unittest.TestCase):
    def test_basic_use(self):
        client = OneClient(assets_path = ASSETS_PATH)

        profile = client.get_profile("wasm-sdk/example")
        result = profile.get_usecase("Example").perform(
            { "id": 1 },
            provider = "localhost",
            parameters = { "PARAM": "parameter_value" },
            security = { "basic_auth": { "username": "username", "password": "password" } }
        )

        self.assertIn("/api/1", result.url)

    def test_destroy_without_setup(self):
        client = OneClient(assets_path = ASSETS_PATH)
        client.destroy()
        self.assertTrue(True)

if __name__ == '__main__':
    unittest.main()
