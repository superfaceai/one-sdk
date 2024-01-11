import { DocumentSymbol, SymbolInformation } from 'vscode-languageserver-types';

import { ComlinkDocument } from './document';
import { ComlinkDocuments } from './documents';
import { Context, ctxWorkWithProgress, recursiveWalk, WalkEntry } from './lib';
import { ComlinkParser } from './parser';

/**
 * Walks over the provided folders and ensures that all documents are loaded in the manager.
 */
export async function loadWorkspaceDocuments(
  folders: string[],
  manager: ComlinkDocuments,
  ctx: Context<unknown>
): Promise<void> {
  const entryCallback = async (entry: WalkEntry) => {
    if (!entry.isFile) {
      return;
    }
    const rejected = !ComlinkDocument.hasProfileExtension(entry.path) && !ComlinkDocument.hasMapExtension(entry.path)
    
    ctx.log?.logDebug?.(`Considering document ${entry.path}: ${!rejected}`)
    if (!rejected) {
      await manager.loadDocument(`file://${entry.path}`);
    }
  };

  // TODO: Can be cancellable - throw custom exception in the callback and catch it here
  ctx.work?.workDoneProgress.begin(
    'Walking workspace dirs...',
    0,
    undefined,
    false
  );
  await Promise.all(
    folders.map(folder => recursiveWalk(folder, entryCallback))
  );
  ctx.work?.workDoneProgress.done();
}

function unpackDocumentSymbol(
  document: ComlinkDocument,
  symbol: DocumentSymbol,
  parent?: DocumentSymbol
): SymbolInformation[] {
  const baseSymbol = SymbolInformation.create(
    symbol.name,
    symbol.kind,
    symbol.range,
    document.uri,
    parent?.name
  );

  const childSymbols =
    symbol.children?.flatMap(childSymbol =>
      unpackDocumentSymbol(document, childSymbol, symbol)
    ) ?? [];

  return [baseSymbol, ...childSymbols];
}

export function listWorkspaceSymbols(
  parser: ComlinkParser,
  manager: ComlinkDocuments,
  ctx: Context<SymbolInformation[]>
): SymbolInformation[] {
  const ctx2: Context<DocumentSymbol[]> = {
    ...ctx,
    work: ctxWorkWithProgress(ctx.work, undefined)
  }

  const symbols = manager.all().flatMap(document => {
    const symbols = document.getSymbols(parser, ctx2);
      return symbols.flatMap(symbol =>
        unpackDocumentSymbol(document, symbol)
      );
  });

  return symbols;
}
