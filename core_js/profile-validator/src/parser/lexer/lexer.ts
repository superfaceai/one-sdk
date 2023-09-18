import {
  CharIndexSpan,
  computeEndLocation,
  countStarting,
  isNewline,
  isWhitespace,
  Location,
  Source,
} from '../common/source';
import { SyntaxError, SyntaxErrorCategory } from '../error';
import { LexerContext, LexerContextType, Sublexer } from './context';
import { tryParseDefault } from './sublexer/default';
import { ParseResult } from './sublexer/result';
import { LexerToken, LexerTokenData, LexerTokenKind } from './token';

export type LexerTokenKindFilter = { [K in LexerTokenKind]: boolean };
export const DEFAULT_TOKEN_KIND_FILTER: LexerTokenKindFilter = {
  [LexerTokenKind.COMMENT]: true,
  [LexerTokenKind.NEWLINE]: true,
  [LexerTokenKind.IDENTIFIER]: false,
  [LexerTokenKind.LITERAL]: false,
  [LexerTokenKind.OPERATOR]: false,
  [LexerTokenKind.SEPARATOR]: false,
  [LexerTokenKind.STRING]: false,
  [LexerTokenKind.JESSIE_SCRIPT]: false,
  [LexerTokenKind.UNKNOWN]: false,
};

export interface LexerTokenStream<SavedState = unknown>
  extends Generator<LexerToken, undefined, LexerContext | undefined> {
  tokenKindFilter: LexerTokenKindFilter;
  readonly source: Source;

  peek(
    ...context: [] | [LexerContext | undefined]
  ): IteratorResult<LexerToken, undefined>;

  /** Saves the stream state to be restored later. */
  save(): SavedState;

  /** Roll back the state of the stream to the given saved state. */
  rollback(token: SavedState): void;
}

/**
 * Lexer tokenizes input string into tokens.
 *
 * The lexer generates a stream of tokens, always starting with SEPARATOR SOF and always ending with SEPARATOR EOF.
 * The stream can be consumed by calling `advance`. After each advance, `lookahead` will provide access to the next
 * token without consuming it.
 * After EOF is emitted, all further calls to `advance` and `lookahead` will return the same EOF.
 *
 * An optional `tokenKindFilter` parameter can be provided to filter
 * the tokens returned by `advance` and `lookahead`. By default, this filter skips comment nodes.
 *
 * The advance function also accepts an optional `context` parameter which can be used to control the lexer context
 * for the next token.
 */
export class Lexer implements LexerTokenStream<[LexerToken, boolean]> {
  private readonly sublexers: {
    [C in LexerContextType]: Sublexer<C>;
  };

  /** Last emitted token. */
  private currentToken: LexerToken;

  /** Stores whether the SOF and EOF were yielded. */
  private fileSeparatorYielded = false;

  /** Token kinds to filter from the stream. */
  tokenKindFilter: LexerTokenKindFilter;

  constructor(readonly source: Source, tokenKindFilter?: LexerTokenKindFilter) {
    this.sublexers = {
      [LexerContextType.DEFAULT]: tryParseDefault
    };

    this.currentToken = new LexerToken(
      {
        kind: LexerTokenKind.SEPARATOR,
        separator: 'SOF',
      },
      {
        start: {
          line: 1,
          column: 1,
          charIndex: 0,
        },
        end: {
          line: 1,
          column: 1,
          charIndex: 0,
        },
      }
    );

    this.tokenKindFilter = tokenKindFilter ?? DEFAULT_TOKEN_KIND_FILTER;
  }

  /** Advances the lexer returning the current token. */
  advance(context?: LexerContext): LexerToken {
    if (this.currentToken.isEOF()) {
      this.fileSeparatorYielded = true;

      return this.currentToken;
    }

    if (this.currentToken.isSOF() && !this.fileSeparatorYielded) {
      this.fileSeparatorYielded = true;

      return this.currentToken;
    }

    this.currentToken = this.lookahead(context);
    this.fileSeparatorYielded = false;

    return this.currentToken;
  }

  /** Returns the next token without advancing the lexer. */
  lookahead(context?: LexerContext): LexerToken {
    // EOF forever
    if (this.currentToken.isEOF()) {
      return this.currentToken;
    }

    // read next token
    let nextToken = this.readNextToken(this.currentToken, context);

    // skip tokens if they are caught by the filter
    while (this.tokenKindFilter[nextToken.data.kind]) {
      // Always break on EOF even if separators are filtered to avoid an infinite loop.
      if (nextToken.isEOF()) {
        break;
      }

      nextToken = this.readNextToken(nextToken, context);
    }

    return nextToken;
  }

  next(context?: LexerContext): IteratorResult<LexerToken, undefined> {
    const tok = this.advance(context);

    // Ensure that EOF is yielded once
    if (tok.isEOF() && this.fileSeparatorYielded) {
      return {
        done: true,
        value: undefined,
      };
    }

    return {
      done: false,
      value: tok,
    };
  }

  return(value?: undefined): IteratorResult<LexerToken, undefined> {
    return {
      done: true,
      value,
    };
  }

  throw(e?: unknown): IteratorResult<LexerToken, undefined> {
    throw e;
  }

  [Symbol.iterator](): Generator<
    LexerToken,
    undefined,
    LexerContext | undefined
  > {
    return this;
  }

  peek(context?: LexerContext): IteratorResult<LexerToken, undefined> {
    const tok = this.lookahead(context);

    if (tok.isEOF() && this.currentToken.isEOF()) {
      return {
        done: true,
        value: undefined,
      };
    }

    return {
      done: false,
      value: tok,
    };
  }

