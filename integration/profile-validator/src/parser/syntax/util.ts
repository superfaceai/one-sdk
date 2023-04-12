import { Source } from '../common/source';
import { LexerContext, LexerToken, LexerTokenStream } from '../lexer';
import {
  DEFAULT_TOKEN_KIND_FILTER,
  LexerTokenKindFilter,
} from '../lexer/lexer';

/**
 * LexerTokenStream implementation that takes tokens from an array instead of a Lexer.
 *
 * This is mostly used in tests.
 */
export class ArrayLexerStream implements LexerTokenStream<number> {
  private index: number;

  tokenKindFilter: LexerTokenKindFilter;
  readonly source: Source;

  constructor(private readonly array: ReadonlyArray<LexerToken>) {
    this.index = 0;
    this.tokenKindFilter = DEFAULT_TOKEN_KIND_FILTER;
    this.source = new Source(
      array.map(token => token.toStringDebug()).join('\n')
    );
  }

  next(context?: LexerContext): IteratorResult<LexerToken, undefined> {
    if (this.index >= this.array.length) {
      return {
        done: true,
        value: undefined,
      };
    }

    const token = this.array[this.index];
    let result: IteratorResult<LexerToken, undefined> = {
      done: false,
      value: token,
    };

    this.index += 1;
    if (this.tokenKindFilter[token.data.kind]) {
      // Recurse
      result = this.next(context);
    }

    return result;
  }

  peek(context?: LexerContext): IteratorResult<LexerToken, undefined> {
    const originalIndex = this.index;
    const result = this.next(context);
    this.index = originalIndex;

    return result;
  }

  save(): number {
    return this.index;
  }

  rollback(state: number): void {
    this.index = state;
  }

  return(value: undefined): IteratorResult<LexerToken, undefined> {
    return {
      done: true,
      value,
    };
  }

  throw(e: unknown): IteratorResult<LexerToken, undefined> {
    throw e;
  }

  [Symbol.iterator](): Generator<
    LexerToken,
    undefined,
    LexerContext | undefined
  > {
    return this;
  }
}

/**
 * Attempts to extract documentation title and description from string value.
 *
 * Empty string returns an empty object.
 *
 * String with only one line return that line as the title.
 *
 * String with at least two lines returns the first line as the title and the rest as the description.
 */
export function extractDocumentation(
  input?: string
): { title: string; description?: string } | undefined {
  if (input === undefined) {
    return undefined;
  }

  const lines = input.split('\n');
  const firstNonemptyLineIndex = lines.findIndex(line => line.trim() !== '');

  // No non-whitespace found
  if (firstNonemptyLineIndex === -1) {
    return undefined;
  }

  const title = lines[firstNonemptyLineIndex].trim();

  const descriptionStart =
    lines
      .slice(0, firstNonemptyLineIndex + 1)
      .reduce((acc, curr) => (acc += curr.length), 0) + firstNonemptyLineIndex;
  const description = input.slice(descriptionStart).trim();

  if (description !== '') {
    return {
      title,
      description,
    };
  } else {
    // description is only whitespace
    return {
      title,
    };
  }
}
