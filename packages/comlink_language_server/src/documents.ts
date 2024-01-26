import { promises as fsp } from 'node:fs';
import {
  DocumentUri,
  TextDocumentContentChangeEvent,
} from 'vscode-languageserver';

import { ComlinkDocument } from './document';
import { stripUriPrefix } from './lib';
import { Diagnostic, Profile, ProfileSpans } from '@superfaceai/comlink';

export type ProfileDocument = {
  kind: 'profile',
  profile: Profile,
  spans: ProfileSpans,
  diagnostics: Diagnostic[]
}
export type MapDocument = {
  kind: 'map'
}

export class ComlinkDocuments {
  private documents: Record<DocumentUri, ComlinkDocument>;

  constructor() {
    this.documents = {};
  }

  create(
    uri: DocumentUri,
    languageId: string,
    version: number,
    content: string
  ): ComlinkDocument {
    const document = ComlinkDocument.create(uri, languageId, version, content);
    this.documents[uri] = document;

    return document;
  }

  get(uri: DocumentUri): ComlinkDocument | undefined {
    return this.documents[uri];
  }

  update(
    uri: DocumentUri,
    changes: TextDocumentContentChangeEvent[],
    version: number
  ): ComlinkDocument {
    const document = this.get(uri);
    if (document === undefined) {
      throw new Error('Updated document does not exist');
    }

    this.documents[uri] = document.update(changes, version);

    return this.documents[uri];
  }

  remove(uri: DocumentUri): ComlinkDocument | undefined {
    const document = this.get(uri);
    if (document !== undefined) {
      delete this.documents[uri];
    }

    return document;
  }

  uris(): DocumentUri[] {
    return Object.keys(this.documents);
  }

  all(): ComlinkDocument[] {
    return Object.values(this.documents);
  }

  /**
   * Gets text document either from the manager or by loading it from the disk.
   */
  async loadDocument(uri: DocumentUri): Promise<ComlinkDocument> {
    const managed = this.get(uri);
    if (managed !== undefined) {
      return managed;
    }

    const content = await fsp.readFile(stripUriPrefix(uri), {
      encoding: 'utf-8',
    });

    let languageId = 'plaintext';
    if (ComlinkDocument.hasProfileExtension(uri)) {
      languageId = ComlinkDocument.PROFILE_LANGUAGE_ID;
    } else if (ComlinkDocument.hasMapExtension(uri)) {
      languageId = ComlinkDocument.MAP_LANGUAGE_ID;
    }

    return this.create(uri, languageId, 0, content);
  }
}
