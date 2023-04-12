import type { AnyValue } from 'map-std/types/unstable';
import { unstable } from 'map-std';

import { parseRuleResult, profileRules, Source } from './parser';
import { ProfileParameterValidator, ok, err } from './validator';

// cache AST between runs
declare const globalThis: { profileValidator?: ProfileParameterValidator };

function main() {
  const input = unstable.takeInput() as {
    profile?: string,
    usecase?: string,
    input?: AnyValue,
    result?: AnyValue,
    error?: AnyValue
  };
  let result: Record<string, AnyValue> = {};

  if (input.profile) {
    const ast = parseRuleResult(profileRules.PROFILE_DOCUMENT, new Source(input.profile));
    if (ast.kind !== 'success') {
      unstable.setOutputFailure(ast.error as unknown as AnyValue);
      return;
    }

    globalThis.profileValidator = new ProfileParameterValidator(ast.value);
    result['profile'] = true;
  }

  if (input.input) {
    if (globalThis.profileValidator === undefined) {
      unstable.setOutputFailure('Profile not set');
      return;
    }
    if (!input.usecase) {
      unstable.setOutputFailure('Usecase not set');
      return;
    }

    result['input'] = globalThis.profileValidator.validate(input.input, 'input', input.usecase) as any;
  }
  if (input.result) {
    if (globalThis.profileValidator === undefined) {
      unstable.setOutputFailure('Profile not set');
      return;
    }
    if (!input.usecase) {
      unstable.setOutputFailure('Usecase not set');
      return;
    }

    result['result'] = globalThis.profileValidator.validate(input.input, 'result', input.usecase) as any;
  }
  if (input.error) {
    if (globalThis.profileValidator === undefined) {
      unstable.setOutputFailure('Profile not set');
      return;
    }
    if (!input.usecase) {
      unstable.setOutputFailure('Usecase not set');
      return;
    }

    // TODO: not supported by current validator
    unstable.setOutputFailure('Error validation not supported');
  }

  unstable.setOutputSuccess(result);
}
main()
