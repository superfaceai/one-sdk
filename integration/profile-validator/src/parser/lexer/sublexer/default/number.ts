import * as util from '../../../common/source';
import { SyntaxErrorCategory } from '../../../error';
import { LexerTokenKind, LiteralTokenData } from '../../token';
import { ParseResult } from '../result';

export function tryParseNumberLiteral(
  slice: string
): ParseResult<LiteralTokenData> {
  let prefixLength = 0; // Length of the base prefix plus + or -
  let numberLength = 0; // Length of the actual digits with decimal separator as well

  // Check and store negativity flag
  let isNegative = false;
  {
    if (slice.startsWith('-')) {
      isNegative = true;
      prefixLength = 1;
    } else if (slice.startsWith('+')) {
      prefixLength = 1;
    }
  }
  const prefixSlice = slice.slice(prefixLength); // strip the + or -

  // Parse the base prefix
  const keywordLiteralBase = util.tryKeywordLiteral(
    prefixSlice,
    '0x',
    16,
    util.isAny
  ) ??
    util.tryKeywordLiteral(prefixSlice, '0b', 2, util.isAny) ??
    util.tryKeywordLiteral(prefixSlice, '0o', 8, util.isAny) ?? {
      value: 10,
      length: 0,
    };
  prefixLength += keywordLiteralBase.length;

  // integer or float after `base` characters
  const numberSlice = slice.slice(prefixLength);
  const startingNumbers = util.countStartingNumbersRadix(
    numberSlice,
    keywordLiteralBase.value
  );

  // Exit if there aren't any numbers
  if (startingNumbers === 0) {
    if (prefixLength !== 0) {
      return {
        kind: 'error',
        tokenKind: LexerTokenKind.LITERAL,
        errors: [
          {
            detail:
              'Expected a number following a sign or an integer base prefix',
            category: SyntaxErrorCategory.LEXER,
            relativeSpan: { start: 0, end: prefixLength + 1 },
            hints: [],
          },
        ],
      };
    } else {
      return { kind: 'nomatch', tokenKind: LexerTokenKind.LITERAL };
    }
  }
  numberLength += startingNumbers;

  let isFloat = false;
  if (keywordLiteralBase.value === 10) {
    const afterNumberSlice = numberSlice.slice(startingNumbers);
    // Definitely float after decimal separator
    if (util.isDecimalSeparator(afterNumberSlice.charCodeAt(0))) {
      // + 1 for decimal separator
      numberLength += 1 + util.countStartingNumbers(afterNumberSlice.slice(1));
      isFloat = true;
    }
  }

  // Now we know how long the number is and what base it is in, so we parse the subslice using built-in parse functions
  const digitsStringSlice = slice.slice(
    prefixLength,
    prefixLength + numberLength
  );

  let numberValue: number;
  if (isFloat) {
    numberValue = parseFloat(digitsStringSlice);
  } else {
    numberValue = parseInt(digitsStringSlice, keywordLiteralBase.value);
  }

  if (isNaN(numberValue)) {
    // This should never happen as we validate the digits by parsing them
    throw 'Invalid lexer state. This in an error in the lexer.';
  }

  if (isNegative) {
    numberValue = -numberValue;
  }

  return {
    kind: 'match',
    data: {
      kind: LexerTokenKind.LITERAL,
      literal: numberValue,
    },
    relativeSpan: {
      start: 0,
      end: prefixLength + numberLength,
    },
  };
}
