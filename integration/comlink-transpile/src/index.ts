import * as prettier from 'prettier';

import { parseMap, Source } from '@superfaceai/parser';
import {
  AssignmentNode,
  CallStatementNode,
  ConditionAtomNode,
  HttpCallStatementNode,
  HttpRequestNode,
  HttpResponseHandlerNode,
  InlineCallNode,
  IterationAtomNode,
  JessieExpressionNode,
  MapASTNode,
  MapAstVisitor,
  MapDefinitionNode,
  MapDocumentNode,
  MapHeaderNode,
  ObjectLiteralNode,
  OperationDefinitionNode,
  OutcomeStatementNode,
  PrimitiveLiteralNode,
  SetStatementNode,
} from '@superfaceai/ast';

export class ComlinkTranspiler implements MapAstVisitor<string> {
  private static VAR_VARIABLES = 'vars';
  private static VAR_OUTCOME = '__outcome';
  private static LABEL_FNBODY = 'FN_BODY';
  private static LABEL_HTTP = 'HTTP_RESPONSE';
  
  constructor() {}

  private static buildObject(key: string[], value: string): string {
    if (key.length === 0) {
      return value;
    }

    return `{ '${key[0]}': ${ComlinkTranspiler.buildObject(key.slice(1), value)} }`
  }

  private static buildStatementBlock(body: string): string {
    return `{\n${body}\n}`;
  }

  visit(node: MapASTNode): string {
    switch (node.kind) {
      case 'MapDocument':
        return this.visitMapDocumentNode(node);
      case 'MapHeader':
        return this.visitMapHeaderNode(node);
      case 'MapDefinition':
        return this.visitMapDefinitionNode(node);
      case 'OperationDefinition':
        return this.visitOperationDefinitionNode(node);

      case 'SetStatement':
        return this.visitSetStatementNode(node);
      case 'CallStatement':
        return this.visitCallStatementNode(node);
      case 'HttpCallStatement':
        return this.visitHttpCallStatementNode(node);
      case 'OutcomeStatement':
        return this.visitOutcomeStatementNode(node);

      case 'Assignment':
        return this.visitAssignmentNode(node);
      case 'ConditionAtom':
        return this.visitConditionAtomNode(node);
      case 'IterationAtom':
        return this.visitIterationAtomNode(node);
      case 'HttpResponseHandler':
        return this.visitHttpResponseHandlerNode(node);
      case 'InlineCall':
        return this.visitInlineCallNode(node);

      case 'PrimitiveLiteral':
        return this.visitPrimitiveLiteralNode(node);
      case 'ObjectLiteral':
        return this.visitObjectLiteralNode(node);
      case 'JessieExpression':
        return this.visitJessieExpressionNode(node);

      default:
        throw new Error('MapUnparser: unreachable node kind ' + node.kind);
    }
  }

  private visitCallHead(
    call: {
      operationName: string;
      condition?: ConditionAtomNode;
      iteration?: IterationAtomNode;
      arguments: AssignmentNode[];
    },
    body: string
  ): string {
    const args = call.arguments.map((arg) => this.visit(arg)).join(',');

    let result = [
      `const outcome = ${call.operationName}(Object.assign({}, ${args}), parameters, security);`,
      body
    ].join('\n');

    if (call.condition !== undefined) {
      result = `${this.visit(call.condition)} ${ComlinkTranspiler.buildStatementBlock(result)}`;
    }
    if (call.iteration !== undefined) {
      result = `${this.visit(call.iteration)} ${ComlinkTranspiler.buildStatementBlock(result)}`;
    }

    return ComlinkTranspiler.buildStatementBlock(result);
  }

  visitPrimitiveLiteralNode(ape: PrimitiveLiteralNode): string {
    if (typeof ape.value === 'string') {
      // use json to escape the string correctly
      return JSON.stringify(ape.value);
    } else {
      return ape.value.toString();
    }
  }

  visitObjectLiteralNode(object: ObjectLiteralNode): string {
    const partials = object.fields.map((ass) => this.visit(ass)).join(',');
    return `Object.assign({}, ${partials})`;
  }

  visitJessieExpressionNode(node: JessieExpressionNode): string {
    // TODO: can we do this without `with`?
    // replace trailing commas and semicolons
    const expression = (node.source ?? node.expression).replace(/[,;]+$/, '');
    return `(()=>{
      with (${ComlinkTranspiler.VAR_VARIABLES}) { return ${expression}; }
    })()`;
  }

  visitAssignmentNode(ass: AssignmentNode): string {
    return ComlinkTranspiler.buildObject(ass.key, this.visit(ass.value));
  }

  visitConditionAtomNode(ana: ConditionAtomNode): string {
    return `if (${this.visit(ana.expression)})`;
  }

  visitIterationAtomNode(iter: IterationAtomNode): string {
    return `for (const ${iter.iterationVariable} of ${this.visit(iter.iterable)})`;
  }

