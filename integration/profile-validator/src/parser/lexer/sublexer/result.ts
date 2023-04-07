import { CharIndexSpan } from '../../../common/source';
import { ProtoError } from '../../error';
import { LexerTokenData, LexerTokenKind } from '../token';

/** The match is successful */
type ParseResultMatch<T extends LexerTokenData> = {
  readonly kind: 'match';
  readonly data: T;
  readonly relativeSpan: CharIndexSpan;
};
/** The match cannot happen here, further rules should be attempted */
type ParseResultNomatch = {
  readonly kind: 'nomatch';
  /** Kind of the token that cannot be parsed. */
  readonly tokenKind: LexerTokenKind;
};
/** The match would happen here but there was an error in the input */
type ParseResultError<E extends ProtoError> = {
  readonly kind: 'error';
  /** Kind of the token that would be parsed. */
  readonly tokenKind: LexerTokenKind;
  readonly errors: E[];
};

export type ParseResult<
  T extends LexerTokenData,
  E extends ProtoError = ProtoError
> = ParseResultMatch<T> | ParseResultNomatch | ParseResultError<E>;
