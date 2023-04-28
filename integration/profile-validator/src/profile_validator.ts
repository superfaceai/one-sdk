import type { AnyValue } from '@superfaceai/map-std/types/unstable';
import { unstable } from '@superfaceai/map-std';

import { parseRuleResult, profileRules, Source } from './parser';
import { ProfileParameterValidator, ok, err } from './validator';

// cache AST/validator between runs
declare const globalThis: { profileValidator?: ProfileParameterValidator };

function _start() {
  let result;
  try {
    result = main(unstable.takeContext() as any);
    unstable.setOutputSuccess(result);
  } catch (e) {
    unstable.setOutputFailure((e as Error).message);
  }
}

function main(ctx: {
  profile?: string,
  usecase?: string,
  input?: AnyValue,
  result?: AnyValue,
  error?: AnyValue
}): AnyValue {
  if (ctx.profile) {
    const ast = parseRuleResult(profileRules.PROFILE_DOCUMENT, new Source(ctx.profile));
    if (ast.kind !== 'success') {
      throw ast.error;
    }

    globalThis.profileValidator = new ProfileParameterValidator(ast.value);
    return true;
  }

  if (globalThis.profileValidator === undefined) {
    throw new Error('Profile not set');
  }
  if (!ctx.usecase) {
    throw new Error('Usecase not set');
  }

  if (ctx.input) {
    return globalThis.profileValidator.validate(ctx.input, 'input', ctx.usecase).match(
      _ok => null,
      err => err.message
    );
  }
  if (ctx.result) {
    return globalThis.profileValidator.validate(ctx.input, 'result', ctx.usecase).match(
      _ok => null,
      err => err.message
    );
  }
  if (ctx.error) {
    // TODO: not supported by current validator
    throw new Error('Error validation not supported');
  }

  return null;
}

_start()
