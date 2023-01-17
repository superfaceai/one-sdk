(module
  (func $test_me (import "sf_unstable" "test_me") (param i32) (result i32))
  (func (export "sf_entry") (param i32) (result i32)
    (local $var i32)
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
