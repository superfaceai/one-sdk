import fs, { FileHandle } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import process from "node:process";
import { WASI } from "node:wasi";

import { AsyncMutex } from "./common/lib/index.js";
import {
  App,
  FileSystem,
  HandleMap,
  Network,
  Persistence,
  SecurityValuesMap,
  TextCoder,
  Timers,
  UnexpectedError,
  WasiErrno,
  WasiError,
} from "./common/index.js";
import { fetchErrorToHostError, systemErrorToWasiError } from "./error.js";
import { fileURLToPath } from "node:url";

function coreWasmPath(): string {
  // use new URL constructor to get webpack to bundle the asset and non-bundled code to work correctly in all contexts
  const url = new URL("../assets/core-async.wasm", import.meta.url);

  let path = url.pathname;
  if (path.charAt(0) !== "/") {
    // when bundled with webpack (in nextjs at least), we get an invalid URL here where only the pathname is filled in
    // this pathname is additionally relative, so we must resolve it
    path = resolvePath(path);
  }

  // reconstruct the URL but only as a string and have node parse it using platform-specific code
  // if we reconstructed it as URL here we would get an mismatch because somehow there are two URL classes when bundled for next
  return fileURLToPath(`file://${path}`);
}

export {
  PerformError,
  UnexpectedError,
  ValidationError,
} from "./common/index.js";
export { fetchErrorToHostError, systemErrorToWasiError } from "./error.js";

const ASSETS_FOLDER = "superface";

class NodeTextCoder implements TextCoder {
  private encoder: TextEncoder = new TextEncoder();
  private decoder: TextDecoder = new TextDecoder();

  decodeUtf8(buffer: ArrayBuffer): string {
    return this.decoder.decode(buffer);
  }

  encodeUtf8(string: string): Uint8Array {
    return this.encoder.encode(string);
  }
}

class NodeFileSystem implements FileSystem {
  private readonly files: HandleMap<FileHandle> = new HandleMap();

  async exists(path: string): Promise<boolean> {
    try {
      await fs.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async open(
    path: string,
    options: {
      createNew?: boolean;
      create?: boolean;
      truncate?: boolean;
      append?: boolean;
      write?: boolean;
      read?: boolean;
    }
  ): Promise<number> {
    let flags = "";

    if (options.createNew === true) {
      flags += "x";
    } else if (options.create === true) {
      // TODO
    }

    if (options.truncate === true) {
      flags += "w";
    } else if (options.append === true) {
      flags += "a";
    } else if (options.write === true) {
      flags += "+";
    } else if (options.read === true) {
      flags += "r";
    }

    try {
      const fileHandle = await fs.open(path, flags);
      return this.files.insert(fileHandle);
    } catch (err: unknown) {
      throw systemErrorToWasiError(err);
    }
  }
  async read(handle: number, out: Uint8Array): Promise<number> {
    const file = this.files.get(handle);
    if (file === undefined) {
      throw new WasiError(WasiErrno.EBADF);
    }

    try {
      const result = await file.read(out, 0, out.byteLength);
      return result.bytesRead;
    } catch (err: unknown) {
      throw systemErrorToWasiError(err);
    }
  }
  async write(handle: number, data: Uint8Array): Promise<number> {
    const file = this.files.get(handle);
    if (file === undefined) {
      throw new WasiError(WasiErrno.EBADF);
    }

    try {
      const result = await file.write(data, 0, data.length);
      return result.bytesWritten;
    } catch (err: unknown) {
      throw systemErrorToWasiError(err);
    }
  }
  async close(handle: number): Promise<void> {
    const file = this.files.remove(handle);
    if (file === undefined) {
      throw new WasiError(WasiErrno.ENOENT);
    }

    try {
      await file.close();
    } catch (err: unknown) {
      throw systemErrorToWasiError(err);
    }
  }
}

class NodeTimers implements Timers {
  public setTimeout(callback: () => void, ms: number): number {
    return setTimeout(callback, ms) as unknown as number;
  }

  public clearTimeout(handle: number): void {
    clearTimeout(handle);
  }
}

class NodeNetwork implements Network {
  // TODO: import from undici explicitly
  async fetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
    try {
      return await fetch(input, init);
    } catch (err: unknown) {
      throw fetchErrorToHostError(err);
    }
  }
}

class NodePersistence implements Persistence {
  private readonly insightsUrl: string | false;
  private readonly token: string | undefined;
  private readonly userAgent: string | undefined;

