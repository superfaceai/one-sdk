'''profile doc'''
name = "scope/example"
version = "1.2.3"

// comment
"""
Foo usecase
"""
usecase Foo safe {
	input {
		f! string!
		fn string
		x [MyModel] | Banana
	}
	result number
	error enum {
		FORBIDDEN_WORD
		FOO = "123",
		BAR
	}

	"success example"
	example success_example {
		input {
			"hello has 5 letters"
			f = "hello"
			fn = None
		}
		result 5
		// TODO: do we want this? async result undefined
	}

	example error_example {
		input {
			f = "evil"
		}
		error "FORBIDDEN_WORD"
	}

	example {
		result [0, 1, 2]
	}
}