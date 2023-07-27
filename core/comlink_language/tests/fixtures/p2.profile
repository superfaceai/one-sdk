name = "conversation/send-message"
version = "0.1.0"

"Send single conversation message"
usecase SendMessage unsafe {
  input {
    to
    from
    channel
    text
  }

  """  Title
  Description of the result
  """
  result {
    messageId!
  }

  async result {
    messageId
    deliveryStatus
  }

  error {
    """ Problem
    Description of this field """
    problem
    """ Detail """
    detail
    " Instance whoop whoop

    "
    instance
  }
}

"Retrieve status of a sent message"
usecase RetrieveMessageStatus safe {
  input {
    messageId
  }

  result {
    deliveryStatus
  }
}

"Identifier of Message  
  The identifier is channel-specific and not unique. It should be treated as an opaque value and only used in subsequent calls"
field messageId string

"Delivery Status of Message
  Status of a sent message. Harmonized across different channels."
field deliveryStatus enum {
  accepted
  delivered
  seen
}

"
Title of the field channel
Description of the field channel
"
field channel enum {
  sms
  whatsapp
  apple_business_chat
  facebook_messenger
}