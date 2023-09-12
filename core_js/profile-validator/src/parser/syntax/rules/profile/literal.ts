import {
  ComlinkAssignmentNode,
  ComlinkListLiteralNode,
  ComlinkLiteralNode,
  ComlinkNoneLiteralNode,
  ComlinkObjectLiteralNode,
  ComlinkPrimitiveLiteralNode,
} from '../../../../ast';

import { LexerTokenKind } from '../../../lexer/token';
import { SyntaxRule, SyntaxRuleMutable } from '../../rule';
import {
  ASSIGNMENT_PATH_KEY,
  computeLocationSpan,
  documentedNode,
  expectTerminated,
  mapAssignmentPath,
  WithLocation,
} from '../common';

export const COMLINK_PRIMITIVE_LITERAL: SyntaxRule<
  WithLocation<ComlinkPrimitiveLiteralNode>
> = SyntaxRule.or(SyntaxRule.literal(), SyntaxRule.string()).map(
  (match): WithLocation<ComlinkPrimitiveLiteralNode> => {
    const value =
      match.data.kind === LexerTokenKind.LITERAL
        ? match.data.literal
        : match.data.string;

    return {
      kind: 'ComlinkPrimitiveLiteral',
      value,
      location: match.location,
    };
  }
);

const COMLINK_LITERAL_MUT = new SyntaxRuleMutable<
  WithLocation<ComlinkLiteralNode>
>();

export const COMLINK_OBJECT_LITERAL_ASSIGNMENT: SyntaxRule<
  WithLocation<ComlinkAssignmentNode>
> = documentedNode(
  SyntaxRule.followedBy(
    ASSIGNMENT_PATH_KEY,
    SyntaxRule.operator('=').forgetFollowedBy(
      expectTerminated(COMLINK_LITERAL_MUT, ',', '\n', '}')
    )
  ).map(([path, value]): WithLocation<ComlinkAssignmentNode> => {
    return {
      kind: 'ComlinkAssignment',
      key: mapAssignmentPath(path),
      value,
      location: computeLocationSpan(...path, value),
    };
  })
);

export const COMLINK_OBJECT_LITERAL: SyntaxRule<
  WithLocation<ComlinkObjectLiteralNode>
> = SyntaxRule.followedBy(
  SyntaxRule.separator('{'),
  SyntaxRule.optionalRepeat(COMLINK_OBJECT_LITERAL_ASSIGNMENT),
  SyntaxRule.separator('}')
).map(
  ([sepStart, maybeFields, sepEnd]): WithLocation<ComlinkObjectLiteralNode> => {
    return {
      kind: 'ComlinkObjectLiteral',
      fields: maybeFields ?? [],
      location: computeLocationSpan(sepStart, sepEnd),
    };
  }
);

export const COMLINK_LIST_LITERAL: SyntaxRule<
  WithLocation<ComlinkListLiteralNode>
> = SyntaxRule.followedBy(
  SyntaxRule.separator('['),
  SyntaxRule.optionalRepeat(
    expectTerminated(COMLINK_LITERAL_MUT, ',', '\n', ']')
  ),
  SyntaxRule.separator(']')
).map(
  ([sepStart, maybeItems, sepEnd]): WithLocation<ComlinkListLiteralNode> => {
    return {
      kind: 'ComlinkListLiteral',
      items: maybeItems ?? [],
      location: computeLocationSpan(sepStart, sepEnd),
    };
  }
);

export const COMLINK_NONE_LITERAL: SyntaxRule<
  WithLocation<ComlinkNoneLiteralNode>
> = SyntaxRule.identifier('None').map(
  (match): WithLocation<ComlinkNoneLiteralNode> => {
    return {
      kind: 'ComlinkNoneLiteral',
      location: match.location,
    };
  }
);

export const COMLINK_LITERAL = SyntaxRule.or(
  COMLINK_PRIMITIVE_LITERAL,
  COMLINK_NONE_LITERAL,
  COMLINK_OBJECT_LITERAL,
  COMLINK_LIST_LITERAL
);
COMLINK_LITERAL_MUT.rule = COMLINK_LITERAL;
