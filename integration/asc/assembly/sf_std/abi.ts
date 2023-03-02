import { print } from './unstable';

export type Ptr = usize;
export type Size = usize;
export type PairRepr = u64;
export type ResultRepr = u64;

export class AbiPair {
  private static LOWER_BITS: usize = ASC_TARGET === 2 ? 48 : 32;
  private static LOWER_MASK: PairRepr = ((<PairRepr>1) << AbiPair.LOWER_BITS) - 1;
  
  constructor(
    public readonly lower: Size,
    public readonly upper: Size
  ) {}

  public static fromRepr(repr: PairRepr): AbiPair {
    const lower = <Size>(repr & 0xFFFFFFFF);
    const upper = <Size>((repr >> 32) & 0xFFFFFFFF);

    return new AbiPair(lower, upper);
  }

  public toRepr(): PairRepr {
    const lower = <PairRepr>this.lower;
    const upper = <PairRepr>this.upper << 32;

    return lower | upper;
  }

  public toString(): String {
    return `AbiPair(lower: ${this.lower}, upper: ${this.upper})`;
  }
}

export class AbiResult {
  protected static TAG_OK: Size = 0;
  protected static TAG_ERR: Size = 1;
  
  private constructor(
    public readonly isOk: bool,
    public readonly value: Size
  ) {}

  public static fromRepr(repr: ResultRepr): AbiResult {
    const pair = AbiPair.fromRepr(repr);
    const value = pair.lower;
    const tag = pair.upper;

    // This was a switch (tag) before but ASC complained about casting tag to u32 for some reason
    if (tag === AbiResult.TAG_OK) {
      return new AbiResult(true, value);
    } else if (tag === AbiResult.TAG_ERR) {
      return new AbiResult(false, value);
    } else {
      throw new Error(`Invalid tag ${tag} for AbiResult`);
    }
  }

  public toRepr(): ResultRepr {
    if (this.isOk) {
      return new AbiPair(this.value, AbiResult.TAG_OK).toRepr();
    } else {
      return new AbiPair(this.value, AbiResult.TAG_ERR).toRepr();
    }
  }

  public unwrap(): Size {
    if (this.isOk) {
      return this.value;
    } else {
      throw WasiError.fromErrno(this.value);
    }
  }
}

export class WasiError extends Error {
  private static SUCCESS: usize = 0;
  private static TOOBIG: usize = 1; // 2BIG
  private static ACCES: usize = 2;
  private static ADDRINUSE: usize = 3;
  private static ADDRNOTAVAIL: usize = 4;
  private static AFNOSUPPORT: usize = 5;
  private static AGAIN: usize = 6;
  private static ALREADY: usize = 7;
  private static BADF: usize = 8;
  private static BADMSG: usize = 9;
  private static BUSY: usize = 10;
  private static CANCELED: usize = 11;
  private static CHILD: usize = 12;
  private static CONNABORTED: usize = 13;
  private static CONNREFUSED: usize = 14;
  private static CONNRESET: usize = 15;
  private static DEADLK: usize = 16;
  private static DESTADDRREQ: usize = 17;
  private static DOM: usize = 18;
  private static DQUOT: usize = 19;
  private static EXIST: usize = 20;
  private static FAULT: usize = 21;
  private static FBIG: usize = 22;
  private static HOSTUNREACH: usize = 23;
  private static IDRM: usize = 24;
  private static ILSEQ: usize = 25;
  private static INPROGRESS: usize = 26;
  private static INTR: usize = 27;
  private static INVAL: usize = 28;
  private static IO: usize = 29;
  private static ISCONN: usize = 30;
  private static ISDIR: usize = 31;
  private static LOOP: usize = 32;
  private static MFILE: usize = 33;
  private static MLINK: usize = 34;
  private static MSGSIZE: usize = 35;
  private static MULTIHOP: usize = 36;
  private static NAMETOOLONG: usize = 37;
  private static NETDOWN: usize = 38;
  private static NETRESET: usize = 39;
  private static NETUNREACH: usize = 40;
  private static NFILE: usize = 41;
  private static NOBUFS: usize = 42;
  private static NODEV: usize = 43;
  private static NOENT: usize = 44;
  private static NOEXEC: usize = 45;
  private static NOLCK: usize = 46;
  private static NOLINK: usize = 47;
  private static NOMEM: usize = 48;
  private static NOMSG: usize = 49;
  private static NOPROTOOPT: usize = 50;
  private static NOSPC: usize = 51;
  private static NOSYS: usize = 52;
  private static NOTCONN: usize = 53;
  private static NOTDIR: usize = 54;
  private static NOTEMPTY: usize = 55;
  private static NOTRECOVERABLE: usize = 56;
  private static NOTSOCK: usize = 57;
  private static NOTSUP: usize = 58;
  private static NOTTY: usize = 59;
  private static NXIO: usize = 60;
  private static OVERFLOW: usize = 61;
  private static OWNERDEAD: usize = 62;
  private static PERM: usize = 63;
  private static PIPE: usize = 64;
  private static PROTO: usize = 65;
  private static PROTONOSUPPORT: usize = 66;
  private static PROTOTYPE: usize = 67;
  private static RANGE: usize = 68;
  private static ROFS: usize = 69;
  private static SPIPE: usize = 70;
  private static SRCH: usize = 71;
  private static STALE: usize = 72;
  private static TIMEDOUT: usize = 73;
  private static TXTBSY: usize = 74;
  private static XDEV: usize = 75;
  private static NOTCAPABLE: usize = 76;
  
