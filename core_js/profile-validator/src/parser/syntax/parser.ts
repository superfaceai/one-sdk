import { ProfileDocumentNode } from '../../ast';

import { Source } from '../common/source';
import { SyntaxError } from '../error';
import { Lexer } from '../lexer/lexer';
import { SyntaxRule } from './rule';
import * as profileRules from './rules/profile';

export function parseRuleResult<N>(
  rule: SyntaxRule<N>,
  source: Source,
  skipSOF?: boolean
): { kind: 'success'; value: N } | { kind: 'failure'; error: SyntaxError } {
  const lexer = new Lexer(source);
  if (skipSOF === true) {
    lexer.next();
  }

  const result = rule.tryMatch(lexer);
  if (result.kind === 'match') {
    return { kind: 'success', value: result.match };
  } else {
    const error = SyntaxError.fromSyntaxRuleNoMatch(source, result);

    return {
      kind: 'failure',
      error,
    };
  }
}

/**
 * Attempts to match `rule` onto `source`.
 *
 * If `skipSOF === true`, the first token of the newly created lexer token stream (the SOF token)
 * is skipped.
 *
 * Internally this function calls `parseRuleResult` and throws the error.
 */
export function parseRule<N>(
  rule: SyntaxRule<N>,
  source: Source,
  skipSOF?: boolean
): N {
  const result = parseRuleResult(rule, source, skipSOF);

  if (result.kind === 'failure') {
    throw result.error;
  }

  return result.value;
}

/**
 * Equivalent to calling `parseRule(profileRules.PROFILE_DOCUMENT, source)` but isn't required to return location info.
 */
export function parseProfile(source: Source): ProfileDocumentNode {
  return parseRule(profileRules.PROFILE_DOCUMENT, source);
}
