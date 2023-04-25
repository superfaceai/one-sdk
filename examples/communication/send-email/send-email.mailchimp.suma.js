// TODO: in later versions this will be injected automatically
function _start(usecaseName) {
  // for development purposes only
  __ffi.unstable.printDebug('Running usecase:', usecaseName);

  const { input, vars } = std.unstable.takeInput();
  __ffi.unstable.printDebug('Input:', input);
  __ffi.unstable.printDebug('Vars:', vars);

  try {
    const result = sendEmail(input, vars);
    std.unstable.setOutputSuccess(result);
  } catch (e) {
    // TODO: check here if this an unexpected error or mapped error - mapped errors should be a subclass defined in stdlib
    std.unstable.setOutputFailure(e);
  }
}

function sendEmail(input, vars) {
	const url = `https://mandrillapp.com/api/1.0/messages/send`;
	const options = {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'accept': 'application/json'
		},
		body: {
      key: 'key-will-go-here',
      message: {
        from_email: input.from,
        to: [{
          email: input.to,
          type: 'to'
        }],
        subject: input.subject,
        text: input.text ?? undefined,
        html: input.html ?? undefined,
        attachments: input.attachments?.map(attachment => ({
          content: attachment.content,
          name: attachment.filename,
          type: attachment.type,
        })) ?? undefined
      }
    },
    security: {
      type: 'apikey',
      in: 'body',
      name: 'key',
      apikey: '$MAILCHIMP_API_KEY',
      bodyType: 'json'
    }
	};

  const response = std.unstable.fetch(url, options).response();
  const body = response.bodyAuto() ?? {};

  if (response.status === 500) {
    if (!body || !(typeof body === 'object')) {
      throw new Error('Unexpected error');
    }

    switch (body.name) {
      case 'ValidationError':
        throw { title: 'Invalid inputs', detail: body.message };
      case 'Invalid_Key':
        throw { title: 'Unauthorized', detail: body.message };
      default:
        throw { title: 'Internal server Error', detail: body.message || `${body}` };
    }
  }

  if (response.status === 200) {
    const status = body[0].status;
    if (status === 'sent' || status === 'queued' || status === 'scheduled') {
      return { messageId: body[0]._id };
    }

    throw { title: 'Send Email Failed', detail: `${status}: ${body[0].reject_reason}` };
  }

  throw new Error(`Unexpected response: ${JSON.stringify(response)}`);
}
