import * as util from '../../../common/source';
import { SyntaxErrorCategory } from '../../../error';
import { LexerTokenKind, StringTokenData } from '../../token';
import { ParseResult } from '../result';

function resolveStringLiteralEscape(
  slice: string
): { length: number; value: string } | undefined {
  const firstChar = slice.charCodeAt(0);

  let result;
  switch (firstChar) {
    case 34:
      result = '"';
      break;

    case 39:
      result = "'";
      break;

    case 92:
      result = '\\';
      break;

    case 110:
      result = '\n';
      break;

    case 114:
      result = '\r';
      break;

    case 116:
      result = '\t';
      break;

    default:
      return undefined;
  }

  return {
    value: result,
    length: 1,
  };
}

/**
 * Returns the index of the first and last string in the array that is non-empty.
 *
 * Returns `[-1, -1]` if no non-empty lines are found.
 */
function firstLastNonempty(lines: string[]): [number, number] {
  let first = -1;
  let last = -1;

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim() !== '') {
      last = i;

      if (first === -1) {
        first = i;
      }
    }
  }

  return [first, last];
}

/** Returns the greatest common substring at the start both of `a` and `b`. */
function commonPrefix(a: string, b: string): string {
  let common = '';

  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    if (a[i] !== b[i]) {
      break;
    }

    common += a[i];
  }

  return common;
}

function transformBlockStringValue(string: string): string {
  const lines = string.split('\n');

  const [nonemptyStart, nonemptyEnd] = firstLastNonempty(lines);
  // This is ok because `slice(-1, 0)` returns an empty array for which we check next
  const nonemptyLines = lines.slice(nonemptyStart, nonemptyEnd + 1);
  if (nonemptyLines.length === 0) {
    return '';
  }

  const leadingIndentCount = util.countStarting(
    char => util.isWhitespace(char),
    nonemptyLines[0]
  );
  const commonIndent = nonemptyLines.reduce(
    (acc, curr) => commonPrefix(acc, curr),
    nonemptyLines[0].slice(0, leadingIndentCount)
  );

  const output = nonemptyLines
    .map(line => line.slice(commonIndent.length))
    .join('\n');

  return output;
}

/**
 * Tries to parse a string literal token at current position.
 *
 * Returns nomatch if the current position cannot contain a string literal.
 *
 * Returns an error if parsing fails.
 */
export function tryParseStringLiteral(
  slice: string
): ParseResult<StringTokenData> {
  const firstChar = slice.charCodeAt(0);
  if (!util.isStringLiteralChar(firstChar)) {
    return {
      kind: 'nomatch',
      tokenKind: LexerTokenKind.STRING,
    };
  }

  let startingQuoteChars = util.countStarting(
    char => char === firstChar,
    slice
  );

  // Special case where the string is empty ('' or "")
  if (startingQuoteChars === 2) {
    return {
      kind: 'match',
      data: {
        kind: LexerTokenKind.STRING,
        string: '',
      },
      relativeSpan: { start: 0, end: 2 },
    };
  }
  // Special case where a triple-quoted string is empty ('''''' or """""")
  if (startingQuoteChars >= 6) {
    return {
      kind: 'match',
      data: {
        kind: LexerTokenKind.STRING,
        string: '',
      },
      relativeSpan: { start: 0, end: 6 },
    };
  }

  // In case there are 4 or 5 quote chars in row, we treat the 4th and 5th as part of the string itself.
  if (startingQuoteChars > 3) {
    startingQuoteChars = 3;
  }

  /** non-block strings allow escaping characters, so the predicate must different */
  let nonquotePredicate: (_: number) => boolean;
  if (startingQuoteChars === 1) {
    nonquotePredicate = (char: number): boolean =>
      char !== firstChar && !util.isStringLiteralEscapeChar(char);
  } else {
    nonquotePredicate = (char: number): boolean => char !== firstChar;
  }

  // Now parse the body of the string
  let resultString = '';
  let restSlice = slice.slice(startingQuoteChars);
  let eatenChars = startingQuoteChars;

  // Closure to reduce repeating
  const eatChars = (count: number, add?: boolean | string): void => {
    if (typeof add === 'string') {
      resultString += add;
    } else if (add ?? true) {
      resultString += restSlice.slice(0, count);
    }

    restSlice = restSlice.slice(count);
    eatenChars += count;
  };

  for (;;) {
    // Eat all nonquote chars and update the count
    const nonquoteChars = util.countStarting(nonquotePredicate, restSlice);
    eatChars(nonquoteChars);

    // Now we hit either:
    // * Quote chars
    // * Escape chars
    // * EOF
    const nextChar = restSlice.charCodeAt(0);
    if (isNaN(nextChar)) {
      return {
        kind: 'error',
        tokenKind: LexerTokenKind.STRING,
        errors: [
          {
            relativeSpan: { start: 0, end: eatenChars },
            detail: 'Unexpected EOF',
            category: SyntaxErrorCategory.LEXER,
            hints: [],
          },
        ],
      };
    } else if (util.isStringLiteralEscapeChar(nextChar)) {
      // Eat the backslash
      eatChars(1, false);

      const escapeResult = resolveStringLiteralEscape(restSlice);
      if (escapeResult === undefined) {
        return {
          kind: 'error',
          tokenKind: LexerTokenKind.STRING,
          errors: [
            {
              relativeSpan: { start: 0, end: eatenChars + 1 },
              detail: 'Invalid escape sequence',
              category: SyntaxErrorCategory.LEXER,
              hints: [],
            },
          ],
        };
      }

      eatChars(escapeResult.length, escapeResult.value);
    } else if (nextChar === firstChar) {
      const quoteChars = util.countStarting(
        char => char === firstChar,
        restSlice
      );

      // Check for string literal end
      if (quoteChars >= startingQuoteChars) {
        // Make sure to only eat matching number of quote chars at the end
        eatenChars += startingQuoteChars;
        break;
      }

      // Just some quote chars inside the literal, moving on
      eatChars(quoteChars);
    } else {
      throw 'Invalid lexer state. This in an error in the lexer.';
    }
  }

  if (startingQuoteChars === 3) {
    resultString = transformBlockStringValue(resultString);
  }

  return {
    kind: 'match',
    data: {
      kind: LexerTokenKind.STRING,
      string: resultString,
    },
    relativeSpan: { start: 0, end: eatenChars },
  };
}
