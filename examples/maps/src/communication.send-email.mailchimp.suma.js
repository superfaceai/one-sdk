/// <reference types="superface-map-std" />

/** @type {UsecaseFn} */
function sendEmail({ input, services }) {
	const url = `${services.mandrill}/api/1.0/messages/send`;
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
    security: 'api_key'
	};

  const response = std.unstable.fetch(url, options).response();
  const body = response.bodyAuto() ?? {};

  if (response.status === 500) {
    if (!body || !(typeof body === 'object')) {
      throw new Error('Unexpected error');
    }

    switch (body.name) {
      case 'ValidationError':
        throw new std.unstable.MapError({ title: 'Invalid inputs', detail: body.message });
      case 'Invalid_Key':
        throw new std.unstable.MapError({ title: 'Unauthorized', detail: body.message });
      default:
        throw new std.unstable.MapError({ title: 'Internal server Error', detail: body.message || `${body}` });
    }
  }

  if (response.status === 200) {
    const status = body[0].status;
    if (status === 'sent' || status === 'queued' || status === 'scheduled') {
      return { messageId: body[0]._id };
    }

    throw new std.unstable.MapError({ title: 'Send Email Failed', detail: `${status}: ${body[0].reject_reason}` });
  }

  throw new Error(`Unexpected response: ${JSON.stringify(response)}`);
}
