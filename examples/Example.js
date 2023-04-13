/**
 * Optionally integration can define manifest, which declares requirements for integration.
 * 
 * Manifest is exported constant named manifest.
 * 
 * Manifest can contain:
 * - urls: array of urls, which are allowed to be used in fetch
 * - vars: array of variables, which are required to be set
 * - secrets: array of secrets, which are required to be set
 */
// TODO: uncomment when manifest is supported
// export const manifest = {
//   urls: [
//     'https://superface.ai',
//     'https://superface.dev'
//   ],
//   vars: [{ name: 'FOO', description: '' }, { name: 'BAR', description: '' }],
//   secrets: [{ name: 'USER', description: '' }, { name: 'PASSWORD', description: '' }],
// }

/**
 * TODO remove _start and use default exported function
 */
function _start(usecaseName) {
  __ffi.unstable.printDebug(
    'Running usecase:',
    usecaseName
  );

  ExampleUsecaseImplementation();
}

// TODO: uncomment when export default is supported
// export default function ExampleUsecaseImplementation() {
function ExampleUsecaseImplementation() {
  const { input, vars } = std.unstable.takeInput();

  __ffi.unstable.printDebug('Input:', input);
  __ffi.unstable.printDebug('Vars:', vars);

  const url = `https://swapi.dev/api/people/${input.id}`;

  const options = {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    security: {
      type: 'http',
      scheme: 'basic',
      user: '$USER',
      password: '$PASSWORD',
    },
  };

  const response = std.unstable.fetch(url, options).response();

  const body = response.bodyAuto() ?? {};

  std.unstable.setOutputSuccess({
    name: body.name,
    height: body.height,
    VAR: vars.MY_VAR,
  });
}