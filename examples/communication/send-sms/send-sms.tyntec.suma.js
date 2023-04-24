// TODO: in later versions this will be injected automatically
function _start(usecaseName) {
  // for development purposes only
  __ffi.unstable.printDebug('Running usecase:', usecaseName);

  const { input, vars } = std.unstable.takeInput();
  __ffi.unstable.printDebug('Input:', input);
  __ffi.unstable.printDebug('Vars:', vars);

  try {
    const result = sendSms(input, vars);
    std.unstable.setOutputSuccess(result);
  } catch (e) {
    // TODO: check here if this an unexpected error or mapped error
    std.unstable.setOutputFailure(e);
  }
}

function sendSms(input, vars) {
  const url = 'https://api.tyntec.com/messaging/v1/sms';
  const options = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-type': 'application/json'
    },
    body: {
      to: input.to,
      from: vars.from,
      message: input.text
    },
    security: {
      type: 'apikey',
      in: 'header',
      name: 'ApiKey',
      apikey: '$TYNTEC_API_KEY'
    }
  };

  const response = std.unstable.fetch(url, options).response();
  const body = response.bodyAuto() ?? {};
  if (response.status !== 202) {
    throw {
      title: `Unexpected response status ${response.status}`,
      detail: `HTTP status ${response.status}, expected 202: ${body}`
    };
  }

  return { messageId: body.messageId };
}
