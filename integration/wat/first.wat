(module
  (func $test_me (import "sf_unstable" "test_me") (param i32) (result i32))
  
  (memory 1)
  (export "memory" (memory 0))
  (data (i32.const 8) "hello world\n")

  (func (export "sf_entry") (param i32) (result i32)
    local.get 0
    
    i32.const 1
    i32.add
    call $test_me
    
    i32.const 1
    i32.add
    call $test_me

    i32.const 1
    i32.sub
    call $test_me

    i32.const 1
    i32.sub
    call $test_me
  )
)
