import {
  Connection,
  createConnection,
  DefinitionLink,
  DocumentSymbol,
  InitializeResult,
  ProposedFeatures,
  SymbolInformation,
  TextDocumentSyncKind
} from 'vscode-languageserver/node';
import { ComlinkParser } from '@superfaceai/comlink';

import { ComlinkDocument } from './document';
import { ComlinkDocuments } from './documents';
import { Logger, stripUriPrefix, WorkContext } from './lib';
import { listWorkspaceSymbols, loadWorkspaceDocuments } from './workspace';

/**
 * Entry point class to the server.
 *
 * Contains initialization and utility methods with common functionality.
 */
class ServerContext {
  static SERVER_INFO = {
    name: 'Comlink Language Server',
  };

  /** LSP connection on which we listen */
  readonly connection: Connection;
  /** Manager for open text documents */
  readonly documents: ComlinkDocuments;
  private parser: ComlinkParser | undefined

  private readonly logger: Logger
  

  /** Global promise that is queued here from sync context and awaited from async context later. */
  private globalPromise: Promise<void> | undefined;

  constructor() {
    this.connection = createConnection(ProposedFeatures.all);
    this.documents = new ComlinkDocuments();
    this.globalPromise = ComlinkParser.create().then(
      p => { this.parser = p; }
    )

    this.logger = new Logger('off', this.connection.console)

    this.bindEventsConnection();
    this.bindEventsDocuments();
  }

  // INITIALIZATION //

  private bindEventsConnection() {
    this.connection.onInitialize(async event => {
      this.logger.logTrace('onInitialize:', event);

      const result: InitializeResult = {
        capabilities: {
          // Document syncing is handled by the TextDocuments handler anyway
          textDocumentSync: {
            openClose: true,
            change: TextDocumentSyncKind.Incremental,
            willSave: true,
            willSaveWaitUntil: true,
            save: {
              includeText: false,
            },
          },
          documentSymbolProvider: true,
          workspaceSymbolProvider: true,
          workspace: {
            workspaceFolders: {
              supported: true,
            },
          },
          // definitionProvider: true
        },
        serverInfo: ServerContext.SERVER_INFO,
      };

      switch (event.trace) {
        case 'off':
          this.logger.level = 'off'
          break
        case 'compact':
          this.logger.level = 'info'
          break
        case 'messages':
          this.logger.level = 'debug'
          break
        case 'verbose':
          this.logger.level = 'trace'
          break
      }

      await this.awaitGlobalPromise()

      let folders = event.workspaceFolders
      if (!folders) {
        folders = await this.connection.workspace.getWorkspaceFolders()
      }
      const uris = (folders ?? []).map(f => stripUriPrefix(f.uri));
      await loadWorkspaceDocuments(uris, this.documents, { log: this.logger });

      return result;
    });

    this.connection.onDocumentSymbol(
      async (event, cancellationToken, workDoneProgress, resultProgress) => {
        this.logger.logTrace(`onDocumentSymbol(${event.textDocument.uri})`);

        const work: WorkContext<DocumentSymbol[]> = {
          cancellationToken,
          workDoneProgress,
          resultProgress,
        };
        const document = await this.documents.loadDocument(
          event.textDocument.uri
        );

        if (!document.isCached()) {
          this.queueGlobalPromise(this.diagnoseDocument(document));
        }

        return document.getSymbols(this.parser!, { work, log: this.logger });
      }
    );

    this.connection.onWorkspaceSymbol(
      async (event, cancellationToken, workDoneProgress, resultProgress) => {
        this.logger.logTrace(`onWorkspaceSymbol(${event.query})`);

        await this.awaitGlobalPromise();

        const work: WorkContext<SymbolInformation[]> = {
          cancellationToken,
          workDoneProgress,
          resultProgress,
        };
        const symbols = listWorkspaceSymbols(this.parser!, this.documents, { work, log: this.logger });

        return symbols;
      }
    );

    this.connection.onDefinition(
      async (event, cancellationToken, workDoneProgress, resultProgress) => {
        this.logger.logTrace(`onDefinition(${event.textDocument.uri})`);

        const workContext: WorkContext<DefinitionLink[]> = {
          cancellationToken,
          workDoneProgress,
          resultProgress,
        };
        void workContext;

        await this.awaitGlobalPromise();

        return null; // TODO
      }
    );
  }

  private bindEventsDocuments() {
    this.connection.onDidOpenTextDocument(event => {
      this.logger.logTrace(`onDidOpenTextDocument(${event.textDocument.uri})`);

      const document = this.documents.create(
        event.textDocument.uri,
        event.textDocument.languageId,
        event.textDocument.version,
        event.textDocument.text
      );

      this.queueGlobalPromise(
        this.diagnoseDocument(document)
      );
    });

    this.connection.onDidChangeTextDocument(event => {
      this.logger.logTrace(`onDidChangeTextDocument(${event.textDocument.uri})`);

      if (event.contentChanges.length === 0) {
        return;
      }

      const document = this.documents.update(
        event.textDocument.uri,
        event.contentChanges,
        event.textDocument.version
      );

      this.queueGlobalPromise(this.diagnoseDocument(document))
    });

    this.connection.onDidCloseTextDocument(event => {
      this.logger.logTrace(`onDidCloseTextDocument(${event.textDocument.uri})`);

      this.documents.remove(event.textDocument.uri);
    });
  }

  /**
   * Begins listening on the connection.
   */
  listen() {
    this.connection.listen();
  }

  // LOGIC //

  private queueGlobalPromise(promise: Promise<any>) {
    if (this.globalPromise === undefined) {
      this.globalPromise = promise.then(_ => undefined);
    } else {
      this.globalPromise = Promise.all([this.globalPromise, promise]).then(
        _ => undefined
      );
    }
  }
  private async awaitGlobalPromise() {
    if (this.globalPromise !== undefined) {
      await this.globalPromise;
      this.globalPromise = undefined;
    }
  }

  private async diagnoseDocument(document: ComlinkDocument): Promise<void> {
    await this.awaitGlobalPromise();

    const diagnostics = document.getDiagnostics(this.parser!, {
      log: this.logger,
    });
    this.logger.logDebug('Sending diagnostics:', diagnostics);
    await this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
  }
}

const ctx = new ServerContext();
ctx.listen();
