import fs from 'fs';

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

class ComlinkTranspiler implements MapAstVisitor<string> {
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
      `const outcome = ${call.operationName}(Object.assign({}, ${args}));`,
      body
    ].join('\n');

    if (call.condition !== undefined) {
      result = `${this.visit(call.condition)} ${ComlinkTranspiler.buildStatementBlock(result)}`;
    }
    if (call.iteration !== undefined) {
      result = `${this.visit(call.iteration)} ${ComlinkTranspiler.buildStatementBlock(result)}`;
    }

    return result;
  }

  visitPrimitiveLiteralNode(ape: PrimitiveLiteralNode): string {
    if (typeof ape.value === 'string') {
      return `'${ape.value}'`;
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
    return `(()=>{
      with (__variables) { return ${node.source ?? node.expression}; }
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
      (ass) => `__variables = Object.assign(__variables, ${this.visit(ass)});`
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
      'const body = response.bodyAuto();',
      ...hand.statements.map((st) => this.visit(st)),
      'break HTTP_RESPONSE;'
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

    return result;
  }

  visitHttpCallStatementNode(http: HttpCallStatementNode): string {
    const statements = [
      `const url = std.unstable.resolveRequestUrl('${http.url}', { parameters, security, serviceId: '${http.serviceId ?? 'default'}' });`, // TODO: url params, serviceId
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
      `HTTP_RESPONSE: ${ComlinkTranspiler.buildStatementBlock(responseHandlers.join('\n'))}`,
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
      'const __outcome = { result: undefined, error: undefined };',
      'let __variables = {};',
      // label so we can use break - see visitOutcomeStatementNode
      `FN_BODY: ${ComlinkTranspiler.buildStatementBlock(map.statements.map((st) => this.visit(st)).join('\n'))}`,
      'if (__outcome.error !== undefined) { throw new std.unstable.MapError(__outcome.error); } else { return __outcome.data; }'
    ].join('\n');
    return `function ${map.name}(input, parameters, security) ${ComlinkTranspiler.buildStatementBlock(body)}`;
  }

  visitOperationDefinitionNode(
    operation: OperationDefinitionNode
  ): string {
    const body = [
      'const __outcome = { data: undefined, error: undefined };',
      'let __variables = {};',
      // label so we can use break - see visitOutcomeStatementNode
      `FN_BODY: ${ComlinkTranspiler.buildStatementBlock(operation.statements.map((st) => this.visit(st)).join('\n'))}`,
      'return __outcome;' // TODO: or strip data if error is defined?
    ].join('\n');
    return `function ${operation.name}(args) ${ComlinkTranspiler.buildStatementBlock(body)}`;
  }

  visitOutcomeStatementNode(outcome: OutcomeStatementNode): string {    
    let result;
    if (outcome.isError) {
      result = `__outcome.error = ${this.visit(outcome.value)}`;
    } else {
      result = `__outcome.data = ${this.visit(outcome.value)}`;
    };

    if (outcome.terminateFlow) {
      result = `${result}\nbreak FN_BODY;`;
    }

    if (outcome.condition !== undefined) {
      result = `${this.visit(outcome.condition)} ${ComlinkTranspiler.buildStatementBlock(result)}`;
    }
    
    return result;
  }

  visitInlineCallNode(call: InlineCallNode): string {
    const body = 'if (outcome.error !== undefined) { throw new Error(`Unexpected inline call failure: ${outcome.error}`); } else { acc.push(outcome.data); }';
    return `(() => { const acc = []; ${this.visitCallHead(call, body)}; return acc; })()`;
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

function nope(): never {
  console.error(
    'Usage: comtrans --stdin|FILE'
  );
  process.exit(1);
}
function readStdin(): string {
  const value = fs.readFileSync(0).toString();

  if (value.trim() == '') {
    console.error('Invalid stdin input');

    return nope();
  }

  return value;
}
function readFile(path: string): string {
  if (path === undefined || path.trim() === '') {
    console.error('Invalid file input');

    return nope();
  }

  return fs.readFileSync(path).toString();
}
function readInput(): string {
  const arg = process.argv[2];
  switch (arg) {
    case undefined:
      return nope();

    case '--stdin':
    case '-':
      return readStdin();

    default:
      return readFile(arg);
  }
}
function main(): number {
  const input = readInput();
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
  console.log(formatted);

  return 0;
}
process.exit(main());
