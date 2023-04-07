import {
  DocumentedNode,
  LocationSpan,
  ProfileASTNodeBase,
} from '../../../ast';

import { LexerTokenStream } from '../../lexer';
import {
  IdentifierTokenData,
  LexerTokenKind,
  NewlineTokenData,
  OperatorTokenData,
  SeparatorTokenData,
  StringTokenData,
  TerminationTokens,
} from '../../lexer/token';
import {
  LexerTokenMatch,
  RuleFmtOptions,
  RuleResult,
  SyntaxRule,
} from '../rule';
import { extractDocumentation } from '../util';

// HELPER RULES //

export type ASTNodeBase = ProfileASTNodeBase;

export type HasLocation = { location: LocationSpan };
export type WithLocation<N> = N extends { location?: LocationSpan }
  ? { [k in keyof N]: WithLocation<N[k]> } & HasLocation
  : { [k in keyof N]: WithLocation<N[k]> };

export type CommonTerminatorToken = ';' | ',' | '\n';

type ArrayFirstOrLastNonNull<A extends readonly (E | undefined)[], E> =
  // If the first element is non-null the it is a success
  // This asks if the first element of A is plain E (without nullability) (unless E is nullable as a type, in which case the caller messed up)
  A extends [E, ...(E | undefined)[]]
    ? true
    : // same for last element
    A extends [...(E | undefined)[], E]
    ? true
    : false;
/** Decides whether a tuple/array _definitely_ has a non-null element */
type ArrayHasNonNull<
  A extends readonly (E | undefined)[],
  E
> = ArrayFirstOrLastNonNull<A, E> extends true
  ? true
  : // Here we use the `infer R` feature to effectivelly slice off the first element
  // It doesn't pass if the array is empty, which is what we want.
  // This is the slicing magic.
  A extends [E | undefined, ...infer R]
  ? // Typescript doesn't believe us that R has the correct type (it thinks it is unknown[], maybe a bug?), so we force it using this condition
    R extends readonly (E | undefined)[]
    ? ArrayHasNonNull<R, E>
    : never // it should never happen that the `never` branch is taken
  : // Have to do the same thing symetrically from the end in case the non-null element is somewhere after the rest paratemer
  A extends [...infer R, E | undefined]
  ? R extends readonly (E | undefined)[]
    ? ArrayHasNonNull<R, E>
    : never
  : false;

// const a: ArrayHasNonNull<[...undefined[], number, number | undefined], number> = true
// const b: ArrayHasNonNull<[number | undefined, number | undefined, ...undefined[], number, number | undefined], number> = true

export function computeLocationSpan<A extends (HasLocation | undefined)[]>(
  ...nodes: A
): ArrayHasNonNull<A, HasLocation> extends true
  ? LocationSpan
  : LocationSpan | undefined;
export function computeLocationSpan<A extends (HasLocation | undefined)[]>(
  ...nodes: A
): LocationSpan | undefined {
  const first = nodes.find(node => node !== undefined)?.location;
  const last = nodes.reverse().find(node => node !== undefined)?.location;

  if (first === undefined || last === undefined) {
    return undefined;
  }

  return {
    start: {
      line: first.start.line,
      column: first.start.column,
      charIndex: first.start.charIndex,
    },
    end: {
      line: last.end.line,
      column: last.end.column,
      charIndex: last.end.charIndex,
    },
  };
}

export function documentedNode<N extends DocumentedNode>(
  rule: SyntaxRule<N>
): SyntaxRule<N> {
  return SyntaxRule.followedBy(
    SyntaxRule.optional(SyntaxRule.string()),
    rule
  ).map(([maybeDoc, result]): N => {
    const doc = extractDocumentation(maybeDoc?.data.string);

    if (maybeDoc !== undefined && doc !== undefined) {
      result.documentation = {
        title: doc.title,
        description: doc.description,
        location: maybeDoc.location,
      };
    }

    return result;
  });
}

/**
 * Maps token match array into a string array of the assignment keys.
 */
export function mapAssignmentPath(
  path: (
    | LexerTokenMatch<IdentifierTokenData>
    | LexerTokenMatch<StringTokenData>
  )[]
): string[] {
  if (path.length === 0) {
    throw new Error(
      'Expected at least one element in the assignment path. This in an error in the rule definition.'
    );
  }

  return path.map(p => {
    if (p.data.kind === LexerTokenKind.STRING) {
      return p.data.string;
    } else {
      return p.data.identifier;
    }
  });
}

const ASSIGNMENT_KEY = SyntaxRule.identifier().or(SyntaxRule.string());
export const ASSIGNMENT_PATH_KEY = SyntaxRule.followedBy(
  ASSIGNMENT_KEY,
  SyntaxRule.optionalRepeat(
    SyntaxRule.followedBy(SyntaxRule.operator('.'), ASSIGNMENT_KEY)
  )
).map(
  ([first, maybeRest]): (
    | LexerTokenMatch<IdentifierTokenData>
    | LexerTokenMatch<StringTokenData>
  )[] => {
    const result = [first];
    if (maybeRest !== undefined) {
      maybeRest.forEach(([_op, key]) => result.push(key));
    }

    return result;
  }
);

// TERMINATORS //

type TerminatorTokenRule = SyntaxRule<
  | LexerTokenMatch<SeparatorTokenData>
  | LexerTokenMatch<OperatorTokenData>
  | LexerTokenMatch<NewlineTokenData>
>;
const TERMINATOR_TOKENS: Record<TerminationTokens, TerminatorTokenRule> = {
  ')': SyntaxRule.separator(')'),
  ']': SyntaxRule.separator(']'),
  '}': SyntaxRule.separator('}'),
  ',': SyntaxRule.operator(','),
  ';': SyntaxRule.operator(';'),
  '\n': SyntaxRule.newline(),
};
export function TERMINATOR_TOKEN_FACTORY(
  ...terminators: TerminationTokens[]
): TerminatorTokenRule {
  const rules = terminators.map(ter => TERMINATOR_TOKENS[ter]);

  return SyntaxRule.or(...rules);
}

/** Utility rule builder which expects the rule to be terminated and the optionally skips `,` or `;` */
export function expectTerminated<T>(
  rule: SyntaxRule<T>,
  ...terminators: TerminationTokens[]
): SyntaxRule<T> {
  return rule
    .lookahead(TERMINATOR_TOKEN_FACTORY(...terminators))
    .skip(
      SyntaxRule.optional(
        TERMINATOR_TOKEN_FACTORY(
          ...terminators.filter(ter => ter === ',' || ter === ';')
        )
      )
    );
}

// CHECKSUM //
export class SyntaxRuleSourceChecksum extends SyntaxRule<string> {
  tryMatch(tokens: LexerTokenStream<unknown>): RuleResult<string> {
    return {
      kind: 'match',
      match: tokens.source.checksum(),
    };
  }

  toStringFmt(_options: RuleFmtOptions): string {
    return '<CHECKSUM>';
  }
}
