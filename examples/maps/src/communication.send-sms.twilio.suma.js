/// <reference types="superface-map-std" />

/** @type {UsecaseFn} */
function sendSms({ input, parameters, services }) {
  const url = `${services.default}/2010-04-01/Accounts/${parameters.TWILIO_ACCOUNT_SID}/Messages.json`;
  const options = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-type': 'application/x-www-form-urlencoded'
    },
    body: {
      To: input.to,
      From: parameters.from,
      Body: input.text
    },
    security: 'basic'
  };

  const response = std.unstable.fetch(url, options).response();
  const body = response.bodyAuto() ?? {};
  if (response.status !== 201) {
    throw new std.unstable.MapError({
      title: 'Unexpected response',
      detail: `${JSON.stringify(response)} - ${JSON.stringify(body)}`
    });
  }

  return { messageId: body.sid };
}
