/// <reference types="@superface/map-std" />
// @ts-check

/** @type {UsecaseFn<{ to?: AnyValue, from?: AnyValue, text?: AnyValue }, { messageId: AnyValue }>} */
function SendMessage({ input, parameters, services }) {
  const url = `${services.default}/messaging/v1/sms`;
  const options = {
    method: 'POST',
    headers: {
      'Accept': ['application/json'],
      'Content-type': ['application/json']
    },
    body: {
      to: input.to ?? null,
      from: parameters.from ?? null,
      message: input.text ?? null
    },
    security: 'apikey'
  };

  const response = std.unstable.fetch(url, options).response();
  const body = /** @type {Record<string, AnyValue>} */ (response.bodyAuto() ?? {});
  if (response.status !== 202) {
    throw new std.unstable.MapError({
      title: `Unexpected response status ${response.status}`,
      detail: `HTTP status ${response.status}, expected 202: ${body}`
    });
  }

  return { messageId: body.messageId };
}
