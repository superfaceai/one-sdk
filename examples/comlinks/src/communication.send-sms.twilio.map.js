/// <reference types="@superface/map-std" />
// @ts-check

/** @type {UseCase<{ safety: 'unsafe', input: { to?: AnyValue, from?: AnyValue, text?: AnyValue }, result: { messageId: AnyValue }, error: { title: string, detail: string } }>} */
var SendMessage = ({ input, parameters, services }) => {
  const url = `${services.default}/2010-04-01/Accounts/${parameters.TWILIO_ACCOUNT_SID}/Messages.json`;
  const options = {
    method: 'POST',
    headers: {
      'Accept': ['application/json'],
      'Content-type': ['application/x-www-form-urlencoded']
    },
    body: {
      To: input.to ?? null,
      From: parameters.from ?? null,
      Body: input.text ?? null
    },
    security: 'basic'
  };

  const response = std.unstable.fetch(url, options).response();
  const body = /** @type {Record<string, AnyValue>} */ (response.bodyAuto() ?? {});
  if (response.status !== 201) {
    throw new std.unstable.MapError({
      title: 'Unexpected response',
      detail: `${JSON.stringify(response)} - ${JSON.stringify(body)}`
    });
  }

  return { messageId: body.sid };
}
