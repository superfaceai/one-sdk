from typing import Any

from enum import IntEnum, Enum

class BaseError(Exception):
	def __init__(self, name: str, message: str):
		self.name = name
		self.message = message
	
	def __str__(self) -> str:
		return f"{self.name}: {self.message}"

class PerformError(BaseError):
	def __init__(self, error_result: Any):
		super().__init__("PerformError", str(error_result))
		self.error_result = error_result

class ValidationError(BaseError):
	def __init__(self, message: str):
		super().__init__("ValidationError", message)

class UnexpectedError(BaseError):
	def __init__(self, name: str, message: str):
		super().__init__(name, message)

class UninitializedError(BaseError):
	def __init__(self):
		super().__init__("Uninitialized", "OneClient isn't initialized.")

class WasiErrno(IntEnum):
	SUCCESS = 0
	E2BIG = 1
	EACCES = 2
	EADDRINUSE = 3
	EADDRNOTAVAIL = 4
	EAFNOSUPPORT = 5
	EAGAIN = 6
	EALREADY = 7
	EBADF = 8
	EBADMSG = 9
	EBUSY = 10
	ECANCELED = 11
	ECHILD = 12
	ECONNABORTED = 13
	ECONNREFUSED = 14
	ECONNRESET = 15
	EDEADLK = 16
	EDESTADDRREQ = 17
	EDOM = 18
	EDQUOT = 19
	EEXIST = 20
	EFAULT = 21
	EFBIG = 22
	EHOSTUNREACH = 23
	EIDRM = 24
	EILSEQ = 25
	EINPROGRESS = 26
	EINTR = 27
	EINVAL = 28
	EIO = 29
	EISCONN = 30
	EISDIR = 31
	ELOOP = 32
	EMFILE = 33
	EMLINK = 34
	EMSGSIZE = 35
	EMULTIHOP = 36
	ENAMETOOLONG = 37
	ENETDOWN = 38
	ENETRESET = 39
	ENETUNREACH = 40
	ENFILE = 41
	ENOBUFS = 42
	ENODEV = 43
	ENOENT = 44
	ENOEXEC = 45
	ENOLCK = 46
	ENOLINK = 47
	ENOMEM = 48
	ENOMSG = 49
	ENOPROTOOPT = 50
	ENOSPC = 51
	ENOSYS = 52
	ENOTCONN = 53
	ENOTDIR = 54
	ENOTEMPTY = 55
	ENOTRECOVERABLE = 56
	ENOTSOCK = 57
	ENOTSUP = 58
	ENOTTY = 59
	ENXIO = 60
	EOVERFLOW = 61
	EOWNERDEAD = 62
	EPERM = 63
	EPIPE = 64
	EPROTO = 65
	EPROTONOSUPPORT = 66
	EPROTOTYPE = 67
	ERANGE = 68
	EROFS = 69
	ESPIPE = 70
	ESRCH = 71
	ESTALE = 72
	ETIMEDOUT = 73
	ETXTBSY = 74
	EXDEV = 75
	ENOTCAPABLE = 76

class WasiError(Exception):
	def __init__(self, errno: WasiErrno):
		self.message = f"WASI error: {errno.name}"
		self.errno = errno

# TODO: StrEnum base class - needs 3.11
class ErrorCode(str, Enum):
	NetworkError = "network:error"
	NetworkConnectionRefused = "network:ECONNREFUSED"
	NetworkHostNotFound = "network:ENOTFOUND"
	NetworkInvalidUrl = "network:invalid_url"

class HostError(Exception):
	def __init__(self, code: ErrorCode, message: str):
		self.code = code
		self.message = message
