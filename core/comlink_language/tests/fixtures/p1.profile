name = "scope/example"
version = "1.2.3"

model X [
	enum {
		A
		B
	}
]

model A {} 
model Y { name } | { email }

field fieldName B! | A!
