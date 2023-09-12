/**
 * Counts starting characters from `str` as long as `predicate` returns true.
 *
 * Returns number of characters at the start of the string that match predicate.
 *
 * This function is basically a find over the input string with the predicate.
 */
export function countStarting(
  predicate: (_: number) => boolean,
  str: string
): number {
  let position = 0;
  let code = str.charCodeAt(position);
  while (!isNaN(code) && predicate(code)) {
    position += 1;
    code = str.charCodeAt(position);
  }

  return position;
}

// Common scanner checks

export function isLetter(char: number): boolean {
  // A-Z, a-z
  return (char >= 65 && char <= 90) || (char >= 97 && char <= 122);
}
export const countStartingLetters = countStarting.bind(undefined, isLetter);

export function isBinaryNumber(char: number): boolean {
  // 0, 1
  return char === 48 || char === 49;
}

export function isOctalNumber(char: number): boolean {
  // 0-7
  return char >= 48 && char <= 55;
}

export function isDecimalNumber(char: number): boolean {
  // 0-9
  return char >= 48 && char <= 57;
}

export function isHexadecimalNumber(char: number): boolean {
  // 0-9, A-F, a-f
  return (
    (char >= 48 && char <= 57) ||
    (char >= 65 && char <= 70) ||
    (char >= 97 && char <= 102)
  );
}
export const countStartingNumbers = countStarting.bind(
  undefined,
  isDecimalNumber
);

export function countStartingNumbersRadix(str: string, radix: number): number {
  switch (radix) {
    case 2:
      return countStarting(isBinaryNumber, str);

    case 8:
      return countStarting(isOctalNumber, str);

    case 10:
      return countStarting(isDecimalNumber, str);

    case 16:
      return countStarting(isHexadecimalNumber, str);

    default:
      throw `Radix ${radix} is not supported (supported: 2, 8, 10, 16).`;
  }
}

export function isDecimalSeparator(char: number): boolean {
  return char === 46;
}

export function isValidIdentifierStartChar(char: number): boolean {
  // _
  return char === 95 || isLetter(char);
}

export function isValidIdentifierChar(char: number): boolean {
  return isValidIdentifierStartChar(char) || isDecimalNumber(char);
}
export const countStartingIdentifierChars = countStarting.bind(
  undefined,
  isValidIdentifierChar
);

export function isWhitespace(char: number): boolean {
  // tab, space, BOM, newline
  return char === 9 || char === 32 || char === 0xfeff || char === 10;
}

export function isNewline(char: number): boolean {
  return char === 10;
}

export function isStringLiteralChar(char: number): boolean {
  // ", '
  return char === 34 || char === 39;
}

export function isStringLiteralEscapeChar(char: number): boolean {
  // \
  return char === 92;
}

export function isDecoratorChar(char: number): boolean {
  // @
  return char === 64;
}

// Keyword scanner checks
export function isAny(_: number): boolean {
  return true;
}

export function isNotValidIdentifierChar(char: number): boolean {
  return !isValidIdentifierChar(char);
}

/**
 * Tries parsing the following characters to match the specified keyword and be followed
 * by a character matching an optional predicate.
 *
 * If the predicate is not specified, the default predicate is `isNotValidIdentifierChar`
 */
export function tryKeywordLiteral<T>(
  str: string,
  keyword: string,
  ret: T,
  charAfterPredicate?: (_: number) => boolean
): { value: T; length: number } | undefined {
  if (str.startsWith(keyword)) {
    const checkPredicate = charAfterPredicate ?? isNotValidIdentifierChar;
    const charAfter = str.charCodeAt(keyword.length);

    if (!checkPredicate(charAfter)) {
      return undefined;
    }

    return {
      value: ret,
      length: keyword.length,
    };
  } else {
    return undefined;
  }
}
