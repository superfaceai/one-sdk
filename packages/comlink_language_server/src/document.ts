import {
  Diagnostic,
  DiagnosticSeverity,
  DocumentSymbol,
  DocumentUri,
  Range,
  SymbolKind,
  TextDocumentContentChangeEvent,
} from 'vscode-languageserver';
import { Position, TextDocument } from 'vscode-languageserver-textdocument';
import { ComlinkParser } from '@superfaceai/comlink';

import { MapDocument, ProfileDocument } from './documents';
import { Context, ctxWorkWithProgress } from './lib';
import { listProfileSymbols } from './symbols';

export class ComlinkDocument implements TextDocument {
  static PROFILE_EXTENSIONS = ['profile.ts'];
  static MAP_EXTENSIONS = ['map.js'];
  static PROFILE_LANGUAGE_ID = 'comlink-profile';
  static MAP_LANGUAGE_ID = 'comlink-map';

  static hasProfileExtension(path: string): boolean {
    return ComlinkDocument.PROFILE_EXTENSIONS.some(extension =>
      path.endsWith(`.${extension}`)
    );
  }

  static hasMapExtension(path: string): boolean {
    return ComlinkDocument.MAP_EXTENSIONS.some(extension =>
      path.endsWith(`.${extension}`)
    );
  }

  static create(
    uri: DocumentUri,
    languageId: string,
    version: number,
    content: string
  ): ComlinkDocument {
    if (languageId === 'typescript' || languageId === 'javascript') {
      if (ComlinkDocument.hasProfileExtension(uri)) {
        languageId = ComlinkDocument.PROFILE_LANGUAGE_ID
      } else if (ComlinkDocument.hasMapExtension(uri)) {
        languageId = ComlinkDocument.MAP_LANGUAGE_ID
      }
    }

    return new ComlinkDocument(
      TextDocument.create(uri, languageId, version, content)
    );
  }

  private parseCache?: ProfileDocument | MapDocument = undefined;
  private symbolCache?: DocumentSymbol[] = undefined;
  private diagnosticCache?: Diagnostic[];

  constructor(private textDocument: TextDocument) {}

  update(changes: TextDocumentContentChangeEvent[], version: number): this {
    this.textDocument = TextDocument.update(
      this.textDocument,
      changes,
      version
    );
    this.clearCache();

    return this;
  }

  get uri(): DocumentUri {
    return this.textDocument.uri;
  }

  get languageId(): string {
    return this.textDocument.languageId;
  }

  get version(): number {
    return this.textDocument.version;
  }

  get lineCount(): number {
    return this.textDocument.lineCount;
  }

  getText(range?: Range): string {
    return this.textDocument.getText(range);
  }

  positionAt(offset: number): Position {
    return this.textDocument.positionAt(offset);
  }

  offsetAt(position: Position): number {
    return this.textDocument.offsetAt(position);
  }

  rangeFromSpan(start: number, end: number): Range {
    return Range.create(this.positionAt(start), this.positionAt(end));
  }

  isCached(): boolean {
    return this.parseCache !== undefined;
  }

  clearCache(): void {
    this.parseCache = undefined;
    this.symbolCache = undefined;
    this.diagnosticCache = undefined;
  }

  getParsedDocument(
    parser: ComlinkParser,
    ctx: Context<unknown>
  ): ProfileDocument | MapDocument {
    if (this.parseCache !== undefined) {
      return this.parseCache;
    }

    const source = this.getText()

    let result: ProfileDocument | MapDocument
    switch (this.languageId) {
      case ComlinkDocument.PROFILE_LANGUAGE_ID: {
        ctx.work?.workDoneProgress.begin(
          'Parsing profile',
          0,
          undefined,
          false
        );
        const { profile, spans, diagnostics } = parser.parseProfile(source, this.uri)
        result = { kind: 'profile', profile, spans, diagnostics }
        ctx.work?.workDoneProgress.done();

        break
      }
      case ComlinkDocument.MAP_LANGUAGE_ID: {
        result = { kind: 'map' }
        break
      }
      default: {
        throw new Error(`unexpected language id: ${this.languageId}`);
      }
    }
    
    this.parseCache = result;
    return result;
  }

  getDiagnostics(
    parser: ComlinkParser,
    ctx: Context<Diagnostic[]>
  ): Diagnostic[] {
    if (this.diagnosticCache !== undefined) {
      return this.diagnosticCache;
    }

    const result: Diagnostic[] = [];
    const parsed = this.getParsedDocument(parser, ctx);
    ctx.log?.logDebug("parsed", parsed)
    if (parsed.kind == 'profile') {
      const diags = parsed.diagnostics

      for (const d of diags) {
        let severity: DiagnosticSeverity
        switch (d.severity) {
          case 'error':
            severity = DiagnosticSeverity.Error
            break
          case 'warning':
            severity = DiagnosticSeverity.Warning
            break
          default:
            severity = DiagnosticSeverity.Error
        }

        result.push(Diagnostic.create(
          this.rangeFromSpan(d.span[0], d.span[1]),
          d.message,
          severity,
          d.code
        ))
      }
    }

    this.diagnosticCache = result;
    return result;
  }

  getSymbols(
    parser: ComlinkParser,
    ctx: Context<DocumentSymbol[]>
  ): DocumentSymbol[] {
    if (this.symbolCache !== undefined) {
      return this.symbolCache;
    }

    const document = this.getParsedDocument(parser, ctx);

    let symbols: DocumentSymbol[] = [];
    if (document.kind === 'profile') {
      symbols = listProfileSymbols(this, document, ctx);
    }

    this.symbolCache = symbols;
    return this.symbolCache;
  }

  getNamespace(
    parser: ComlinkParser,
    ctx: Context<DocumentSymbol>
  ): string {
    const ctx2: Context<DocumentSymbol[]> = {
      ...ctx,
      work: ctxWorkWithProgress(ctx.work, undefined)
    }
    const symbols = this.getSymbols(parser, ctx2);

    const namespaceSymbol = symbols[0].children?.[0];
    if (
      namespaceSymbol === undefined ||
      namespaceSymbol.kind !== SymbolKind.Namespace
    ) {
      throw new Error('Unexpected document symbol structure');
    }

    return namespaceSymbol.name;
  }
}