  /** Saves the lexer state to be restored later. */
  save(): [LexerToken, boolean] {
    return [this.currentToken, this.fileSeparatorYielded];
  }

  /**
   * Roll back the state of the lexer to the given saved state.
   *
   * The lexer will continue from this state forward.
   */
  rollback(state: [LexerToken, boolean]): void {
    this.currentToken = state[0];
    this.fileSeparatorYielded = state[1];
  }

  /**
   * Compute start location of the token following `lastToken`.
   */
  private computeNextTokenStartLocation(lastToken: LexerToken): Location {
    // Count number of non-newline whitespace tokens after the last token.
    const whitespaceAfterLast = countStarting(
      ch => !isNewline(ch) && isWhitespace(ch),
      this.source.body.slice(lastToken.location.end.charIndex)
    );

    // Since we already know the end location of the last token and we only cound non-newline whitespace
    // we can obtain the new location trivially.
    return {
      line: lastToken.location.end.line,
      column: lastToken.location.end.column + whitespaceAfterLast,
      charIndex: lastToken.location.end.charIndex + whitespaceAfterLast,
    };
  }

  /** Reads the next token following the `afterPosition`. */
  private readNextToken(
    lastToken: LexerToken,
    context?: LexerContext
  ): LexerToken {
    const startLocation = this.computeNextTokenStartLocation(lastToken);

    const slice = this.source.body.slice(startLocation.charIndex);

    // Call one of the sublexers
    let tokenParseResult: ParseResult<LexerTokenData>;
    if (context === undefined) {
      context = { type: LexerContextType.DEFAULT };
    }

    switch (context.type) {
      case LexerContextType.DEFAULT:
        tokenParseResult = this.sublexers[LexerContextType.DEFAULT](slice);
        break;
    }

    // For errors, there are two spans and two locations here:
    // * the location of the token which produced this error during lexing
    // * the location of the error within that token
    //
    // the entire span of the token is unknown, as the error has happened along the way
    // but we know it covers the error span at least

    // Didn't parse as any known token or produced an error
    if (tokenParseResult.kind === 'nomatch') {
      // here we couldn't match anything, so the token span and the error span are the same
      // we assume the token wasn't a newline (since we can parse that token)
      const tokenLocationSpan = {
        start: startLocation,
        end: {
          line: startLocation.line,
          column: startLocation.column + 1,
          charIndex: startLocation.charIndex + 1,
        },
      };

      const error = new SyntaxError(
        this.source,
        tokenLocationSpan,
        SyntaxErrorCategory.LEXER,
        'Could not match any token'
      );

      return new LexerToken(
        {
          kind: LexerTokenKind.UNKNOWN,
          error,
        },
        tokenLocationSpan
      );
    }

    // Produced an error
    if (tokenParseResult.kind === 'error') {
      let category: SyntaxErrorCategory;
      let detail: string | undefined;
      let hints: string[];
      let relativeSpan: CharIndexSpan;

      // Single-error results are easy
      if (tokenParseResult.errors.length === 1) {
        const error = tokenParseResult.errors[0];

        category = error.category;
        detail = error.detail;
        hints = error.hints;
        relativeSpan = error.relativeSpan;
      } else {
        // multi-error results combine all errors and hints into one, the span is the one that covers all the errors
        category = tokenParseResult.errors
          .map(e => e.category)
          .reduce((acc, curr) => {
            if (acc === curr) {
              return acc;
            } else {
              return SyntaxErrorCategory.LEXER;
            }
          });

        detail = tokenParseResult.errors
          .map(err => err.detail ?? '')
          .join('; ');
        hints = tokenParseResult.errors.flatMap(err => err.hints);
        relativeSpan = tokenParseResult.errors
          .map(err => err.relativeSpan)
          .reduce((acc, curr) => {
            return {
              start: Math.min(acc.start, curr.start),
              end: Math.max(acc.end, curr.end),
            };
          });
      }

      // here the error span and the token span (and location) are different
      const tokenLocation = {
        start: startLocation,
        end: computeEndLocation(
          this.source.body.slice(
            startLocation.charIndex,
            startLocation.charIndex + relativeSpan.end
          ),
          startLocation
        ),
      };

      const errorLocation = {
        start: computeEndLocation(
          this.source.body.slice(
            tokenLocation.start.charIndex,
            tokenLocation.start.charIndex + relativeSpan.start
          ),
          tokenLocation.start
        ),
        end: computeEndLocation(
          this.source.body.slice(
            tokenLocation.start.charIndex,
            tokenLocation.start.charIndex + relativeSpan.end
          ),
          tokenLocation.start
        ),
      };

      const error = new SyntaxError(
        this.source,
        errorLocation,
        category,
        detail,
        hints
      );

      return new LexerToken(
        {
          kind: LexerTokenKind.UNKNOWN,
          error,
        },
        tokenLocation
      );
    }

    const parsedTokenLocation = {
      start: computeEndLocation(
        this.source.body.slice(
          startLocation.charIndex,
          startLocation.charIndex + tokenParseResult.relativeSpan.start
        ),
        startLocation
      ),
      end: computeEndLocation(
        this.source.body.slice(
          startLocation.charIndex,
          startLocation.charIndex + tokenParseResult.relativeSpan.end
        ),
        startLocation
      ),
    };

    // All is well
    return new LexerToken(tokenParseResult.data, parsedTokenLocation);
  }
}
