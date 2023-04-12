import type { AnyValue } from 'map-std/types/unstable';
import { unstable } from 'map-std';

import { parseRuleResult, profileRules, Source } from './parser';
import { ProfileParameterValidator, ok, err } from './validator';

// cache AST/validator between runs
declare const globalThis: { profileValidator?: ProfileParameterValidator };

function _start() {
  let result;
  try {
    result = main(unstable.takeInput() as any);
    unstable.setOutputSuccess(result);
  } catch (e) {
    unstable.setOutputFailure((e as Error).message);
  }
}

function main(input: {
  profile?: string,
  usecase?: string,
  input?: AnyValue,
  result?: AnyValue,
  error?: AnyValue
}): AnyValue {
  if (input.profile) {
    const ast = parseRuleResult(profileRules.PROFILE_DOCUMENT, new Source(input.profile));
    if (ast.kind !== 'success') {
      throw ast.error;
    }

    globalThis.profileValidator = new ProfileParameterValidator(ast.value);
    return true;
  }

  if (globalThis.profileValidator === undefined) {
    throw new Error('Profile not set');
  }
  if (!input.usecase) {
    throw new Error('Usecase not set');
  }

  if (input.input) {
    return globalThis.profileValidator.validate(input.input, 'input', input.usecase).match(
      _ok => null,
      err => err.message
    );
  }
  if (input.result) {
    return globalThis.profileValidator.validate(input.input, 'result', input.usecase).match(
      _ok => null,
      err => err.message
    );
  }
  if (input.error) {
    // TODO: not supported by current validator
    throw new Error('Error validation not supported');
  }

  return null;
}

_start()
