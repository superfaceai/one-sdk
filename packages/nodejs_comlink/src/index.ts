import { WASI, WASIOptions } from 'node:wasi';
import fs from 'node:fs/promises';

import { AppContextSync, TextCoder, sf_host } from './common_lib/index.js'
import type { Profile, Diagnostic, ProfileSpans } from './model'
export type * from './model'

function comlinkPathURL(): URL {
  return new URL('../assets/comlink.wasm', import.meta.url)
}

class TextCoderImpl implements TextCoder {
  private readonly encoder: TextEncoder
  private readonly decoder: TextDecoder
  constructor() {
    this.encoder = new TextEncoder()
    this.decoder = new TextDecoder()
  }

  decodeUtf8(buffer: ArrayBufferLike): string {
    return this.decoder.decode(buffer)
  }
  encodeUtf8(string: string): ArrayBuffer {
    return this.encoder.encode(string)
  }
}

type ParseProfileInput = { profile: string, file_path?: string }
type ParseProfileOutput = { profile: Profile, spans: ProfileSpans, diagnostics: Diagnostic[] }
export class ComlinkParser extends AppContextSync {
  public static async create(): Promise<ComlinkParser> {
    const wasm = await fs.readFile(process.env.COMLINK_WASM_PATH ?? comlinkPathURL().pathname)
    const module = await WebAssembly.compile(wasm)

    const parser =  new ComlinkParser(module)
    await parser.init()

    return parser
  }
  
  private readonly module: WebAssembly.Module
  private readonly wasi: WASI
  private readonly textCoder: TextCoder

  private instance: undefined | {
    instance: WebAssembly.Instance,
    parseTsProfile: () => void
  }
  private parserState: undefined | ParseProfileInput | ParseProfileOutput

  private constructor(module: WebAssembly.Module) {
    super()

    this.module = module
    this.wasi = new WASI({ version: 'preview1' } as WASIOptions)
    this.textCoder = new TextCoderImpl()
  }

  private async init() {
    const instance = await WebAssembly.instantiate(this.module, this.getImports())
    this.wasi.initialize(instance)
    this.instance = {
      instance,
      parseTsProfile: instance.exports['parse_ts_profile'] as () => void
    }
    this.parserState = undefined
  }

  private getImports(): WebAssembly.Imports {
    return {
      wasi_snapshot_preview1: this.wasi.wasiImport,
      ...sf_host.linkSync(this, this.textCoder)
    }
  }

  override get memory(): WebAssembly.Memory {
    return this.instance!.instance.exports.memory as WebAssembly.Memory
  }

  handleMessage(message: any): any {
    switch (message.kind) {
      case 'parse-ts-profile-input':
        return {
          kind: 'ok',
          profile: (this.parserState! as ParseProfileInput).profile,
          file_path: (this.parserState! as ParseProfileInput).file_path
        }
      case 'parse-ts-profile-output':
        this.parserState = { profile: message.profile, spans: message.spans, diagnostics: message.diagnostics }
        return { kind: 'ok' }
    }
  }
  readStream(_handle: number, _out: Uint8Array): number { throw new Error('not implemented') }
  writeStream(_handle: number, _data: Uint8Array): number { throw new Error('not implemented') }
  closeStream(_handle: number): void { throw new Error('not implemented') }

  public parseProfile(profile: string, filepath?: string): ParseProfileOutput {
    this.parserState = { profile, file_path: filepath }
    this.instance!.parseTsProfile()
    
    const result = this.parserState! as unknown as ParseProfileOutput
    this.parserState = undefined

    return result
  }
}