  visitSetStatementNode(set: SetStatementNode): string {
    return set.assignments.map(
      (ass) => `${ComlinkTranspiler.VAR_VARIABLES} = Object.assign(${ComlinkTranspiler.VAR_VARIABLES}, ${this.visit(ass)});`
    ).join('\n');
  }

  visitCallStatementNode(call: CallStatementNode): string {
    const body = call.statements.map((st) => this.visit(st)).join('\n');

    return this.visitCallHead(call, body);
  }

  visitHttpRequestNode(_req: HttpRequestNode): string {
    throw new Error('unimplemented')
  }

  visitHttpResponseHandlerNode(
    hand: HttpResponseHandlerNode
  ): string {
    let result = [
      'const statusCode = response.status;',
      'const headers = response.headers;',
      'const body = response.bodyAuto();',
      ...hand.statements.map((st) => this.visit(st)),
      `/* end handler */ break ${ComlinkTranspiler.LABEL_HTTP};`
    ].join('\n');
    
    const conditions = [];
    if (hand.statusCode !== undefined) {
      conditions.push(`response.status === ${hand.statusCode}`);
    }
    if (hand.contentType !== undefined) {
      conditions.push(`response.headers['content-type']?.some((ct) => ct.indexOf('${hand.contentType}') >= 0)`);
    }
    if (hand.contentLanguage !== undefined) {
      conditions.push(`response.headers['content-language']?.some((cl) => cl.indexOf('${hand.contentLanguage}') >= 0)`);
    }

    if (conditions.length > 0) {
      result = `if (${conditions.join(' && ')}) ${ComlinkTranspiler.buildStatementBlock(result)}`;
    }
    result = `/* response ${hand.statusCode ?? '*'} "${hand.contentType ?? '*'}" "${hand.contentLanguage ?? '*'}" */\n${result}`;

    return result;
  }

  private static urlParamsToStringTemplate(url: string): string {
    // rwerite url params:
    // keys starting with `input`, `args` or `parameters` are kept as-is
    // otherwise they are prefixed with `vars.`
    
    const regex = RegExp('{([^}]*)}', 'g');

    let result = '';
    let lastIndex = 0;
    for (const match of url.matchAll(regex)) {
      const start = match.index;
      // Why can this be undefined?
      if (start === undefined) {
        throw new Error(
          'Invalid regex match state - missing start index'
        );
      }

      const end = start + match[0].length;
      const key = match[1].trim().split('.');
      if (['args', 'input', 'parameters'].indexOf(key[0]) < 0) {
        key.unshift(ComlinkTranspiler.VAR_VARIABLES);
      }

      result += url.slice(lastIndex, start);
      result += '${' + key.join('.') + '}';
      lastIndex = end;
    }
    result += url.slice(lastIndex);

    return result;
  }
  visitHttpCallStatementNode(http: HttpCallStatementNode): string {
    const urlTemplate = ComlinkTranspiler.urlParamsToStringTemplate(http.url);
    const statements = [
      `const url = std.unstable.resolveRequestUrl(\`${urlTemplate}\`, { parameters, security, serviceId: '${http.serviceId ?? 'default'}' });`, // TODO: url params
      `const requestOptions = { method: '${http.method}', headers: {}, query: {}, body: undefined };`
    ];
    if (http.request !== undefined) {
      const req = http.request;
      if (req.headers !== undefined) {
        statements.push(`requestOptions.headers = ${this.visit(req.headers)}`);
      }
      if (req.contentType !== undefined) {
        statements.push(`requestOptions.headers['content-type'] = ['${req.contentType}']`);
      }
      if (req.contentLanguage !== undefined) {
        statements.push(`requestOptions.headers['content-language'] = ['${req.contentLanguage}']`);
      }
      if (req.query !== undefined) {
        statements.push(`requestOptions.query = ${this.visit(req.query)}`);
      }
      if (req.body !== undefined) {
        statements.push(`requestOptions.body = ${this.visit(req.body)}`);
      }
      // TODO: security
    }
    statements.push('const response = std.unstable.fetch(url, requestOptions).response();');

    const responseHandlers = [
      ...http.responseHandlers.map((rh) => this.visit(rh)),
      `throw new Error('Unexpected response');`
    ];
    statements.push(
      `${ComlinkTranspiler.LABEL_HTTP}: ${ComlinkTranspiler.buildStatementBlock(responseHandlers.join('\n'))}`,
    );
    
    return `${ComlinkTranspiler.buildStatementBlock(statements.join('\n'))}`;
  }