  constructor(
    token: string | undefined,
    superfaceApiUrl: string | undefined | false,
    userAgent: string | undefined
  ) {
    this.token = token;
    this.userAgent = userAgent;
    if (superfaceApiUrl === undefined) {
      this.insightsUrl = "https://superface.ai/insights/sdk_event";
    } else {
      this.insightsUrl = false;
    }
  }

  async persistMetrics(events: string[]): Promise<void> {
    if (this.insightsUrl === false) {
      return;
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (this.token !== undefined) {
      headers["authorization"] = `SUPERFACE-SDK-TOKEN ${this.token}`;
    }
    if (this.userAgent !== undefined) {
      headers["user-agent"] = this.userAgent;
    }

    await fetch(`${this.insightsUrl}/batch`, {
      method: "POST",
      body: "[" + events.join(",") + "]",
      headers,
    }).catch((err) => console.error("Failed to send metrics", err));
  }

  async persistDeveloperDump(events: string[]): Promise<void> {
    const timestamp = new Date()
      .toISOString()
      .replaceAll(":", "-")
      .replaceAll(".", "-");
    const fileName = `onesdk_devlog_dump_${timestamp}.txt`;

    // TOOD: where to create the dump?
    await fs.writeFile(fileName, events.join(""));
  }
}

export type ClientOptions = {
  /**
   * Path to folder with Comlink's assets.
   */
  assetsPath?: string;
  /**
   * Optionally authenticate Client to send metrics about integration to Superface.
   *
   * Manage tokens and see insights here: https://superface.ai/insights
   */
  token?: string;
  /**
   * URL where the Superface API can be reached.
   */
  superfaceApiUrl?: string | false;
  /**
   * Whether to register `beforeExit` hook to call `OneClient.destroy()`.
   *
   * Default: `true`
   */
  onBeforeExitHook?: boolean;
};

export type ClientPerformOptions = {
  provider: string; // TODO: is there a way to make it optional?
  parameters?: Record<string, string>;
  security?: SecurityValuesMap;
};

class InternalClient {
  public readonly assetsPath: string = resolvePath(
    process.cwd(),
    ASSETS_FOLDER
  );

  private app: App;
  private readyState: AsyncMutex<{ ready: boolean }>;
  private readonly fileSystem: NodeFileSystem;
  private readonly pkg: { version: string };

  constructor(readonly options: ClientOptions = {}) {
    if (options.assetsPath !== undefined) {
      this.assetsPath = options.assetsPath;
    }

    this.pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), {
        encoding: "utf8",
      })
    );
    this.readyState = new AsyncMutex({ ready: false });
    this.fileSystem = new NodeFileSystem();

    this.app = new App(
      {
        network: new NodeNetwork(),
        fileSystem: this.fileSystem,
        textCoder: new NodeTextCoder(),
        timers: new NodeTimers(),
        persistence: new NodePersistence(
          options.token,
          options.superfaceApiUrl,
          this.userAgent
        ),
      },
      { metricsTimeout: 1000, userAgent: this.userAgent }
    );

