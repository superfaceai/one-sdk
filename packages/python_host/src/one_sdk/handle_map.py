from typing import Generic, MutableMapping, Optional, TypeVar

T = TypeVar("T")
class HandleMap(Generic[T]):
	def __init__(self):
		self._index: int = 1
		self.data: MutableMapping[int, T] = {}
	
	def insert(self, value: T) -> int:
		handle = self._index
		self._index += 1
		self.data[handle] = value

		return handle
	
	def get(self, handle: int) -> Optional[T]:
		return self.data.get(handle, None)
	
	def remove(self, handle: int) -> Optional[T]:
		return self.data.pop(handle, None)
