import { CharIndexSpan, LocationSpan, Source } from './common/source';
import { formatTokenData, LexerTokenKind } from './lexer/token';
import { RuleResultNoMatch } from './syntax/rule';

/**
 * Computes span and the initial line offset of a (up to) 3-line block that encompasses
 * the token at `innerLocation`.
 */
function computeVisualizeBlockSpan(
  body: string,
  innerLocation: LocationSpan
): { start: number; end: number; lineOffset: number } {
  // Find start of the block slice, which is one line before the inner line, or from SOF
  const innerLineStart =
    innerLocation.start.charIndex - (innerLocation.start.column - 1);

  // Line offset is the offset between the innerLine index and the block start line index
  let lineOffset = 0;
  // This finds the last newline before the innerLine newline or -1
  let start = 0;
  if (innerLineStart !== 0) {
    start = body.slice(0, innerLineStart - 1).lastIndexOf('\n') + 1;
    lineOffset = -1;
  }

  // Find end of the vis block slice, which is one line after the inner line, or until EOF
  let end = body.length;

  const innerLineEnd = body.indexOf('\n', innerLocation.end.charIndex);
  if (innerLineEnd !== -1) {
    const nextLineEnd = body.indexOf('\n', innerLineEnd + 1);
    if (nextLineEnd !== -1) {
      end = nextLineEnd;
    }
  }

  return { start, end, lineOffset };
}

/**
 * Formats line prefix used in block visualization.
 *
 * Example: ` 13 | ` with `padSize = 3` and `lineNumber = 13`.
 */
function formatLinePrefix(padSize?: number, lineNumber?: number): string {
  let value = '';
  if (lineNumber !== undefined) {
    value = lineNumber.toString();
  }

  return `${value.padEnd(padSize ?? 4, ' ')} | `;
}

/**
 * Render error block visualization.
 * 
 * Example:
```
 1 | # line before
 2 | 0bA # line with the error
   | ^^^ # error visualization
 3 | # line after 
```
 */
function renderErrorVisualization(
  lines: string[],
  errorLocation: LocationSpan,
  prefixWidth: number,
  firstLineIndex: number,
  startPosition: number
): string {
  let output = '';
  let position = startPosition;
  let currentLine = firstLineIndex;

  for (const line of lines) {
    output += formatLinePrefix(prefixWidth, currentLine);
    output += line + '\n';

    // Check if this line intersects with the error span
    if (
      position <= errorLocation.end.charIndex &&
      position + line.length >= errorLocation.start.charIndex
    ) {
      output += formatLinePrefix(prefixWidth);

      // Iterate over the characters of the current line
      // If the character is part of the error span, add ^ underneath
      // If it isn't either add a space or, if the character is tab, add a tab
      for (let i = 0; i < line.length; i += 1) {
        if (
          i >= errorLocation.start.charIndex - position &&
          i < errorLocation.end.charIndex - position
        ) {
          output += '^';
        } else {
          if (line.charAt(i) === '\t') {
            output += '\t';
          } else {
            output += ' ';
          }
        }
      }

      output += '\n';
    }

    position += line.length;

    currentLine += 1;
    // For newline
    position += 1;
  }

  return output;
}

/**
 * Generates and renders error block visualization given the span, location and source.
 */
function generateErrorVisualization(
  source: Source,
  location: LocationSpan
): {
  visualization: string;
  maxLineNumberLog: number;
  sourceLocation: LocationSpan;
} {
  const visBlock = computeVisualizeBlockSpan(source.body, location);

  // Location within the body plus the offset of the Source metadata.
  const sourceLocation = source.applyLocationOffset(location);

  // Slice of the source that encompasses the token and is
  // delimited by newlines or file boundaries
  const sourceTextSlice = source.body.slice(visBlock.start, visBlock.end);
  const sourceTextLines = sourceTextSlice.split('\n');

  const maxLineNumberLog =
    Math.log10(sourceLocation.start.line + sourceTextLines.length) + 1;

  // Generate visualization only if the error span is not empty
  let visualization = '';
  if (location.start.charIndex < location.end.charIndex) {
    visualization = renderErrorVisualization(
      sourceTextLines,
      location,
      maxLineNumberLog,
      sourceLocation.start.line + visBlock.lineOffset,
      visBlock.start
    );
  }

  return {
    visualization,
    maxLineNumberLog,
    sourceLocation,
  };
}

