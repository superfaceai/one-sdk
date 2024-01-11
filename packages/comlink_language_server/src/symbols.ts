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
  profile: ProfileDocument['profile'],
  ctx?: Context<DocumentSymbol[]>
): DocumentSymbol[] {
  ctx?.work?.workDoneProgress.begin('Gathering profile symbols');

  const namespaceSymbols: DocumentSymbol[] = [];
  // for (const definition of profile.definitions) {
  //   // TODO: improve (selection) ranges
  //   const definitionRange = document.rangeFromSpan(
  //     definition.location.start.charIndex,
  //     definition.location.end.charIndex
  //   );

  //   switch (definition.kind) {
  //     case 'UseCaseDefinition':
  //       {
  //         const usecaseSymbol = DocumentSymbol.create(
  //           definition.useCaseName,
  //           definition.documentation?.title,
  //           SymbolKind.Interface,
  //           definitionRange,
  //           definitionRange,
  //           []
  //         );
  //         namespaceSymbols.push(usecaseSymbol);
  //       }
  //       break;

  //     case 'NamedModelDefinition':
  //       {
  //         const modelSymbol = DocumentSymbol.create(
  //           definition.modelName,
  //           definition.documentation?.title,
  //           SymbolKind.Interface,
  //           definitionRange,
  //           definitionRange,
  //           []
  //         );
  //         namespaceSymbols.push(modelSymbol);
  //       }
  //       break;

  //     case 'NamedFieldDefinition':
  //       {
  //         const fieldSymbol = DocumentSymbol.create(
  //           definition.fieldName,
  //           definition.documentation?.title,
  //           SymbolKind.Field,
  //           definitionRange,
  //           definitionRange,
  //           []
  //         );
  //         namespaceSymbols.push(fieldSymbol);
  //       }
  //       break;
  //   }
  // }

  const fileSpan = { // TODO
    start: 0,
    end: 1,
  };

  const namespaceSymbol = DocumentSymbol.create(
    formatNamespace(
      profile.scope,
      profile.name
    ),
    undefined,
    SymbolKind.Namespace,
    document.rangeFromSpan(
      fileSpan.start, // TODO
      fileSpan.end
    ),
    document.rangeFromSpan(
      fileSpan.start, // TODO
      fileSpan.end
    ),
    namespaceSymbols
  );

  const fileSymbol = DocumentSymbol.create(
    fileNameFromUri(document.uri),
    undefined,
    SymbolKind.File,
    document.rangeFromSpan(fileSpan.start, fileSpan.end),
    document.rangeFromSpan(fileSpan.start, fileSpan.end),
    [namespaceSymbol]
  );
  ctx?.work?.workDoneProgress.done();

  return [fileSymbol];
}
