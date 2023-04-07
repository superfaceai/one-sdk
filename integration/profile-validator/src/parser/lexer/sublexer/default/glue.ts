import { isNewline } from '../../../common/source';
import {
  DefaultSublexerTokenData,
  LexerTokenData,
  LexerTokenKind,
  LiteralTokenData,
  NewlineTokenData,
} from '../../token';
import { ParseResult } from '../result';
import { tryParseNumberLiteral } from './number';
import {
  tryParseBooleanLiteral,
  tryParseComment,
  tryParseIdentifier,
  tryParseOperator,
  tryParseSeparator,
} from './rules';
import { tryParseStringLiteral } from './string';

export function chainTokenParsers<T extends LexerTokenData>(
  slice: string,
  firstParser: (slice: string) => ParseResult<T>,
  ...parsers: ((slice: string) => ParseResult<T>)[]
): ParseResult<T> {
  let result: ParseResult<T> = firstParser(slice);

  // go over parsers until one matches or errors
  for (let i = 0; i < parsers.length && result.kind === 'nomatch'; i += 1) {
    result = parsers[i](slice);
  }

  return result;
}

/**
 * Tries to parse a literal token at current position.
 *
 * Returns nomatch if the current position cannot contain a literal.
 *
 * Returns an error if parsing fails.
 */
export function tryParseLiteral(slice: string): ParseResult<LiteralTokenData> {
  return chainTokenParsers(
    slice,
    tryParseBooleanLiteral,
    tryParseNumberLiteral
  );
}

export function tryParseNewline(slice: string): ParseResult<NewlineTokenData> {
  if (isNewline(slice.charCodeAt(0))) {
    return {
      kind: 'match',
      data: { kind: LexerTokenKind.NEWLINE },
      relativeSpan: { start: 0, end: 1 },
    };
  } else {
    return {
      kind: 'nomatch',
      tokenKind: LexerTokenKind.NEWLINE,
    };
  }
}

export function tryParseDefault(
  slice: string
): ParseResult<DefaultSublexerTokenData> {
  return chainTokenParsers<DefaultSublexerTokenData>(
    slice,
    tryParseNewline,
    tryParseSeparator,
    tryParseOperator,
    tryParseLiteral,
    tryParseStringLiteral,
    tryParseIdentifier,
    tryParseComment
  );
}