  visitMapHeaderNode(_header: MapHeaderNode): string {
    return '// TODO: MapHeaderNode';
    // const profile =
    //   ProfileId.fromParameters({
    //     scope: header.profile.scope,
    //     name: header.profile.name,
    //   }).withoutVersion +
    //   '@' +
    //   VersionRange.fromParameters({
    //     major: header.profile.version.major,
    //     minor: header.profile.version.minor,
    //   }).toString();

    // const result = [
    //   ...Tok.withSpaces('profile', '=', `"${profile}"`),
    //   Tok.newline(),
    //   ...Tok.withSpaces('provider', '=', `"${header.provider}"`),
    //   Tok.newline(),
    // ];
    // if (header.variant !== undefined) {
    //   result.push(
    //     ...Tok.withSpaces('variant', '=', `"${header.variant}"`),
    //     Tok.newline()
    //   );
    // }

    // return result;
  }

  visitMapDefinitionNode(map: MapDefinitionNode): string {
    const body = [
      `const ${ComlinkTranspiler.VAR_OUTCOME} = { result: undefined, error: undefined };`,
      `let ${ComlinkTranspiler.VAR_VARIABLES} = {};`,
      // label so we can use break - see visitOutcomeStatementNode
      `${ComlinkTranspiler.LABEL_FNBODY}: ${ComlinkTranspiler.buildStatementBlock(map.statements.map((st) => this.visit(st)).join('\n'))}`,
      `if (${ComlinkTranspiler.VAR_OUTCOME}.error !== undefined) { throw new std.unstable.MapError(${ComlinkTranspiler.VAR_OUTCOME}.error); } else { return ${ComlinkTranspiler.VAR_OUTCOME}.data; }`
    ].join('\n');
    return `function ${map.name}(input, parameters, security) ${ComlinkTranspiler.buildStatementBlock(body)}`;
  }

  visitOperationDefinitionNode(
    operation: OperationDefinitionNode
  ): string {
    const body = [
      `const ${ComlinkTranspiler.VAR_OUTCOME} = { data: undefined, error: undefined };`,
      `let ${ComlinkTranspiler.VAR_VARIABLES} = {};`,
      // label so we can use break - see visitOutcomeStatementNode
      `${ComlinkTranspiler.LABEL_FNBODY}: ${ComlinkTranspiler.buildStatementBlock(operation.statements.map((st) => this.visit(st)).join('\n'))}`,
      `return ${ComlinkTranspiler.VAR_OUTCOME};` // TODO: or strip data if error is defined?
    ].join('\n');
    return `function ${operation.name}(args, parameters, security) ${ComlinkTranspiler.buildStatementBlock(body)}`;
  }

  visitOutcomeStatementNode(outcome: OutcomeStatementNode): string {    
    let result;
    if (outcome.isError) {
      result = `${ComlinkTranspiler.VAR_OUTCOME}.error = ${this.visit(outcome.value)}`;
    } else {
      result = `${ComlinkTranspiler.VAR_OUTCOME}.data = ${this.visit(outcome.value)}`;
    };

    if (outcome.terminateFlow) {
      result = `${result}\n/* return */ break ${ComlinkTranspiler.LABEL_FNBODY};`;
    }

    if (outcome.condition !== undefined) {
      result = `${this.visit(outcome.condition)} ${ComlinkTranspiler.buildStatementBlock(result)}`;
    }
    
    return result;
  }

  visitInlineCallNode(call: InlineCallNode): string {
    const body = 'if (outcome.error !== undefined) { throw new Error(`Unexpected inline call failure: ${outcome.error}`); } else { acc.push(outcome.data); }';
    let returnAction = 'return acc[0]';
    if (call.iteration !== undefined) {
      returnAction = 'return acc'
    }

    return `(() => { const acc = []; ${this.visitCallHead(call, body)}; ${returnAction}; })()`;
  }

  visitMapDocumentNode(document: MapDocumentNode): string {
    const startFnCases = document.definitions.filter((def) => def.kind === 'MapDefinition').map(
      (def) => `case '${def.name}': mapFn = ${def.name}; break;`
    ).join('\n');
    const startFn = `
    function _start(usecaseName) {
      let mapFn = undefined;

      switch (usecaseName) {
        ${startFnCases}
        
        default:
          throw new Error('Unknown usecase name');
      }

      const { input, parameters, security } = std.unstable.takeInput();
      std.ffi.unstable.printDebug('Running with input:', input, 'parameters:', parameters, 'security:', security);
      
      try {
        const result = mapFn(input, parameters, security);
        std.unstable.setOutputSuccess(result);
      } catch (e) {
        if (e instanceof std.unstable.MapError) {
          std.unstable.setOutputFailure(e.output);
        } else {
          throw e;
        }
      }
    }
    `;

    return [
      this.visit(document.header),
      startFn,
      ...document.definitions.map((def) => this.visit(def))
    ].join('\n');
  }
}

export function transpile(input: string): string {
  const map = parseMap(new Source(input));
  
  const transpiled = new ComlinkTranspiler().visit(map);
  const formatted = prettier.format(transpiled, {
    parser: 'babel',
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: true,
    quoteProps: 'as-needed',
    trailingComma: 'es5',
    bracketSpacing: true,
    arrowParens: 'avoid',
    endOfLine: 'lf'
  });

  return formatted;
}
