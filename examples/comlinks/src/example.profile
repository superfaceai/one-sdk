"""
Example Profile
Example Profile covering all features. 
Should be used for basic testing and daily tests. 
"""

name = "example"
version = "1.0.0"

"""
Main use-case
This use-case covers all profile features.
"""
 usecase Main safe {
  input {
    """
    Untyped
    Optional field without type
    """
    untyped

    """
    Required Field
    Required field without type
    """
    required_field!

    """
    Required Value
    Optional field with required string value
    """
    required_value string!

    """
    Required
    Required field with required string value
    """
    required! string!

    """
    Boolean
    Optional field with required boolean value
    """
    bool boolean!

    """
    String
    Optional field with required string value
    """
    str string!

    """
    Number
    Optional field with required number value
    """
    num number!

    named_field

    """
    Object Model
    Object with all types and models and recursion
    """
    object_model object_model!

    """
    List Model
    List of strings
    """
    list_model list_model!

    """
    Enum Model
    Enum with FOO and BAR
    """
    enum_model enum_model!

    """
    Union Model
    Union of FOO and BAR models
    """
    union_model union_model!

    """
    Alias Model
    Alias of Foo values
    """
    alias_model alias_model!

    """
    Scalar string model
    Scalar model representing string
    """
    scalar_model scalar_model!
  }

  result {
    untyped
    required_field!
    required_value string!
    required! string!
    bool boolean!
    str string!
    num number!
    named_field
    object_model object_model!
    list_model list_model!
    enum_model enum_model!
    union_model union_model!
    alias_model alias_model!
    scalar_model scalar_model!
    scalar_string_model scalar_string_model!
  }

  error {
    untyped
    required_field!
    required_value string!
    required! string!
    bool boolean!
    str string!
    num number!
    named_field
    object_model object_model!
    list_model list_model!
    enum_model enum_model!
    union_model union_model!
    alias_model alias_model!
    scalar_model scalar_model!
  }
  
  example success {
    input {
      untyped = "untyped"
      required_field = "required field"
      required_value = "required value"
      required = "required field and value"
      bool = true
      str = "string"
      num = 42
      named_field = "named string"
      object_model = {
        field1 = "required stirng"
      }
      list_model = ["string item"]
      enum_model = "FOO"
      union_model = {
        foo = "foo"
        bar = "bar"
      }
      alias_model = {
        foo = "foo"
      }
      scalar_model = "scalar model"
      scalar_string_model = "scalar model"
    }

    result {
      untyped = "untyped"
      required_field = "required field"
      required_value = "required value"
      required = "required field and value"
      bool = true
      str = "string"
      num = 42
      named_field = "named string"
      object_model = {
        field1 = "required stirng"
      }
      list_model = ["string item"]
      enum_model = "FOO"
      union_model = {
        foo = "foo"
        bar = "bar"
      }
      alias_model = {
        foo = "foo"
      }
      scalar_model = "scalar model"
      scalar_string_model = "scalar model"
    }
  }

  example error {
    input {
      required_field = "required field"
      required = "required"
    }

    error {
      untyped = "untyped"
      required_field = "required field"
      required_value = "required value"
      required = "required field and value"
      bool = true
      str = "string"
      num = 42
      named_field = "named string"
      object_model = {
        field1 = "required stirng"
      }
      list_model = ["string item"]
      enum_model = "FOO"
      union_model = {
        foo = "foo"
        bar = "bar"
      }
      alias_model = {
        foo = "foo"
      }
      scalar_model = "scalar model"
      scalar_string_model = "scalar model"
    }
  }
}

usecase Minimal {
  input {
    untyped
  }

  result string
}

model object_model {
  field0
  field1! string!
  field2 boolean
  field3 number
  field4 string
  field5 boolean!
  field6 number!
  field7 string!
  field8 boolean! 
  field9 named_field
  field10 object_model
  field11 list_model
  field12 enum_model
  field13 union_model
  field14 alias_model
  field15 scalar_model
  field16 scalar_string_model
}

model list_model [ string ]

model enum_model enum {
  FOO
  BAR
}

model Foo {
  foo
}

model Bar {
  bar
}

model union_model Foo | Bar
model alias_model Foo
model scalar_model
model scalar_string_model string

"""
Named Field
Named field with required string value
"""
field named_field string!