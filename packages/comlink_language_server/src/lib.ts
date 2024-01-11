import util from 'node:util';
import { promises as fsp } from 'node:fs';
import { join as joinPath } from 'node:path';
import {
  CancellationToken,
  RemoteConsole,
  ResultProgressReporter,
  WorkDoneProgressReporter,
} from 'vscode-languageserver';
import { DocumentUri } from 'vscode-languageserver-textdocument';

export class Logger {
  private readonly startTimestamp: number;

  constructor(
    public level: 'off' | 'info' | 'debug' | 'trace',
    private readonly console: RemoteConsole
  ) {
    this.startTimestamp = Date.now();
  }

  private timestampNow(): string {
    const elapsed = Date.now() - this.startTimestamp;

    const millis = elapsed % 1000;
    const seconds = (elapsed % (1000 * 60)) - millis;
    const minutes = elapsed - seconds - millis;

    const millisStr = millis.toString().padStart(3, '0');
    const secondsStr = seconds.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(3, '0');

    return `${minutesStr}:${secondsStr}.${millisStr}`;
  }

  private fmt(opts: { depth?: number }, ...values: unknown[]): string {
    const processed = values
      .map(value => {
        let message: string;
        if (typeof value === 'object') {
          message = util.inspect(value, {
            showHidden: false,
            depth: opts.depth ?? 5,
            colors: false,
          });
        } else {
          message = (value as { toString: () => string }).toString();
        }

        return message;
      })
      .join(' ');

    return `[+${this.timestampNow()}](pid ${process.pid}) ${processed}`;
  }

  logTrace(...values: unknown[]) {
    if (this.level === 'trace') {
      this.console.debug(this.fmt({ depth: 10 }, ...values))
    }
  }
  logDebug(...values: unknown[]) {
    if (this.level === 'trace' || this.level === 'debug') {
      this.console.log(this.fmt({ depth: 10 }, ...values))
    }
  }
  logInfo(...values: unknown[]) {
    if (this.level !== 'off') {
      this.console.info(this.fmt({}, ...values))
    }
  }
}

export type WorkContext<PartialResult = void> = {
  cancellationToken: CancellationToken;
  workDoneProgress: WorkDoneProgressReporter;
  resultProgress?: ResultProgressReporter<PartialResult>;
};
export type Context<PartialResult = void> = {
  work?: WorkContext<PartialResult>,
  log?: Logger
}
export function ctxWorkWithProgress<T>(work: WorkContext<unknown> | undefined, newProgress?: ResultProgressReporter<T>): WorkContext<T> | undefined {
  if (work === undefined) {
    return work
  }

  return {
    ...work,
    resultProgress: newProgress
  }
}

export function fileNameFromUri(uri: DocumentUri): string {
  const split = uri.split('/');
  const last = split[split.length - 1];

  return last;
}

export function stripUriPrefix(uri: DocumentUri): string {
  const FILE_PREFIX = 'file://';

  if (uri.startsWith(FILE_PREFIX)) {
    return uri.slice(FILE_PREFIX.length);
  }

  return uri;
}

export type WalkEntry = {
  isBlockDevice: boolean;
  isCharacterDevice: boolean;
  isFIFO: boolean;
  isFile: boolean;
  isSocket: boolean;
  isSymbolicLink: boolean;
  path: string;
};
export async function recursiveWalk(
  basePath: string,
  callback: (entry: WalkEntry) => Promise<void>
): Promise<void> {
  const entryPromises = await fsp
    .readdir(basePath, { withFileTypes: true })
    .then(entries =>
      entries.map(entry => {
        const entryPath = joinPath(basePath, entry.name);
        if (entry.isDirectory()) {
          return recursiveWalk(entryPath, callback);
        } else {
          const result = {
            get isBlockDevice(): boolean {
              return entry.isBlockDevice();
            },
            get isCharacterDevice(): boolean {
              return entry.isCharacterDevice();
            },
            get isFIFO(): boolean {
              return entry.isFIFO();
            },
            get isFile(): boolean {
              return entry.isFile();
            },
            get isSocket(): boolean {
              return entry.isSocket();
            },
            get isSymbolicLink(): boolean {
              return entry.isSymbolicLink();
            },
            path: entryPath,
          };

          return callback(result);
        }
      })
    );

  await Promise.all(entryPromises);
}