  private static message(errno: Size): string {
    switch (errno) {
      case WasiError.SUCCESS: return 'SUCCESS';
      case WasiError.TOOBIG: return 'TOOBIG';
      case WasiError.ACCES: return 'ACCES';
      case WasiError.ADDRINUSE: return 'ADDRINUSE';
      case WasiError.ADDRNOTAVAIL: return 'ADDRNOTAVAIL';
      case WasiError.AFNOSUPPORT: return 'AFNOSUPPORT';
      case WasiError.AGAIN: return 'AGAIN';
      case WasiError.ALREADY: return 'ALREADY';
      case WasiError.BADF: return 'BADF';
      case WasiError.BADMSG: return 'BADMSG';
      case WasiError.BUSY: return 'BUSY';
      case WasiError.CANCELED: return 'CANCELED';
      case WasiError.CHILD: return 'CHILD';
      case WasiError.CONNABORTED: return 'CONNABORTED';
      case WasiError.CONNREFUSED: return 'CONNREFUSED';
      case WasiError.CONNRESET: return 'CONNRESET';
      case WasiError.DEADLK: return 'DEADLK';
      case WasiError.DESTADDRREQ: return 'DESTADDRREQ';
      case WasiError.DOM: return 'DOM';
      case WasiError.DQUOT: return 'DQUOT';
      case WasiError.EXIST: return 'EXIST';
      case WasiError.FAULT: return 'FAULT';
      case WasiError.FBIG: return 'FBIG';
      case WasiError.HOSTUNREACH: return 'HOSTUNREACH';
      case WasiError.IDRM: return 'IDRM';
      case WasiError.ILSEQ: return 'ILSEQ';
      case WasiError.INPROGRESS: return 'INPROGRESS';
      case WasiError.INTR: return 'INTR';
      case WasiError.INVAL: return 'INVAL';
      case WasiError.IO: return 'IO';
      case WasiError.ISCONN: return 'ISCONN';
      case WasiError.ISDIR: return 'ISDIR';
      case WasiError.LOOP: return 'LOOP';
      case WasiError.MFILE: return 'MFILE';
      case WasiError.MLINK: return 'MLINK';
      case WasiError.MSGSIZE: return 'MSGSIZE';
      case WasiError.MULTIHOP: return 'MULTIHOP';
      case WasiError.NAMETOOLONG: return 'NAMETOOLONG';
      case WasiError.NETDOWN: return 'NETDOWN';
      case WasiError.NETRESET: return 'NETRESET';
      case WasiError.NETUNREACH: return 'NETUNREACH';
      case WasiError.NFILE: return 'NFILE';
      case WasiError.NOBUFS: return 'NOBUFS';
      case WasiError.NODEV: return 'NODEV';
      case WasiError.NOENT: return 'NOENT';
      case WasiError.NOEXEC: return 'NOEXEC';
      case WasiError.NOLCK: return 'NOLCK';
      case WasiError.NOLINK: return 'NOLINK';
      case WasiError.NOMEM: return 'NOMEM';
      case WasiError.NOMSG: return 'NOMSG';
      case WasiError.NOPROTOOPT: return 'NOPROTOOPT';
      case WasiError.NOSPC: return 'NOSPC';
      case WasiError.NOSYS: return 'NOSYS';
      case WasiError.NOTCONN: return 'NOTCONN';
      case WasiError.NOTDIR: return 'NOTDIR';
      case WasiError.NOTEMPTY: return 'NOTEMPTY';
      case WasiError.NOTRECOVERABLE: return 'NOTRECOVERABLE';
      case WasiError.NOTSOCK: return 'NOTSOCK';
      case WasiError.NOTSUP: return 'NOTSUP';
      case WasiError.NOTTY: return 'NOTTY';
      case WasiError.NXIO: return 'NXIO';
      case WasiError.OVERFLOW: return 'OVERFLOW';
      case WasiError.OWNERDEAD: return 'OWNERDEAD';
      case WasiError.PERM: return 'PERM';
      case WasiError.PIPE: return 'PIPE';
      case WasiError.PROTO: return 'PROTO';
      case WasiError.PROTONOSUPPORT: return 'PROTONOSUPPORT';
      case WasiError.PROTOTYPE: return 'PROTOTYPE';
      case WasiError.RANGE: return 'RANGE';
      case WasiError.ROFS: return 'ROFS';
      case WasiError.SPIPE: return 'SPIPE';
      case WasiError.SRCH: return 'SRCH';
      case WasiError.STALE: return 'STALE';
      case WasiError.TIMEDOUT: return 'TIMEDOUT';
      case WasiError.TXTBSY: return 'TXTBSY';
      case WasiError.XDEV: return 'XDEV';
      case WasiError.NOTCAPABLE: return 'NOTCAPABLE';
      default: return 'Unknown';
    }
  }

