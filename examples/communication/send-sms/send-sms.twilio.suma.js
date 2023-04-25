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
    // TODO: check here if this an unexpected error or mapped error - mapped errors should be a subclass defined in stdlib
    std.unstable.setOutputFailure(e);
  }
}

function sendSms(input, vars) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${vars.TWILIO_ACCOUNT_SID}/Messages.json`;
  const options = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-type': 'application/x-www-form-urlencoded'
    },
    body: {
      To: input.to,
      From: vars.from,
      Body: input.text
    },
    security: {
      type: 'http',
      scheme: 'basic',
      user: '$TWILIO_ACCOUNT_SID',
      password: '$TWILIO_AUTH_TOKEN'
    }
  };

  const response = std.unstable.fetch(url, options).response();
  const body = response.bodyAuto() ?? {};
  if (response.status !== 201) {
    throw {
      title: 'Unexpected response',
      detail: `${JSON.stringify(response)} - ${JSON.stringify(body)}`
    };
  }

  return { messageId: body.sid };
}
