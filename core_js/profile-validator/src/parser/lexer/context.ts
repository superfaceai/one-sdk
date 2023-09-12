import { ParseResult } from './sublexer/result';
import {
  DefaultSublexerTokenData
} from './token';

export const enum LexerContextType {
  /**
   * Default lexer context for parsing the profile and map languages.
   */
  DEFAULT
}
export type Sublexer<C extends LexerContextType> = (
  slice: string,
  ...context: SublexerParamsType<C>
) => ParseResult<SublexerReturnType<C>>;

export type SublexerParamsType<C extends LexerContextType> =
  C extends LexerContextType.DEFAULT
    ? []
    : never;
export type SublexerReturnType<C extends LexerContextType> =
  C extends LexerContextType.DEFAULT
    ? DefaultSublexerTokenData
    : never;

type LexerDefaultContext = { type: LexerContextType.DEFAULT };
export type LexerContext = LexerDefaultContext;
