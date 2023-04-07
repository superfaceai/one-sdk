import type { AnyValue } from 'map-std/types/unstable';
import { unstable } from 'map-std';

import { ProfileDocumentNode } from './ast';
import { parseRuleResult, profileRules, Source } from './parser';

// cache AST between runs
declare const globalThis: { profileAst?: ProfileDocumentNode };
globalThis.profileAst = undefined;

function main() {
  const input = unstable.takeInput() as { profile?: string, input?: AnyValue, result?: AnyValue, error?: AnyValue };
  let result: Record<string, AnyValue> = {};

  if (input.profile != undefined) {
    const ast = parseRuleResult(profileRules.PROFILE_DOCUMENT, new Source(input.profile));
    if (ast.kind === 'success') {
      globalThis.profileAst = ast.value;
      result.profile = globalThis.profileAst as unknown as  AnyValue;
    } else {
      unstable.setOutputFailure(ast.error as unknown as AnyValue);
      return;
    }
  }

  if (input.input != undefined) {
    // validate input
  }
  if (input.result != undefined) {
    // validate result
  }
  if (input.error != undefined) {
    // validate error
  }

  unstable.setOutputSuccess(result);
}
main()
