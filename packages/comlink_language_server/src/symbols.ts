import { DocumentSymbol, SymbolKind } from 'vscode-languageserver-types';

import { ComlinkDocument } from './document';
import { Context, fileNameFromUri } from './lib';
import { ProfileDocument } from './documents';

function formatNamespace(
  scope: string | undefined,
  name: string
): string {
  let namespace = `${name}`;
  if (scope !== undefined) {
    namespace = `${scope}/${namespace}`;
  }

  return namespace;
}

export function listProfileSymbols(
  document: ComlinkDocument,
  doc: ProfileDocument,
  ctx?: Context<DocumentSymbol[]>
): DocumentSymbol[] {
  ctx?.work?.workDoneProgress.begin('Gathering profile symbols');

  const namespaceSymbols: DocumentSymbol[] = [];
  for (let i = 0; i < doc.profile.usecases.length; i += 1) {
    const usecase = doc.profile.usecases[i]
    const spans = doc.spans.usecases[i]

    namespaceSymbols.push(DocumentSymbol.create(
      usecase.name,
      usecase.documentation?.title,
      SymbolKind.Interface,
      document.rangeFromSpan(spans.entire[0], spans.entire[1]),
      document.rangeFromSpan(spans.name[0], spans.name[1]),
      []
    ))
  }

  const fileRange = document.rangeFromSpan(doc.spans.entire[0], doc.spans.entire[1]);

  const namespaceSymbol = DocumentSymbol.create(
    formatNamespace(
      doc.profile.scope,
      doc.profile.name
    ),
    undefined,
    SymbolKind.Namespace,
    fileRange,
    fileRange,
    namespaceSymbols
  );

  const fileSymbol = DocumentSymbol.create(
    fileNameFromUri(document.uri),
    undefined,
    SymbolKind.File,
    fileRange,
    fileRange,
    [namespaceSymbol]
  );
  ctx?.work?.workDoneProgress.done();

  return [fileSymbol];
}