export const enum SyntaxErrorCategory {
  /** Lexer token error */
  LEXER = 'Lexer',
  /** Parser rule error */
  PARSER = 'Parser',
  /** Script syntax error */
  SCRIPT_SYNTAX = 'Script syntax',
  /** Script forbidden construct error */
  SCRIPT_VALIDATION = 'Script validation',
}
type ErrorCategoryStrings = {
  categoryDetail?: string;
  categoryHints: string[];
};
function errorCategoryStrings(
  category: SyntaxErrorCategory
): ErrorCategoryStrings {
  const result: ErrorCategoryStrings = {
    categoryDetail: undefined,
    categoryHints: [],
  };

  switch (category) {
    case SyntaxErrorCategory.SCRIPT_SYNTAX:
    case SyntaxErrorCategory.SCRIPT_VALIDATION:
      result.categoryDetail = 'Error in script syntax';
      result.categoryHints.push(
        'This was parsed in script context, it might be an error in comlink syntax instead'
      );
      break;
  }

  return result;
}

export type ProtoError = {
  /** Relative span of this error with respect to the token it is attached to. */
  readonly relativeSpan: CharIndexSpan;
  readonly detail?: string;
  readonly category: SyntaxErrorCategory;
  readonly hints: string[];
};

export class SyntaxError {
  /** Additional message attached to the error. */
  readonly detail: string;
  readonly hints: string[];

  constructor(
    /** Input source that is being parsed. */
    readonly source: Source,
    /** Location of the error. */
    readonly location: LocationSpan,
    /** Category of this error. */
    readonly category: SyntaxErrorCategory,
    detail?: string,
    /** Optional hints that are emitted to help with the resolution. */
    hints?: string[]
  ) {
    const { categoryDetail, categoryHints } = errorCategoryStrings(
      this.category
    );

    this.detail = detail ?? 'Invalid or unexpected token';
    if (categoryDetail !== undefined) {
      this.detail = `${categoryDetail}: ${this.detail}`;
    }

    this.hints = hints ?? [];
    this.hints.push(...categoryHints);
  }

  static fromSyntaxRuleNoMatch(
    source: Source,
    result: RuleResultNoMatch
  ): SyntaxError {
    let actual = '<NONE>';
    if (result.attempts.token !== undefined) {
      const fmt = formatTokenData(result.attempts.token.data);
      switch (result.attempts.token.data.kind) {
        case LexerTokenKind.SEPARATOR:
        case LexerTokenKind.OPERATOR:
        case LexerTokenKind.LITERAL:
        case LexerTokenKind.IDENTIFIER:
          actual = '`' + fmt.data + '`';
          break;

        case LexerTokenKind.STRING:
          actual = '"' + fmt.data + '"';
          break;

        case LexerTokenKind.UNKNOWN:
          return result.attempts.token.data.error;

        default:
          actual = fmt.kind;
          break;
      }
    }

    // The default location is invalid on purpose
    const location = result.attempts.token?.location ?? {
      start: { line: 0, column: 0, charIndex: 0 },
      end: { line: 0, column: 0, charIndex: 0 },
    };

    const expectedFilterSet = new Set();
    const expected = result.attempts.rules
      .map(r => r.toString())
      .filter(r => {
        if (expectedFilterSet.has(r)) {
          return false;
        }

        expectedFilterSet.add(r);

        return true;
      })
      .join(' or ');

    return new SyntaxError(
      source,
      location,
      SyntaxErrorCategory.PARSER,
      `Expected ${expected} but found ${actual}`
    );
  }

  formatVisualization(): string {
    // Generate the lines
    const { visualization, maxLineNumberLog, sourceLocation } =
      generateErrorVisualization(this.source, this.location);

    const locationLinePrefix = ' '.repeat(maxLineNumberLog) + '--> ';
    const locationLine = `${locationLinePrefix}${this.source.fileName}:${sourceLocation.start.line}:${sourceLocation.start.column}`;

    return `${locationLine}\n${visualization}`;
  }

  formatHints(): string {
    function isString(i: string | undefined): i is string {
      return i !== undefined;
    }

    const filtered: string[] = this.hints.filter(isString);

    if (filtered.length === 0) {
      return '';
    }

    return filtered.map(h => `Hint: ${h}`).join('\n');
  }

  format(): string {
    return `SyntaxError: ${
      this.detail
    }\n${this.formatVisualization()}\n${this.formatHints()}`;
  }

  get message(): string {
    // TODO
    return this.detail;
  }
}
