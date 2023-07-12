/// <reference types="@superface/map-std" />

/** @type {UsecaseFn} */
function SendMessage({ input, parameters, services }) {
  const url = `${services.default}/messaging/v1/sms`;
  const options = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-type': 'application/json'
    },
    body: {
      to: input.to,
      from: parameters.from,
      message: input.text
    },
    security: 'apikey'
  };

  const response = std.unstable.fetch(url, options);
  const body = response.json() ?? {};
  if (response.status !== 202) {
    throw new std.unstable.MapError({
      title: `Unexpected response status ${response.status}`,
      detail: `HTTP status ${response.status}, expected 202: ${body}`
    });
  }

  return { messageId: body.messageId };
}
