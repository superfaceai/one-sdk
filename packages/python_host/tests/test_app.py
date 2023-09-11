import os
import unittest

from one_sdk import ValidationError
from one_sdk.app import WasiApp
from one_sdk.platform import PythonFilesystem, PythonNetwork, PythonPersistence

class TestApp(unittest.TestCase):
	@classmethod
	def setUpClass(cls):
		cls.app = WasiApp(
			filesystem = PythonFilesystem,
			network = PythonNetwork,
			persistence = PythonPersistence
		)

		with open(os.path.abspath(os.path.join(__file__, "../../src/one_sdk/assets/test-core.wasm")), "rb") as file:
			cls.app.load_core(file.read())
		cls.app.init()

	@classmethod
	def	tearDownClass(cls):
		cls.app.destroy()

	def test_invalid_user_input(self):
		with self.assertRaises(ValidationError):
			self.app.perform(
				profile_url = '',
				provider_url = '',
				map_url = '',
				usecase = 'CORE_PERFORM_INPUT_VALIDATION_ERROR',
				input = {},
				parameters = {},
				security = {}
			)

if __name__ == '__main__':
	unittest.main()