    if (options.onBeforeExitHook !== false) {
      process.once("beforeExit", async () => {
        await this.destroy();
      });
    }
  }

  public async init() {
    return this.readyState.withLock(async (readyState) => {
      if (readyState.ready === true) {
        return;
      }

      await this.app.loadCore(
        await fs.readFile(process.env.CORE_PATH ?? coreWasmPath())
      );
      await this.app.init(
        new WASI({
          env: {
            ONESDK_DEFAULT_USERAGENT: this.userAgent,
            ...process.env,
          },
          version: "preview1",
        } as any)
      ); // TODO: node typings do not include version https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/wasi.d.ts#L68-L110

      readyState.ready = true;
    });
  }

  public async destroy() {
    return this.readyState.withLock(async (readyState) => {
      if (readyState.ready === false) {
        return;
      }

      await this.app.destroy();
      readyState.ready = false;
    });
  }

  public async perform(
    profile: string,
    provider: string,
    usecase: string,
    input?: unknown,
    parameters: Record<string, string> = {},
    security: SecurityValuesMap = {}
  ): Promise<unknown> {
    await this.init();

    const profileUrl = await this.resolveProfileUrl(profile);
    const providerUrl = await this.resolveProviderUrl(provider);
    const mapUrl = await this.resolveMapUrl(profile, provider);

    try {
      return await this.app.perform(
        profileUrl,
        providerUrl,
        mapUrl,
        usecase,
        input,
        parameters,
        security
      );
    } catch (err: unknown) {
      if (
        err instanceof UnexpectedError &&
        err.name === "WebAssemblyRuntimeError"
      ) {
        await this.destroy();
        await this.init();
      }

      throw err;
    }
  }

  public async resolveProfileUrl(profile: string): Promise<string> {
    const resolvedProfile = profile.replace(/\//g, ".");
    let path = resolvePath(this.assetsPath, `${resolvedProfile}.profile.ts`);
    // migration from Comlink to TypeScript profiles
    const pathComlink = resolvePath(
      this.assetsPath,
      `${resolvedProfile}.profile`
    );
    if (
      !(await this.fileSystem.exists(path)) &&
      (await this.fileSystem.exists(pathComlink))
    ) {
      path = pathComlink;
    }

    return `file://${path}`;
  }

  public async resolveMapUrl(
    profile: string,
    provider?: string
  ): Promise<string> {
    const resolvedProfile = profile.replace(/\//g, ".");
    const path = resolvePath(
      this.assetsPath,
      `${resolvedProfile}.${provider}.map.js`
    );

    return `file://${path}`;
  }

  public async resolveProviderUrl(provider: string): Promise<string> {
    const path = resolvePath(this.assetsPath, `${provider}.provider.json`);

    return `file://${path}`;
  }

  public async sendMetrics() {
    await this.app.sendMetrics();
  }

  private get userAgent(): string {
    const platform = process.platform;
    const arch = process.arch;
    const nodeVersion = process.version;
    const version = this.pkg.version;

    return `one-sdk-nodejs/${version} (${platform} ${arch}) node.js/${nodeVersion}`;
  }
}

export class OneClient {
  private internal: InternalClient;

  constructor(readonly options: ClientOptions = {}) {
    this.internal = new InternalClient(options);
  }

  public async init() {
    await this.internal.init();
  }

  public async destroy() {
    await this.internal.destroy();
  }

  public async getProfile(name: string): Promise<Profile> {
    return await Profile.loadLocal(this.internal, name);
  }

  public async sendMetricsToSuperface() {
    await this.internal.sendMetrics();
  }
}

export class Profile {
  private constructor(
    private readonly internal: InternalClient,
    public readonly name: string,
    public readonly url: string
  ) {}

  public static async loadLocal(
    internal: InternalClient,
    name: string
  ): Promise<Profile> {
    const profileUrl = await internal.resolveProfileUrl(name);
    return new Profile(internal, name, profileUrl);
  }

  public getUseCase(usecaseName: string): UseCase {
    return new UseCase(this.internal, this, usecaseName);
  }
}

export class UseCase {
  constructor(
    private readonly internal: InternalClient,
    private readonly profile: Profile,
    public readonly name: string
  ) {}

  /**
   * @param {*} input
   * @param {ClientPerformOptions} options
   * @returns {*}
   * @throws {PerformError | UnexpectedError}
   */
  public async perform<TInput = unknown, TResult = unknown>(
    input: TInput | undefined,
    options: ClientPerformOptions
  ): Promise<TResult> {
    return (await this.internal.perform(
      this.profile.name,
      options.provider,
      this.name,
      input,
      options?.parameters,
      options?.security
    )) as TResult;
  }
}
