name = "wasm-sdk/example"
version = "0.1.0"

usecase Example {
  input {
    id!
  }

  result {
    url!
    method!
    query!
    headers!
  }

  error {
    title!
    detail
  }
}