  private constructor(
    message: string
  ) {
    super(message);
    this.name = 'WasiError';
  }

  public static fromErrno(errno: Size): WasiError {
    return new WasiError(WasiError.message(errno));
  }
}

export class MessageFn {
  private static DEFAULT_RESPONSE_BUFFER_SIZE: u32 = 1024;
  
  constructor(
    private readonly exchange_fn: (msg_ptr: Ptr, msg_len: Size, out_ptr: Ptr, out_len: Size) => PairRepr,
    private readonly retrieve_fn: (handle: Size, out_ptr: Ptr, out_len: Size) => ResultRepr
  ) {}

  public invoke(message: ArrayBuffer): ArrayBuffer {
    let response_buffer = new ArrayBuffer(MessageFn.DEFAULT_RESPONSE_BUFFER_SIZE);

    const exchange_result_raw = this.exchange_fn(
      changetype<Ptr>(message), <Size>(message.byteLength),
      changetype<Ptr>(response_buffer), <Size>(response_buffer.byteLength)
    );
    const exchange_result = AbiPair.fromRepr(exchange_result_raw);
    const result_size = exchange_result.lower;
    const result_handle = exchange_result.upper;

    if (result_size > <Size>response_buffer.byteLength) {
      response_buffer = new ArrayBuffer(<u32>result_size);

      const retrieve_result_raw = this.retrieve_fn(
        result_handle, changetype<Ptr>(response_buffer), <Size>response_buffer.byteLength
      );
      const retrieve_result = AbiResult.fromRepr(retrieve_result_raw);

      const written = retrieve_result.unwrap();
      assert(written === result_size);
    } else {
      response_buffer = response_buffer.slice(0, <u32>result_size);
    }
    
    return response_buffer;
  }

  /**
  * Invokes message exchange by sending `M` and receiving `R`.
  *
  * `M` is expected to have a method `to_json(): string`.
  *
  * `R` is expected to have a trivial constructor `constructor()` and a `from_json(string)` method.
  */
  public invoke_json<M, R>(message: M): R {
    const message_json: string = message.to_json();
    print(`Sending message: ${message_json}`);
    const message_json_utf8 = String.UTF8.encode(message_json);

    const response_json_utf8 = this.invoke(message_json_utf8);
    const response_json = String.UTF8.decode(response_json_utf8);
    print(`Response message: ${response_json}`);

    // just like Java beans - trivial constructors and setters :gun:
    const response: R = instantiate<R>();
    response.from_json(response_json);
    
    return response;
  }
}

// TODO: StreamFn