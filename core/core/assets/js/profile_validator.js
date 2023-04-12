"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/map-std/dist/unstable.js
  var unstable_exports = {};
  __export(unstable_exports, {
    CONTENT_TYPE: () => CONTENT_TYPE,
    HttpRequest: () => HttpRequest,
    HttpResponse: () => HttpResponse,
    MapError: () => MapError,
    fetch: () => fetch,
    print: () => print,
    resolveRequestUrl: () => resolveRequestUrl,
    setOutputFailure: () => setOutputFailure,
    setOutputSuccess: () => setOutputSuccess,
    takeInput: () => takeInput
  });

  // node_modules/map-std/dist/internal/bytes.js
  var Bytes = class {
    #buffer;
    #len;
    // TODO: private
    constructor(buffer, len) {
      this.#buffer = buffer;
      this.#len = len;
    }
    static withCapacity(capacity) {
      return new Bytes(new Uint8Array(capacity ?? 0), 0);
    }
    static fromArray(array) {
      return new Bytes(new Uint8Array(array), array.length);
    }
    toArray() {
      return Array.from(this.data);
    }
    get len() {
      return this.#len;
    }
    get capacity() {
      return this.#buffer.byteLength;
    }
    get data() {
      return this.#buffer.subarray(0, this.len);
    }
    get uninitData() {
      return this.#buffer.subarray(this.len);
    }
    reserve(additional) {
      const want = this.len + additional;
      if (this.capacity >= want) {
        return;
      }
      const newCapacity = Math.max(this.capacity * 2, want);
      const newBuffer = new Uint8Array(newCapacity);
      newBuffer.set(this.data, 0);
      this.#buffer = newBuffer;
    }
    extend(buffer) {
      this.reserve(buffer.byteLength);
      this.#buffer.set(new Uint8Array(buffer), this.len);
      this.#len += buffer.byteLength;
    }
    decode(encoding = "utf8") {
      const buffer = this.#buffer.buffer.slice(0, this.len);
      if (encoding === "utf8") {
        return __ffi.unstable.bytes_to_utf8(buffer);
      } else if (encoding === "base64") {
        return __ffi.unstable.bytes_to_base64(buffer);
      }
      throw new Error(`encoding "${encoding}" not implemented`);
    }
    // TODO: support other encodings, currently this is always utf-8
    static encode(string, encoding = "utf8") {
      let buffer;
      if (encoding === "utf8") {
        buffer = __ffi.unstable.utf8_to_bytes(string);
      } else if (encoding === "base64") {
        buffer = __ffi.unstable.base64_to_bytes(string);
      } else {
        throw new Error(`encoding "${encoding}" not implemented`);
      }
      return new Bytes(new Uint8Array(buffer), buffer.byteLength);
    }
  };
  var ByteStream = class {
    #handle;
    constructor(handle) {
      this.#handle = handle;
    }
    readToEnd() {
      const buffer = Bytes.withCapacity(8192);
      const readBuffer = new ArrayBuffer(8192);
      while (true) {
        const count = __ffi.unstable.stream_read(this.#handle, readBuffer);
        if (count === 0) {
          break;
        }
        buffer.extend(readBuffer.slice(0, count));
      }
      return buffer;
    }
    close() {
      __ffi.unstable.stream_close(this.#handle);
    }
  };

  // node_modules/map-std/dist/internal/node_compat.js
  var Buffer2 = class {
    static from(value, encoding = "utf8") {
      if (typeof value === "string") {
        return new Buffer2(Bytes.encode(value, encoding));
      }
      if (Buffer2.isBuffer(value)) {
        return value;
      }
      if (Array.isArray(value)) {
        return new Buffer2(Bytes.fromArray(value));
      }
      throw new Error("not implemented");
    }
    static isBuffer(value) {
      if (value === void 0 || value === null) {
        return false;
      }
      if (value instanceof Buffer2) {
        return true;
      }
      return false;
    }
    #inner;
    constructor(inner) {
      this.#inner = inner;
    }
    /** @internal */
    get inner() {
      return this.#inner;
    }
    toString(encoding = "utf8") {
      return this.#inner.decode(encoding);
    }
  };

  // node_modules/map-std/dist/internal/message.js
  function jsonReplacerMapValue(key, value) {
    if (Buffer2.isBuffer(value)) {
      return { type: "Buffer", data: value.inner.toArray() };
    }
    return value;
  }
  function jsonReviverMapValue(key, value) {
    if (typeof value === "object" && value !== null) {
      if (value["type"] === "Buffer" && Array.isArray(value["data"])) {
        return Buffer2.from(value["data"]);
      }
    }
    return value;
  }
  function messageExchange(message, replacer = void 0, reviver = void 0) {
    const response = __ffi.unstable.message_exchange(JSON.stringify(message, replacer));
    return JSON.parse(response, reviver);
  }

  // node_modules/map-std/dist/internal/util.js
  function ensureMultimap(map, lowercaseKeys = false) {
    const result = {};
    if (typeof map !== "object" || map === null) {
      return result;
    }
    for (let [key, value] of Object.entries(map)) {
      if (lowercaseKeys) {
        key = key.toLowerCase();
      }
      if (!Array.isArray(value)) {
        value = [value];
      }
      result[key] = value.filter((v) => v !== void 0 && v !== null).map((v) => v.toString());
    }
    return result;
  }

  // node_modules/map-std/dist/unstable.js
  var HttpRequest = class {
    #handle;
    /** @internal */
    constructor(handle) {
      this.#handle = handle;
    }
    response() {
      const response = messageExchange({
        kind: "http-call-head",
        handle: this.#handle
      });
      if (response.kind === "ok") {
        return new HttpResponse(response.status, response.headers, response.body_stream);
      } else {
        throw new Error(response.error);
      }
    }
  };
  var HttpResponse = class {
    status;
    headers;
    #bodyStream;
    /** @internal */
    constructor(status, headers, bodyStream) {
      this.status = status;
      this.headers = headers;
      this.#bodyStream = new ByteStream(bodyStream);
    }
    // TODO: either make Bytes public or use a different type
    bodyBytes() {
      const buffer = this.#bodyStream.readToEnd();
      this.#bodyStream.close();
      return buffer;
    }
    bodyText() {
      const bytes = this.bodyBytes();
      if (bytes.len === 0) {
        return "";
      }
      return bytes.decode();
    }
    bodyJson() {
      const text = this.bodyText();
      if (text === void 0 || text === "") {
        return void 0;
      }
      return JSON.parse(text);
    }
    bodyAuto() {
      if (this.status === 204) {
        return void 0;
      }
      if (this.headers["content-type"]?.some((ct) => ct.indexOf(CONTENT_TYPE.JSON) >= 0) ?? false) {
        return this.bodyJson();
      }
      if (this.headers["content-type"]?.some((ct) => CONTENT_TYPE.RE_BINARY.test(ct)) ?? false) {
        return this.bodyBytes();
      }
      return this.bodyText();
    }
  };
  var MapError = class {
    output;
    constructor(output) {
      this.output = output;
    }
  };
  function print(message) {
    if (message === void 0) {
      __ffi.unstable.print("undefined");
    } else if (message === null) {
      __ffi.unstable.print("null");
    } else {
      __ffi.unstable.print(message.toString());
    }
  }
  function takeInput() {
    const response = messageExchange({
      kind: "take-input"
    }, void 0, jsonReviverMapValue);
    if (response.kind === "ok") {
      return response.input;
    } else {
      throw new Error(response.error);
    }
  }
  function setOutputSuccess(output) {
    const response = messageExchange({
      kind: "set-output-success",
      output: output ?? null
    }, jsonReplacerMapValue, void 0);
    if (response.kind === "ok") {
      return;
    } else {
      throw new Error(response.error);
    }
  }
  function setOutputFailure(output) {
    const response = messageExchange({
      kind: "set-output-failure",
      output: output ?? null
    }, jsonReplacerMapValue, void 0);
    if (response.kind === "ok") {
      return;
    } else {
      throw new Error(response.error);
    }
  }
  var CONTENT_TYPE = {
    JSON: "application/json",
    URLENCODED: "application/x-www-form-urlencoded",
    FORMDATA: "multipart/form-data",
    RE_BINARY: /application\/octet-stream|video\/.*|audio\/.*|image\/.*/
  };
  function resolveRequestUrl(url, options) {
    const { parameters, security } = options;
    let serviceId = options.serviceId ?? parameters.__provider.defaultService;
    if (url === "") {
      return parameters.__provider.services[serviceId].baseUrl;
    }
    const isRelative = /^\/([^/]|$)/.test(url);
    if (isRelative) {
      url = parameters.__provider.services[serviceId].baseUrl.replace(/\/+$/, "") + url;
    }
    return url;
  }
  function fetch(url, options) {
    const headers = ensureMultimap(options.headers ?? {}, true);
    let finalBody;
    let body = options.body;
    if (body !== void 0 && body !== null) {
      const contentType = headers["content-type"]?.[0] ?? "application/json";
      let bodyBytes;
      if (contentType.startsWith(CONTENT_TYPE.JSON)) {
        bodyBytes = Bytes.encode(JSON.stringify(body));
      } else if (contentType.startsWith(CONTENT_TYPE.URLENCODED)) {
        bodyBytes = Bytes.encode(__ffi.unstable.record_to_urlencoded(ensureMultimap(body)));
      } else if (CONTENT_TYPE.RE_BINARY.test(contentType)) {
        bodyBytes = Buffer2.from(body).inner;
      } else {
        throw new Error(`Content type not supported: ${contentType}`);
      }
      finalBody = Array.from(bodyBytes.data);
    }
    const response = messageExchange({
      kind: "http-call",
      method: options.method ?? "GET",
      url,
      headers,
      query: ensureMultimap(options.query ?? {}),
      body: finalBody
    });
    if (response.kind === "ok") {
      return new HttpRequest(response.handle);
    } else {
      throw new Error(response.error);
    }
  }

  // src/parser/common/source/util.ts
  function countStarting(predicate, str) {
    let position = 0;
    let code = str.charCodeAt(position);
    while (!isNaN(code) && predicate(code)) {
      position += 1;
      code = str.charCodeAt(position);
    }
    return position;
  }
  function isLetter(char) {
    return char >= 65 && char <= 90 || char >= 97 && char <= 122;
  }
  var countStartingLetters = countStarting.bind(void 0, isLetter);
  function isBinaryNumber(char) {
    return char === 48 || char === 49;
  }
  function isOctalNumber(char) {
    return char >= 48 && char <= 55;
  }
  function isDecimalNumber(char) {
    return char >= 48 && char <= 57;
  }
  function isHexadecimalNumber(char) {
    return char >= 48 && char <= 57 || char >= 65 && char <= 70 || char >= 97 && char <= 102;
  }
  var countStartingNumbers = countStarting.bind(
    void 0,
    isDecimalNumber
  );
  function countStartingNumbersRadix(str, radix) {
    switch (radix) {
      case 2:
        return countStarting(isBinaryNumber, str);
      case 8:
        return countStarting(isOctalNumber, str);
      case 10:
        return countStarting(isDecimalNumber, str);
      case 16:
        return countStarting(isHexadecimalNumber, str);
      default:
        throw `Radix ${radix} is not supported (supported: 2, 8, 10, 16).`;
    }
  }
  function isDecimalSeparator(char) {
    return char === 46;
  }
  function isValidIdentifierStartChar(char) {
    return char === 95 || isLetter(char);
  }
  function isValidIdentifierChar(char) {
    return isValidIdentifierStartChar(char) || isDecimalNumber(char);
  }
  var countStartingIdentifierChars = countStarting.bind(
    void 0,
    isValidIdentifierChar
  );
  function isWhitespace(char) {
    return char === 9 || char === 32 || char === 65279 || char === 10;
  }
  function isNewline(char) {
    return char === 10;
  }
  function isStringLiteralChar(char) {
    return char === 34 || char === 39;
  }
  function isStringLiteralEscapeChar(char) {
    return char === 92;
  }
  function isAny(_) {
    return true;
  }
  function isNotValidIdentifierChar(char) {
    return !isValidIdentifierChar(char);
  }
  function tryKeywordLiteral(str, keyword, ret, charAfterPredicate) {
    if (str.startsWith(keyword)) {
      const checkPredicate = charAfterPredicate ?? isNotValidIdentifierChar;
      const charAfter = str.charCodeAt(keyword.length);
      if (!checkPredicate(charAfter)) {
        return void 0;
      }
      return {
        value: ret,
        length: keyword.length
      };
    } else {
      return void 0;
    }
  }

  // src/parser/common/source/source.ts
  var Source = class {
    /** Actual text of the source. */
    body;
    /** Name of the file to display in errors. */
    fileName;
    /** Offset from the start of the file the body covers. */
    fileLocationOffset;
    constructor(body, fileName, fileLocationOffset) {
      this.body = body;
      this.fileName = fileName ?? "[input]";
      this.fileLocationOffset = fileLocationOffset ?? { line: 0, column: 0 };
    }
    checksum() {
      const hash = this.body.length.toString();
      return hash;
    }
    applyLocationOffset(location) {
      const startColumnShift = location.start.line === 1 ? this.fileLocationOffset.column : 0;
      const endColumnShift = location.end.line === 1 ? this.fileLocationOffset.column : 0;
      return {
        start: {
          line: this.fileLocationOffset.line + location.start.line,
          column: location.start.column + startColumnShift,
          charIndex: location.start.charIndex
        },
        end: {
          line: this.fileLocationOffset.line + location.end.line,
          column: location.end.column + endColumnShift,
          charIndex: location.end.charIndex
        }
      };
    }
  };
  function computeEndLocation(slice, startLocation) {
    const charArray = Array.from(slice);
    const [newlines, newlineOffset] = charArray.reduce(
      (acc, char, index) => {
        if (isNewline(char.charCodeAt(0))) {
          acc[0] += 1;
          acc[1] = index;
        }
        return acc;
      },
      [0, void 0]
    );
    let column;
    if (newlineOffset === void 0) {
      column = startLocation.column + slice.length;
    } else {
      column = slice.length - newlineOffset;
    }
    return {
      line: startLocation.line + newlines,
      column,
      charIndex: startLocation.charIndex + slice.length
    };
  }

  // src/parser/lexer/token.ts
  var SEPARATORS = {
    "(": ["(", isAny],
    ")": [")", isAny],
    "[": ["[", isAny],
    "]": ["]", isAny],
    "{": ["{", isAny],
    "}": ["}", isAny]
  };
  var OPERATORS = {
    ":": [":", isAny],
    "!": ["!", isAny],
    "|": ["|", isAny],
    "=": ["=", isAny],
    "@": ["@", isAny],
    ",": [",", isAny],
    ";": [";", isAny],
    ".": [".", isAny]
  };
  var LITERALS_BOOL = {
    true: [true, isNotValidIdentifierChar],
    false: [false, isNotValidIdentifierChar]
  };
  function formatTokenKind(kind) {
    switch (kind) {
      case 0 /* UNKNOWN */:
        return "unknown";
      case 1 /* SEPARATOR */:
        return "separator";
      case 2 /* OPERATOR */:
        return "operator";
      case 3 /* LITERAL */:
        return "number or boolean literal";
      case 4 /* STRING */:
        return "string";
      case 5 /* IDENTIFIER */:
        return "identifier";
      case 6 /* COMMENT */:
        return "comment";
      case 7 /* NEWLINE */:
        return "newline";
      case 8 /* JESSIE_SCRIPT */:
        return "jessie script";
    }
  }
  function formatTokenData(data) {
    const kind = formatTokenKind(data.kind);
    switch (data.kind) {
      case 0 /* UNKNOWN */:
        return { kind, data: "unknown" };
      case 1 /* SEPARATOR */:
        return { kind, data: data.separator.toString() };
      case 2 /* OPERATOR */:
        return { kind, data: data.operator.toString() };
      case 3 /* LITERAL */:
        return { kind, data: data.literal.toString() };
      case 4 /* STRING */:
        return { kind, data: data.string.toString() };
      case 5 /* IDENTIFIER */:
        return { kind, data: data.identifier.toString() };
      case 6 /* COMMENT */:
        return { kind, data: data.comment.toString() };
      case 7 /* NEWLINE */:
        return { kind, data: "\n" };
      case 8 /* JESSIE_SCRIPT */:
        return { kind, data: data.script.toString() };
    }
  }
  var LexerToken = class {
    constructor(data, location) {
      this.data = data;
      this.location = location;
    }
    isSOF() {
      return this.data.kind == 1 /* SEPARATOR */ && this.data.separator === "SOF";
    }
    isEOF() {
      return this.data.kind == 1 /* SEPARATOR */ && this.data.separator === "EOF";
    }
    toStringDebug() {
      const loc = `${this.location.start.line}:${this.location.start.column};${this.location.end.line}:${this.location.end.column}`;
      const span = `${this.location.start.charIndex};${this.location.end.charIndex}`;
      return `{${this.toString()}}@(${loc})[${span}]`;
    }
    toString() {
      return this[Symbol.toStringTag]();
    }
    [Symbol.toStringTag]() {
      const fmt = formatTokenData(this.data);
      return `${fmt.kind} \`${fmt.data}\``;
    }
  };

  // src/parser/error.ts
  function computeVisualizeBlockSpan(body, innerLocation) {
    const innerLineStart = innerLocation.start.charIndex - (innerLocation.start.column - 1);
    let lineOffset = 0;
    let start = 0;
    if (innerLineStart !== 0) {
      start = body.slice(0, innerLineStart - 1).lastIndexOf("\n") + 1;
      lineOffset = -1;
    }
    let end = body.length;
    const innerLineEnd = body.indexOf("\n", innerLocation.end.charIndex);
    if (innerLineEnd !== -1) {
      const nextLineEnd = body.indexOf("\n", innerLineEnd + 1);
      if (nextLineEnd !== -1) {
        end = nextLineEnd;
      }
    }
    return { start, end, lineOffset };
  }
  function formatLinePrefix(padSize, lineNumber) {
    let value = "";
    if (lineNumber !== void 0) {
      value = lineNumber.toString();
    }
    return `${value.padEnd(padSize ?? 4, " ")} | `;
  }
  function renderErrorVisualization(lines, errorLocation, prefixWidth, firstLineIndex, startPosition) {
    let output = "";
    let position = startPosition;
    let currentLine = firstLineIndex;
    for (const line of lines) {
      output += formatLinePrefix(prefixWidth, currentLine);
      output += line + "\n";
      if (position <= errorLocation.end.charIndex && position + line.length >= errorLocation.start.charIndex) {
        output += formatLinePrefix(prefixWidth);
        for (let i = 0; i < line.length; i += 1) {
          if (i >= errorLocation.start.charIndex - position && i < errorLocation.end.charIndex - position) {
            output += "^";
          } else {
            if (line.charAt(i) === "	") {
              output += "	";
            } else {
              output += " ";
            }
          }
        }
        output += "\n";
      }
      position += line.length;
      currentLine += 1;
      position += 1;
    }
    return output;
  }
  function generateErrorVisualization(source, location) {
    const visBlock = computeVisualizeBlockSpan(source.body, location);
    const sourceLocation = source.applyLocationOffset(location);
    const sourceTextSlice = source.body.slice(visBlock.start, visBlock.end);
    const sourceTextLines = sourceTextSlice.split("\n");
    const maxLineNumberLog = Math.log10(sourceLocation.start.line + sourceTextLines.length) + 1;
    let visualization = "";
    if (location.start.charIndex < location.end.charIndex) {
      visualization = renderErrorVisualization(
        sourceTextLines,
        location,
        maxLineNumberLog,
        sourceLocation.start.line + visBlock.lineOffset,
        visBlock.start
      );
    }
    return {
      visualization,
      maxLineNumberLog,
      sourceLocation
    };
  }
  function errorCategoryStrings(category) {
    const result = {
      categoryDetail: void 0,
      categoryHints: []
    };
    switch (category) {
      case "Script syntax" /* SCRIPT_SYNTAX */:
      case "Script validation" /* SCRIPT_VALIDATION */:
        result.categoryDetail = "Error in script syntax";
        result.categoryHints.push(
          "This was parsed in script context, it might be an error in comlink syntax instead"
        );
        break;
    }
    return result;
  }
  var SyntaxError = class {
    constructor(source, location, category, detail, hints) {
      this.source = source;
      this.location = location;
      this.category = category;
      const { categoryDetail, categoryHints } = errorCategoryStrings(
        this.category
      );
      this.detail = detail ?? "Invalid or unexpected token";
      if (categoryDetail !== void 0) {
        this.detail = `${categoryDetail}: ${this.detail}`;
      }
      this.hints = hints ?? [];
      this.hints.push(...categoryHints);
    }
    /** Additional message attached to the error. */
    detail;
    hints;
    static fromSyntaxRuleNoMatch(source, result) {
      let actual = "<NONE>";
      if (result.attempts.token !== void 0) {
        const fmt = formatTokenData(result.attempts.token.data);
        switch (result.attempts.token.data.kind) {
          case 1 /* SEPARATOR */:
          case 2 /* OPERATOR */:
          case 3 /* LITERAL */:
          case 5 /* IDENTIFIER */:
            actual = "`" + fmt.data + "`";
            break;
          case 4 /* STRING */:
            actual = '"' + fmt.data + '"';
            break;
          case 0 /* UNKNOWN */:
            return result.attempts.token.data.error;
          default:
            actual = fmt.kind;
            break;
        }
      }
      const location = result.attempts.token?.location ?? {
        start: { line: 0, column: 0, charIndex: 0 },
        end: { line: 0, column: 0, charIndex: 0 }
      };
      const expectedFilterSet = /* @__PURE__ */ new Set();
      const expected = result.attempts.rules.map((r) => r.toString()).filter((r) => {
        if (expectedFilterSet.has(r)) {
          return false;
        }
        expectedFilterSet.add(r);
        return true;
      }).join(" or ");
      return new SyntaxError(
        source,
        location,
        "Parser" /* PARSER */,
        `Expected ${expected} but found ${actual}`
      );
    }
    formatVisualization() {
      const { visualization, maxLineNumberLog, sourceLocation } = generateErrorVisualization(this.source, this.location);
      const locationLinePrefix = " ".repeat(maxLineNumberLog) + "--> ";
      const locationLine = `${locationLinePrefix}${this.source.fileName}:${sourceLocation.start.line}:${sourceLocation.start.column}`;
      return `${locationLine}
${visualization}`;
    }
    formatHints() {
      function isString(i) {
        return i !== void 0;
      }
      const filtered = this.hints.filter(isString);
      if (filtered.length === 0) {
        return "";
      }
      return filtered.map((h) => `Hint: ${h}`).join("\n");
    }
    format() {
      return `SyntaxError: ${this.detail}
${this.formatVisualization()}
${this.formatHints()}`;
    }
    get message() {
      return this.detail;
    }
  };

  // src/parser/lexer/sublexer/default/rules.ts
  function tryParseScannerRules(slice, rules) {
    let result = void 0;
    for (const [key, [word, predicate]] of Object.entries(rules)) {
      result = tryKeywordLiteral(slice, key, word, predicate);
      if (result) {
        break;
      }
    }
    return result;
  }
  function tryParseSeparator(slice) {
    if (slice.length === 0) {
      return {
        kind: "match",
        data: {
          kind: 1 /* SEPARATOR */,
          separator: "EOF"
        },
        relativeSpan: { start: 0, end: 0 }
      };
    }
    const parsed = tryParseScannerRules(slice, SEPARATORS);
    if (parsed === void 0) {
      return {
        kind: "nomatch",
        tokenKind: 1 /* SEPARATOR */
      };
    }
    return {
      kind: "match",
      data: {
        kind: 1 /* SEPARATOR */,
        separator: parsed.value
      },
      relativeSpan: { start: 0, end: parsed.length }
    };
  }
  function tryParseOperator(slice) {
    const parsed = tryParseScannerRules(slice, OPERATORS);
    if (parsed === void 0) {
      return {
        kind: "nomatch",
        tokenKind: 2 /* OPERATOR */
      };
    }
    return {
      kind: "match",
      data: {
        kind: 2 /* OPERATOR */,
        operator: parsed.value
      },
      relativeSpan: { start: 0, end: parsed.length }
    };
  }
  function tryParseBooleanLiteral(slice) {
    const parsed = tryParseScannerRules(slice, LITERALS_BOOL);
    if (parsed === void 0) {
      return {
        kind: "nomatch",
        tokenKind: 3 /* LITERAL */
      };
    }
    return {
      kind: "match",
      data: {
        kind: 3 /* LITERAL */,
        literal: parsed.value
      },
      relativeSpan: { start: 0, end: parsed.length }
    };
  }
  function tryParseIdentifier(slice) {
    if (!isValidIdentifierStartChar(slice.charCodeAt(0))) {
      return {
        kind: "nomatch",
        tokenKind: 5 /* IDENTIFIER */
      };
    }
    const identLength = countStartingIdentifierChars(slice);
    if (identLength === 0) {
      return {
        kind: "nomatch",
        tokenKind: 5 /* IDENTIFIER */
      };
    }
    return {
      kind: "match",
      data: {
        kind: 5 /* IDENTIFIER */,
        identifier: slice.slice(0, identLength)
      },
      relativeSpan: { start: 0, end: identLength }
    };
  }
  function tryParseComment(slice) {
    const prefix = tryParseScannerRules(slice, { "//": ["//", isAny] });
    if (prefix === void 0) {
      return {
        kind: "nomatch",
        tokenKind: 6 /* COMMENT */
      };
    }
    const commentSlice = slice.slice(prefix.length);
    const bodyLength = countStarting(
      (char) => !isNewline(char),
      commentSlice
    );
    return {
      kind: "match",
      data: {
        kind: 6 /* COMMENT */,
        comment: commentSlice.slice(0, bodyLength)
      },
      relativeSpan: { start: 0, end: prefix.length + bodyLength }
    };
  }

  // src/parser/lexer/sublexer/default/string.ts
  function resolveStringLiteralEscape(slice) {
    const firstChar = slice.charCodeAt(0);
    let result;
    switch (firstChar) {
      case 34:
        result = '"';
        break;
      case 39:
        result = "'";
        break;
      case 92:
        result = "\\";
        break;
      case 110:
        result = "\n";
        break;
      case 114:
        result = "\r";
        break;
      case 116:
        result = "	";
        break;
      default:
        return void 0;
    }
    return {
      value: result,
      length: 1
    };
  }
  function firstLastNonempty(lines) {
    let first = -1;
    let last = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].trim() !== "") {
        last = i;
        if (first === -1) {
          first = i;
        }
      }
    }
    return [first, last];
  }
  function commonPrefix(a, b) {
    let common = "";
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i += 1) {
      if (a[i] !== b[i]) {
        break;
      }
      common += a[i];
    }
    return common;
  }
  function transformBlockStringValue(string) {
    const lines = string.split("\n");
    const [nonemptyStart, nonemptyEnd] = firstLastNonempty(lines);
    const nonemptyLines = lines.slice(nonemptyStart, nonemptyEnd + 1);
    if (nonemptyLines.length === 0) {
      return "";
    }
    const leadingIndentCount = countStarting(
      (char) => isWhitespace(char),
      nonemptyLines[0]
    );
    const commonIndent = nonemptyLines.reduce(
      (acc, curr) => commonPrefix(acc, curr),
      nonemptyLines[0].slice(0, leadingIndentCount)
    );
    const output = nonemptyLines.map((line) => line.slice(commonIndent.length)).join("\n");
    return output;
  }
  function tryParseStringLiteral(slice) {
    const firstChar = slice.charCodeAt(0);
    if (!isStringLiteralChar(firstChar)) {
      return {
        kind: "nomatch",
        tokenKind: 4 /* STRING */
      };
    }
    let startingQuoteChars = countStarting(
      (char) => char === firstChar,
      slice
    );
    if (startingQuoteChars === 2) {
      return {
        kind: "match",
        data: {
          kind: 4 /* STRING */,
          string: ""
        },
        relativeSpan: { start: 0, end: 2 }
      };
    }
    if (startingQuoteChars >= 6) {
      return {
        kind: "match",
        data: {
          kind: 4 /* STRING */,
          string: ""
        },
        relativeSpan: { start: 0, end: 6 }
      };
    }
    if (startingQuoteChars > 3) {
      startingQuoteChars = 3;
    }
    let nonquotePredicate;
    if (startingQuoteChars === 1) {
      nonquotePredicate = (char) => char !== firstChar && !isStringLiteralEscapeChar(char);
    } else {
      nonquotePredicate = (char) => char !== firstChar;
    }
    let resultString = "";
    let restSlice = slice.slice(startingQuoteChars);
    let eatenChars = startingQuoteChars;
    const eatChars = (count, add) => {
      if (typeof add === "string") {
        resultString += add;
      } else if (add ?? true) {
        resultString += restSlice.slice(0, count);
      }
      restSlice = restSlice.slice(count);
      eatenChars += count;
    };
    for (; ; ) {
      const nonquoteChars = countStarting(nonquotePredicate, restSlice);
      eatChars(nonquoteChars);
      const nextChar = restSlice.charCodeAt(0);
      if (isNaN(nextChar)) {
        return {
          kind: "error",
          tokenKind: 4 /* STRING */,
          errors: [
            {
              relativeSpan: { start: 0, end: eatenChars },
              detail: "Unexpected EOF",
              category: "Lexer" /* LEXER */,
              hints: []
            }
          ]
        };
      } else if (isStringLiteralEscapeChar(nextChar)) {
        eatChars(1, false);
        const escapeResult = resolveStringLiteralEscape(restSlice);
        if (escapeResult === void 0) {
          return {
            kind: "error",
            tokenKind: 4 /* STRING */,
            errors: [
              {
                relativeSpan: { start: 0, end: eatenChars + 1 },
                detail: "Invalid escape sequence",
                category: "Lexer" /* LEXER */,
                hints: []
              }
            ]
          };
        }
        eatChars(escapeResult.length, escapeResult.value);
      } else if (nextChar === firstChar) {
        const quoteChars = countStarting(
          (char) => char === firstChar,
          restSlice
        );
        if (quoteChars >= startingQuoteChars) {
          eatenChars += startingQuoteChars;
          break;
        }
        eatChars(quoteChars);
      } else {
        throw "Invalid lexer state. This in an error in the lexer.";
      }
    }
    if (startingQuoteChars === 3) {
      resultString = transformBlockStringValue(resultString);
    }
    return {
      kind: "match",
      data: {
        kind: 4 /* STRING */,
        string: resultString
      },
      relativeSpan: { start: 0, end: eatenChars }
    };
  }

  // src/parser/lexer/sublexer/default/number.ts
  function tryParseNumberLiteral(slice) {
    let prefixLength = 0;
    let numberLength = 0;
    let isNegative = false;
    {
      if (slice.startsWith("-")) {
        isNegative = true;
        prefixLength = 1;
      } else if (slice.startsWith("+")) {
        prefixLength = 1;
      }
    }
    const prefixSlice = slice.slice(prefixLength);
    const keywordLiteralBase = tryKeywordLiteral(
      prefixSlice,
      "0x",
      16,
      isAny
    ) ?? tryKeywordLiteral(prefixSlice, "0b", 2, isAny) ?? tryKeywordLiteral(prefixSlice, "0o", 8, isAny) ?? {
      value: 10,
      length: 0
    };
    prefixLength += keywordLiteralBase.length;
    const numberSlice = slice.slice(prefixLength);
    const startingNumbers = countStartingNumbersRadix(
      numberSlice,
      keywordLiteralBase.value
    );
    if (startingNumbers === 0) {
      if (prefixLength !== 0) {
        return {
          kind: "error",
          tokenKind: 3 /* LITERAL */,
          errors: [
            {
              detail: "Expected a number following a sign or an integer base prefix",
              category: "Lexer" /* LEXER */,
              relativeSpan: { start: 0, end: prefixLength + 1 },
              hints: []
            }
          ]
        };
      } else {
        return { kind: "nomatch", tokenKind: 3 /* LITERAL */ };
      }
    }
    numberLength += startingNumbers;
    let isFloat = false;
    if (keywordLiteralBase.value === 10) {
      const afterNumberSlice = numberSlice.slice(startingNumbers);
      if (isDecimalSeparator(afterNumberSlice.charCodeAt(0))) {
        numberLength += 1 + countStartingNumbers(afterNumberSlice.slice(1));
        isFloat = true;
      }
    }
    const digitsStringSlice = slice.slice(
      prefixLength,
      prefixLength + numberLength
    );
    let numberValue;
    if (isFloat) {
      numberValue = parseFloat(digitsStringSlice);
    } else {
      numberValue = parseInt(digitsStringSlice, keywordLiteralBase.value);
    }
    if (isNaN(numberValue)) {
      throw "Invalid lexer state. This in an error in the lexer.";
    }
    if (isNegative) {
      numberValue = -numberValue;
    }
    return {
      kind: "match",
      data: {
        kind: 3 /* LITERAL */,
        literal: numberValue
      },
      relativeSpan: {
        start: 0,
        end: prefixLength + numberLength
      }
    };
  }

  // src/parser/lexer/sublexer/default/glue.ts
  function chainTokenParsers(slice, firstParser, ...parsers) {
    let result = firstParser(slice);
    for (let i = 0; i < parsers.length && result.kind === "nomatch"; i += 1) {
      result = parsers[i](slice);
    }
    return result;
  }
  function tryParseLiteral(slice) {
    return chainTokenParsers(
      slice,
      tryParseBooleanLiteral,
      tryParseNumberLiteral
    );
  }
  function tryParseNewline(slice) {
    if (isNewline(slice.charCodeAt(0))) {
      return {
        kind: "match",
        data: { kind: 7 /* NEWLINE */ },
        relativeSpan: { start: 0, end: 1 }
      };
    } else {
      return {
        kind: "nomatch",
        tokenKind: 7 /* NEWLINE */
      };
    }
  }
  function tryParseDefault(slice) {
    return chainTokenParsers(
      slice,
      tryParseNewline,
      tryParseSeparator,
      tryParseOperator,
      tryParseLiteral,
      tryParseStringLiteral,
      tryParseIdentifier,
      tryParseComment
    );
  }

  // src/parser/lexer/lexer.ts
  var DEFAULT_TOKEN_KIND_FILTER = {
    [6 /* COMMENT */]: true,
    [7 /* NEWLINE */]: true,
    [5 /* IDENTIFIER */]: false,
    [3 /* LITERAL */]: false,
    [2 /* OPERATOR */]: false,
    [1 /* SEPARATOR */]: false,
    [4 /* STRING */]: false,
    [8 /* JESSIE_SCRIPT */]: false,
    [0 /* UNKNOWN */]: false
  };
  var Lexer = class {
    constructor(source, tokenKindFilter) {
      this.source = source;
      this.sublexers = {
        [0 /* DEFAULT */]: tryParseDefault
      };
      this.currentToken = new LexerToken(
        {
          kind: 1 /* SEPARATOR */,
          separator: "SOF"
        },
        {
          start: {
            line: 1,
            column: 1,
            charIndex: 0
          },
          end: {
            line: 1,
            column: 1,
            charIndex: 0
          }
        }
      );
      this.tokenKindFilter = tokenKindFilter ?? DEFAULT_TOKEN_KIND_FILTER;
    }
    sublexers;
    /** Last emitted token. */
    currentToken;
    /** Stores whether the SOF and EOF were yielded. */
    fileSeparatorYielded = false;
    /** Token kinds to filter from the stream. */
    tokenKindFilter;
    /** Advances the lexer returning the current token. */
    advance(context) {
      if (this.currentToken.isEOF()) {
        this.fileSeparatorYielded = true;
        return this.currentToken;
      }
      if (this.currentToken.isSOF() && !this.fileSeparatorYielded) {
        this.fileSeparatorYielded = true;
        return this.currentToken;
      }
      this.currentToken = this.lookahead(context);
      this.fileSeparatorYielded = false;
      return this.currentToken;
    }
    /** Returns the next token without advancing the lexer. */
    lookahead(context) {
      if (this.currentToken.isEOF()) {
        return this.currentToken;
      }
      let nextToken = this.readNextToken(this.currentToken, context);
      while (this.tokenKindFilter[nextToken.data.kind]) {
        if (nextToken.isEOF()) {
          break;
        }
        nextToken = this.readNextToken(nextToken, context);
      }
      return nextToken;
    }
    next(context) {
      const tok = this.advance(context);
      if (tok.isEOF() && this.fileSeparatorYielded) {
        return {
          done: true,
          value: void 0
        };
      }
      return {
        done: false,
        value: tok
      };
    }
    return(value) {
      return {
        done: true,
        value
      };
    }
    throw(e) {
      throw e;
    }
    [Symbol.iterator]() {
      return this;
    }
    peek(context) {
      const tok = this.lookahead(context);
      if (tok.isEOF() && this.currentToken.isEOF()) {
        return {
          done: true,
          value: void 0
        };
      }
      return {
        done: false,
        value: tok
      };
    }
    /** Saves the lexer state to be restored later. */
    save() {
      return [this.currentToken, this.fileSeparatorYielded];
    }
    /**
     * Roll back the state of the lexer to the given saved state.
     *
     * The lexer will continue from this state forward.
     */
    rollback(state) {
      this.currentToken = state[0];
      this.fileSeparatorYielded = state[1];
    }
    /**
     * Compute start location of the token following `lastToken`.
     */
    computeNextTokenStartLocation(lastToken) {
      const whitespaceAfterLast = countStarting(
        (ch) => !isNewline(ch) && isWhitespace(ch),
        this.source.body.slice(lastToken.location.end.charIndex)
      );
      return {
        line: lastToken.location.end.line,
        column: lastToken.location.end.column + whitespaceAfterLast,
        charIndex: lastToken.location.end.charIndex + whitespaceAfterLast
      };
    }
    /** Reads the next token following the `afterPosition`. */
    readNextToken(lastToken, context) {
      const startLocation = this.computeNextTokenStartLocation(lastToken);
      const slice = this.source.body.slice(startLocation.charIndex);
      let tokenParseResult;
      if (context === void 0) {
        context = { type: 0 /* DEFAULT */ };
      }
      switch (context.type) {
        case 0 /* DEFAULT */:
          tokenParseResult = this.sublexers[0 /* DEFAULT */](slice);
          break;
      }
      if (tokenParseResult.kind === "nomatch") {
        const tokenLocationSpan = {
          start: startLocation,
          end: {
            line: startLocation.line,
            column: startLocation.column + 1,
            charIndex: startLocation.charIndex + 1
          }
        };
        const error = new SyntaxError(
          this.source,
          tokenLocationSpan,
          "Lexer" /* LEXER */,
          "Could not match any token"
        );
        return new LexerToken(
          {
            kind: 0 /* UNKNOWN */,
            error
          },
          tokenLocationSpan
        );
      }
      if (tokenParseResult.kind === "error") {
        let category;
        let detail;
        let hints;
        let relativeSpan;
        if (tokenParseResult.errors.length === 1) {
          const error2 = tokenParseResult.errors[0];
          category = error2.category;
          detail = error2.detail;
          hints = error2.hints;
          relativeSpan = error2.relativeSpan;
        } else {
          category = tokenParseResult.errors.map((e) => e.category).reduce((acc, curr) => {
            if (acc === curr) {
              return acc;
            } else {
              return "Lexer" /* LEXER */;
            }
          });
          detail = tokenParseResult.errors.map((err3) => err3.detail ?? "").join("; ");
          hints = tokenParseResult.errors.flatMap((err3) => err3.hints);
          relativeSpan = tokenParseResult.errors.map((err3) => err3.relativeSpan).reduce((acc, curr) => {
            return {
              start: Math.min(acc.start, curr.start),
              end: Math.max(acc.end, curr.end)
            };
          });
        }
        const tokenLocation = {
          start: startLocation,
          end: computeEndLocation(
            this.source.body.slice(
              startLocation.charIndex,
              startLocation.charIndex + relativeSpan.end
            ),
            startLocation
          )
        };
        const errorLocation = {
          start: computeEndLocation(
            this.source.body.slice(
              tokenLocation.start.charIndex,
              tokenLocation.start.charIndex + relativeSpan.start
            ),
            tokenLocation.start
          ),
          end: computeEndLocation(
            this.source.body.slice(
              tokenLocation.start.charIndex,
              tokenLocation.start.charIndex + relativeSpan.end
            ),
            tokenLocation.start
          )
        };
        const error = new SyntaxError(
          this.source,
          errorLocation,
          category,
          detail,
          hints
        );
        return new LexerToken(
          {
            kind: 0 /* UNKNOWN */,
            error
          },
          tokenLocation
        );
      }
      const parsedTokenLocation = {
        start: computeEndLocation(
          this.source.body.slice(
            startLocation.charIndex,
            startLocation.charIndex + tokenParseResult.relativeSpan.start
          ),
          startLocation
        ),
        end: computeEndLocation(
          this.source.body.slice(
            startLocation.charIndex,
            startLocation.charIndex + tokenParseResult.relativeSpan.end
          ),
          startLocation
        )
      };
      return new LexerToken(tokenParseResult.data, parsedTokenLocation);
    }
  };

  // src/parser/syntax/rules/profile/index.ts
  var profile_exports = {};
  __export(profile_exports, {
    COMLINK_LIST_LITERAL: () => COMLINK_LIST_LITERAL,
    COMLINK_LITERAL: () => COMLINK_LITERAL,
    COMLINK_NONE_LITERAL: () => COMLINK_NONE_LITERAL,
    COMLINK_OBJECT_LITERAL: () => COMLINK_OBJECT_LITERAL,
    COMLINK_OBJECT_LITERAL_ASSIGNMENT: () => COMLINK_OBJECT_LITERAL_ASSIGNMENT,
    COMLINK_PRIMITIVE_LITERAL: () => COMLINK_PRIMITIVE_LITERAL,
    ENUM_DEFINITION: () => ENUM_DEFINITION,
    ENUM_VALUE: () => ENUM_VALUE,
    FIELD_DEFINITION: () => FIELD_DEFINITION,
    LIST_DEFINITION: () => LIST_DEFINITION,
    MODEL_TYPE_NAME: () => MODEL_TYPE_NAME,
    NAMED_FIELD_DEFINITION: () => NAMED_FIELD_DEFINITION,
    NAMED_MODEL_DEFINITION: () => NAMED_MODEL_DEFINITION,
    OBJECT_DEFINITION: () => OBJECT_DEFINITION,
    PRIMITIVE_TYPE_NAME: () => PRIMITIVE_TYPE_NAME,
    PROFILE_DOCUMENT: () => PROFILE_DOCUMENT,
    PROFILE_DOCUMENT_DEFINITION: () => PROFILE_DOCUMENT_DEFINITION,
    PROFILE_HEADER: () => PROFILE_HEADER,
    TYPE: () => TYPE,
    USECASE_DEFINITION: () => USECASE_DEFINITION
  });

  // src/ast/split.ts
  function splitLimit(str, delimiter, maxSplits) {
    const result = [];
    let current = str;
    while (result.length < maxSplits) {
      const i = current.indexOf(delimiter);
      if (i === -1) {
        break;
      }
      result.push(current.slice(0, i));
      current = current.slice(i + 1);
    }
    result.push(current);
    return result;
  }

  // src/ast/utils.ts
  var IDENTIFIER_RE = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
  var IDENTIFIER_RE_SOURCE = IDENTIFIER_RE.source;
  var DOCUMENT_NAME_RE = /^[a-z][a-z0-9_-]*$/;
  var DOCUMENT_NAME_RE_SOURCE = DOCUMENT_NAME_RE.source;
  var VERSION_NUMBER_RE = /^[0-9]+$/;
  function isValidDocumentName(input) {
    return DOCUMENT_NAME_RE.test(input);
  }
  function parseVersionNumber(str) {
    const value = str.trim();
    if (!VERSION_NUMBER_RE.test(value)) {
      throw new Error(`Unable to parse version string "${str}"`);
    }
    return parseInt(value, 10);
  }

  // src/parser/common/document/version.ts
  var VersionRange = class {
    constructor(major, minor, patch, label) {
      this.major = major;
      this.minor = minor;
      this.patch = patch;
      this.label = label;
    }
    static fromString(input) {
      const [restVersion, label] = splitLimit(input, "-", 1);
      const [majorStr, minorStr, patchStr] = splitLimit(restVersion, ".", 2);
      let minor, patch = void 0;
      if (majorStr === void 0 || majorStr === "") {
        throw new Error(
          `Invalid version range: ${input} - major component: ${majorStr} is not a valid number`
        );
      }
      const major = tryParseVersionNumber(majorStr);
      if (major === void 0) {
        throw new Error(
          `Invalid version range: ${input} - major component: ${majorStr} is not a valid number`
        );
      }
      if (minorStr) {
        minor = tryParseVersionNumber(minorStr);
        if (minor === void 0) {
          throw new Error(
            `Invalid version range: ${input} - minor component: ${minorStr} is not a valid number`
          );
        }
      }
      if (patchStr) {
        patch = tryParseVersionNumber(patchStr);
        if (patch === void 0) {
          throw new Error(
            `Invalid version range: ${input} - patch component: ${patchStr} is not a valid number`
          );
        }
      }
      return new VersionRange(major, minor, patch, label);
    }
    static fromParameters(params) {
      if (params.patch !== void 0 && params.minor === void 0) {
        throw new Error(
          "Invalid Version Range - patch version cannot appear without minor version"
        );
      }
      return new VersionRange(
        params.major,
        params.minor,
        params.patch,
        params.label
      );
    }
    toString() {
      let str = this.major.toString();
      str += this.minor !== void 0 ? `.${this.minor}` : "";
      str += this.patch !== void 0 ? `.${this.patch}` : "";
      return this.label ? `${str}-${this.label}` : str;
    }
  };

  // src/parser/common/document/parser.ts
  function tryParseVersionNumber(str) {
    try {
      return parseVersionNumber(str);
    } catch (error) {
      return void 0;
    }
  }
  function parseDocumentId(id) {
    let scope;
    const [splitScope, scopeRestId] = splitLimit(id, "/", 1);
    if (scopeRestId !== void 0) {
      scope = splitScope;
      if (!isValidDocumentName(scope)) {
        return {
          kind: "error",
          message: `${scope} is not a valid lowercase identifier`
        };
      }
      id = scopeRestId;
    }
    let parsedVersion;
    const [versionRestId, splitVersion] = splitLimit(id, "@", 1);
    if (splitVersion !== void 0) {
      try {
        parsedVersion = VersionRange.fromString(splitVersion);
      } catch (error) {
        return {
          kind: "error",
          message: `${splitVersion} is not a valid version`
        };
      }
      id = versionRestId;
    }
    const version = parsedVersion;
    const middle = id.split(".");
    for (const m of middle) {
      if (!isValidDocumentName(m)) {
        return {
          kind: "error",
          message: `"${m}" is not a valid lowercase identifier`
        };
      }
    }
    return {
      kind: "parsed",
      value: {
        scope,
        middle,
        version
      }
    };
  }
  function parseRevisionLabel(label) {
    let value = label.trim();
    if (!value.startsWith("rev")) {
      return {
        kind: "error",
        message: "revision label must be in format `revN`"
      };
    }
    value = value.slice(3);
    const revision = tryParseVersionNumber(value);
    if (revision === void 0) {
      return {
        kind: "error",
        message: "revision label must be in format `revN` where N is a non-negative integer"
      };
    }
    return {
      kind: "parsed",
      value: revision
    };
  }

  // src/parser/common/document/profile.ts
  var ProfileVersion = class {
    constructor(major, minor, patch, label) {
      this.major = major;
      this.minor = minor;
      this.patch = patch;
      this.label = label;
    }
    static fromVersionRange(input) {
      if (input.minor === void 0) {
        throw new Error(
          `Invalid profile version: ${input.toString()} - minor version is required`
        );
      }
      if (input.patch === void 0) {
        throw new Error(
          `Invalid profile version: ${input.toString()} - patch version is required`
        );
      }
      return new ProfileVersion(
        input.major,
        input.minor,
        input.patch,
        input.label
      );
    }
    static fromString(input) {
      const [restVersion, label] = splitLimit(input, "-", 1);
      const [majorStr, minorStr, patchStr] = splitLimit(restVersion, ".", 2);
      const major = tryParseVersionNumber(majorStr);
      if (major === void 0) {
        throw new Error(
          `Invalid profile version: ${input} - major component: ${majorStr} is not a valid number`
        );
      }
      const minor = tryParseVersionNumber(minorStr);
      if (minor === void 0) {
        throw new Error(
          `Invalid profile version: ${input} - minor component: ${minorStr} is not a valid number`
        );
      }
      const patch = tryParseVersionNumber(patchStr);
      if (patch === void 0) {
        throw new Error(
          `Invalid profile version: ${input} - patch component: ${patchStr} is not a valid number`
        );
      }
      return new ProfileVersion(major, minor, patch, label);
    }
    static fromParameters(params) {
      return new ProfileVersion(
        params.major,
        params.minor,
        params.patch,
        params.label
      );
    }
    toString() {
      const str = `${this.major}.${this.minor}.${this.patch}`;
      return this.label ? `${str}-${this.label}` : str;
    }
  };
  var DEFAULT_PROFILE_VERSION = ProfileVersion.fromParameters({
    major: 1,
    minor: 0,
    patch: 0
  });

  // src/parser/common/document/map.ts
  var MapVersion = class {
    constructor(major, minor, revision) {
      this.major = major;
      this.minor = minor;
      this.revision = revision;
    }
    static fromVersionRange(input) {
      if (input.minor === void 0) {
        throw new Error(
          `Invalid map version: ${input.toString()} - minor version is required`
        );
      }
      let revision = void 0;
      if (input.label) {
        const parseResult = parseRevisionLabel(input.label);
        if (parseResult.kind === "error") {
          throw new Error(
            `Invalid map version: ${input.toString()} - revision has error: ${parseResult.message}`
          );
        }
        revision = parseResult.value;
      }
      return new MapVersion(input.major, input.minor, revision);
    }
    static fromString(input) {
      const [restVersion, label] = splitLimit(input, "-", 1);
      const [majorStr, minorStr] = splitLimit(restVersion, ".", 1);
      const major = tryParseVersionNumber(majorStr);
      if (major === void 0) {
        throw new Error(
          `Invalid map version: ${input} - major component: ${majorStr} is not a valid number`
        );
      }
      const minor = tryParseVersionNumber(minorStr);
      if (minor === void 0) {
        throw new Error(
          `Invalid map version: ${input} - minor component: ${minorStr} is not a valid number`
        );
      }
      let revision = void 0;
      if (label) {
        const parseResult = parseRevisionLabel(label);
        if (parseResult.kind === "error") {
          throw new Error(
            `Invalid map version: ${input.toString()} - revision has error: ${parseResult.message}`
          );
        }
        revision = parseResult.value;
      }
      return new MapVersion(major, minor, revision);
    }
    static fromParameters(params) {
      return new MapVersion(params.major, params.minor, params.revision);
    }
    toString() {
      const str = `${this.major}.${this.minor}`;
      return this.revision !== void 0 ? `${str}-rev${this.revision}` : str;
    }
  };
  var DEFAULT_MAP_VERSION = MapVersion.fromParameters({
    major: 1,
    minor: 0
  });

  // src/parser/metadata.ts
  var PARSED_VERSION = { major: 0, minor: 1, patch: 0 };
  var PARSED_AST_VERSION = { major: 0, minor: 1, patch: 0 };

  // src/parser/syntax/rule.ts
  var MatchAttempts = class {
    constructor(token, rules) {
      this.token = token;
      this.rules = rules;
    }
    static merge(first, second) {
      if (first === void 0) {
        return second;
      }
      return first.merge(second);
    }
    /** Merges two rule attempts according to the furthest token heuristic. */
    merge(other) {
      if (other === void 0) {
        return this;
      }
      if (this.token === void 0 && other.token === void 0) {
        return new MatchAttempts(this.token, [...this.rules, ...other.rules]);
      }
      if (this.token === void 0) {
        return this;
      } else if (other.token === void 0) {
        return other;
      }
      const thisLocation = this.token.data.kind === 0 /* UNKNOWN */ ? this.token.data.error.location : this.token.location;
      const otherLocation = other.token.data.kind === 0 /* UNKNOWN */ ? other.token.data.error.location : other.token.location;
      if (thisLocation.start.charIndex === otherLocation.start.charIndex) {
        return new MatchAttempts(this.token, [...this.rules, ...other.rules]);
      }
      if (thisLocation.start.charIndex > otherLocation.start.charIndex) {
        return this;
      } else {
        return other;
      }
    }
  };
  var ruleFmtDeeper = (options, by) => {
    return {
      depth: options.depth + (by ?? 1),
      indent: options.indent,
      newline: options.newline
    };
  };
  var ruleFmtFunclike = (options, ...innerFns) => {
    if (innerFns.length === 0) {
      return "()";
    }
    if (innerFns.length === 1) {
      return "(" + innerFns[0](options) + ")";
    }
    const before = "(" + options.newline;
    const after = options.indent.repeat(options.depth) + ")";
    const deeper = ruleFmtDeeper(options);
    let middle = "";
    for (let i = 0; i < innerFns.length; i += 1) {
      const comma = i < innerFns.length - 1 ? "," : "";
      middle += deeper.indent.repeat(deeper.depth) + innerFns[i](deeper) + comma + deeper.newline;
    }
    return before + middle + after;
  };
  var SyntaxRule = class {
    simpleTryMatchBoilerplate(tokens, predicate, context) {
      const save = tokens.save();
      const next = tokens.next(context);
      if (next.done === false) {
        const token = next.value;
        const match = predicate(token);
        if (match !== void 0) {
          return {
            kind: "match",
            match
          };
        }
      }
      tokens.rollback(save);
      return {
        kind: "nomatch",
        attempts: new MatchAttempts(next.value, [this])
      };
    }
    [Symbol.toStringTag]() {
      return this.toStringFmt({ depth: 0, indent: "  ", newline: "\n" });
    }
    toString() {
      return this[Symbol.toStringTag]();
    }
    // Factory methods for basic rules
    static separator(separator) {
      return new SyntaxRuleSeparator(separator);
    }
    static operator(operator) {
      return new SyntaxRuleOperator(operator);
    }
    static identifier(identifier) {
      return new SyntaxRuleIdentifier(identifier);
    }
    static literal() {
      return new SyntaxRuleLiteral();
    }
    static string() {
      return new SyntaxRuleString();
    }
    static newline() {
      return new SyntaxRuleNewline();
    }
    // Combinators
    static or(...rules) {
      return new SyntaxRuleOr(...rules);
    }
    static followedBy(...rules) {
      return new SyntaxRuleFollowedBy(...rules);
    }
    or(rule) {
      return new SyntaxRuleOr(this, rule);
    }
    followedBy(rule) {
      return new SyntaxRuleFollowedBy(this, rule);
    }
    // Cannot return `SyntaxRuleMap` because that would confuse TS into thinking `SyntaxRule` is contravariant over `T`
    map(mapper) {
      return new SyntaxRuleMap(this, mapper);
    }
    andThen(then, description) {
      return new SyntaxRuleAndThen(this, then, description);
    }
    /** Ensures that `this` is followed by `rule` without consuming any tokens after `this`. */
    lookahead(rule) {
      return new SyntaxRuleFollowedBy(this, new SyntaxRuleLookahead(rule)).map(
        ([me, _lookahead]) => me
      );
    }
    /** Skips `rule` following `this` without affecting the returned type. */
    skip(rule) {
      return new SyntaxRuleFollowedBy(this, rule).map(([me, _skipped]) => me);
    }
    /** Forgets `this` and expects `rule` to follow. */
    forgetFollowedBy(rule) {
      return new SyntaxRuleFollowedBy(this, rule).map(([_me, newres]) => newres);
    }
    static repeat(rule) {
      return new SyntaxRuleRepeat(rule);
    }
    static optional(rule) {
      return new SyntaxRuleOptional(rule);
    }
    static optionalRepeat(rule) {
      return new SyntaxRuleOptional(new SyntaxRuleRepeat(rule));
    }
    /**
     * Returns `rule` that cannot be preceded by a newline.
     * Example usage: `SyntaxRule.identifier('slot').followedBy(SyntaxRule.sameLine(SyntaxRule.string()))`
     */
    static sameLine(rule) {
      return new SyntaxRuleFollowedBy(
        // This behavior is special, because `SyntaxRuleNewline` changes the token filter in the `tokens` stream
        // otherwise this construct would not be of much use
        new SyntaxRuleLookahead(SyntaxRule.newline(), true),
        rule
      ).map(([_, r]) => r);
    }
  };
  var SyntaxRuleSeparator = class extends SyntaxRule {
    constructor(separator) {
      super();
      this.separator = separator;
    }
    tryMatch(tokens) {
      return this.simpleTryMatchBoilerplate(tokens, (token) => {
        if (token.data.kind === 1 /* SEPARATOR */) {
          if (this.separator === void 0 || token.data.separator === this.separator) {
            return {
              data: token.data,
              location: token.location
            };
          }
        }
        return void 0;
      });
    }
    toStringFmt(_options) {
      if (this.separator !== void 0) {
        return "`" + this.separator + "`";
      }
      return formatTokenKind(1 /* SEPARATOR */);
    }
  };
  var SyntaxRuleOperator = class extends SyntaxRule {
    constructor(operator) {
      super();
      this.operator = operator;
    }
    tryMatch(tokens) {
      return this.simpleTryMatchBoilerplate(tokens, (token) => {
        if (token.data.kind === 2 /* OPERATOR */) {
          if (this.operator === void 0 || token.data.operator === this.operator) {
            return {
              data: token.data,
              location: token.location
            };
          }
        }
        return void 0;
      });
    }
    toStringFmt(_options) {
      if (this.operator !== void 0) {
        return "`" + this.operator + "`";
      }
      return formatTokenKind(2 /* OPERATOR */);
    }
  };
  var SyntaxRuleIdentifier = class extends SyntaxRule {
    constructor(identifier) {
      super();
      this.identifier = identifier;
    }
    tryMatch(tokens) {
      return this.simpleTryMatchBoilerplate(tokens, (token) => {
        if (token.data.kind === 5 /* IDENTIFIER */) {
          if (this.identifier === void 0 || token.data.identifier === this.identifier) {
            return {
              data: token.data,
              location: token.location
            };
          }
        }
        return void 0;
      });
    }
    toStringFmt(_options) {
      if (this.identifier !== void 0) {
        return "`" + this.identifier + "`";
      }
      return formatTokenKind(5 /* IDENTIFIER */);
    }
  };
  var SyntaxRuleLiteral = class extends SyntaxRule {
    tryMatch(tokens) {
      return this.simpleTryMatchBoilerplate(tokens, (token) => {
        if (token.data.kind === 3 /* LITERAL */) {
          return {
            data: token.data,
            location: token.location
          };
        }
        return void 0;
      });
    }
    toStringFmt(_options) {
      return formatTokenKind(3 /* LITERAL */);
    }
  };
  var SyntaxRuleString = class extends SyntaxRule {
    tryMatch(tokens) {
      return this.simpleTryMatchBoilerplate(tokens, (token) => {
        if (token.data.kind === 4 /* STRING */) {
          return {
            data: token.data,
            location: token.location
          };
        }
        return void 0;
      });
    }
    toStringFmt(_options) {
      return formatTokenKind(4 /* STRING */);
    }
  };
  var SyntaxRuleNewline = class extends SyntaxRule {
    tryMatch(tokens) {
      const originalFilter = tokens.tokenKindFilter[7 /* NEWLINE */];
      tokens.tokenKindFilter[7 /* NEWLINE */] = false;
      const result = this.simpleTryMatchBoilerplate(tokens, (token) => {
        if (token.data.kind === 7 /* NEWLINE */) {
          return {
            data: token.data,
            location: token.location
          };
        }
        return void 0;
      });
      tokens.tokenKindFilter[7 /* NEWLINE */] = originalFilter;
      return result;
    }
    toStringFmt(_options) {
      return formatTokenKind(7 /* NEWLINE */);
    }
  };
  var SyntaxRuleOr = class extends SyntaxRule {
    rules;
    constructor(...rules) {
      super();
      this.rules = rules;
    }
    tryMatch(tokens) {
      let attempts = void 0;
      for (const rule of this.rules) {
        const match = rule.tryMatch(tokens);
        if (match.kind === "match") {
          return {
            kind: "match",
            // typescript fails us with understand here that the type is correct
            match: match.match,
            optionalAttempts: MatchAttempts.merge(
              attempts,
              match.optionalAttempts
            )
          };
        } else {
          attempts = MatchAttempts.merge(attempts, match.attempts);
        }
      }
      if (attempts === void 0) {
        return {
          kind: "nomatch",
          attempts: new MatchAttempts(tokens.peek().value, [this])
        };
      } else {
        return {
          kind: "nomatch",
          attempts
        };
      }
    }
    toStringFmt(options) {
      return "Or" + ruleFmtFunclike(
        options,
        ...this.rules.map(
          (r) => (deeper) => r.toStringFmt(deeper)
        )
      );
    }
  };
  var SyntaxRuleFollowedBy = class extends SyntaxRule {
    rules;
    constructor(...rules) {
      super();
      this.rules = rules;
    }
    tryMatch(tokens) {
      const save = tokens.save();
      let optionalAttempts = void 0;
      const matches = [];
      for (const rule of this.rules) {
        const match = rule.tryMatch(tokens);
        if (match.kind === "nomatch") {
          tokens.rollback(save);
          return {
            ...match,
            attempts: MatchAttempts.merge(optionalAttempts, match.attempts)
          };
        } else {
          optionalAttempts = MatchAttempts.merge(
            optionalAttempts,
            match.optionalAttempts
          );
          matches.push(match.match);
        }
      }
      return {
        kind: "match",
        // we force the type here because typescript cannot check it for us
        // the value of `matches` is a collection of matches of all `this.rules` in order - i.e. `F`.
        match: matches,
        optionalAttempts
      };
    }
    toStringFmt(options) {
      return "FollowedBy" + ruleFmtFunclike(
        options,
        ...this.rules.map(
          (r) => (deeper) => r.toStringFmt(deeper)
        )
      );
    }
  };
  var SyntaxRuleRepeat = class extends SyntaxRule {
    constructor(rule) {
      super();
      this.rule = rule;
    }
    tryMatch(tokens) {
      const matches = [];
      let lastMatch;
      let lastResult;
      for (; ; ) {
        lastResult = this.rule.tryMatch(tokens);
        if (lastResult.kind === "match") {
          lastMatch = lastResult;
          matches.push(lastMatch.match);
        } else {
          break;
        }
      }
      if (matches.length > 0) {
        return {
          kind: "match",
          match: matches,
          optionalAttempts: lastResult.attempts.merge(
            lastMatch?.optionalAttempts
          )
        };
      }
      return lastResult;
    }
    toStringFmt(options) {
      return "Repeat" + ruleFmtFunclike(options, (deeper) => this.rule.toStringFmt(deeper));
    }
  };
  var SyntaxRuleOptional = class extends SyntaxRule {
    constructor(rule) {
      super();
      this.rule = rule;
    }
    tryMatch(tokens) {
      const match = this.rule.tryMatch(tokens);
      if (match.kind === "match") {
        return match;
      }
      return {
        kind: "match",
        match: void 0,
        optionalAttempts: match.attempts
      };
    }
    toStringFmt(options) {
      return "Optional" + ruleFmtFunclike(options, (deeper) => this.rule.toStringFmt(deeper));
    }
  };
  var SyntaxRuleLookahead = class extends SyntaxRule {
    constructor(rule, invert) {
      super();
      this.rule = rule;
      this.invert = invert ?? false;
    }
    /**
     * Invert the lookahead, matching if the inner rule fails.
     */
    invert;
    tryMatch(tokens) {
      const save = tokens.save();
      const result = this.rule.tryMatch(tokens);
      tokens.rollback(save);
      if (this.invert) {
        if (result.kind === "nomatch") {
          return {
            kind: "match",
            match: void 0
          };
        } else {
          return {
            kind: "nomatch",
            attempts: new MatchAttempts(tokens.peek().value, [this])
          };
        }
      }
      if (result.kind === "match") {
        return {
          ...result,
          match: void 0
        };
      }
      return result;
    }
    toStringFmt(options) {
      const prefix = this.invert ? "LookaheadNot" : "Lookahead";
      return prefix + ruleFmtFunclike(options, (deeper) => this.rule.toStringFmt(deeper));
    }
  };
  var SyntaxRuleMap = class extends SyntaxRule {
    constructor(rule, mapper) {
      super();
      this.rule = rule;
      this.mapper = mapper;
    }
    tryMatch(tokens) {
      const match = this.rule.tryMatch(tokens);
      if (match.kind === "match") {
        return {
          ...match,
          match: this.mapper(match.match)
        };
      }
      return match;
    }
    toStringFmt(options) {
      return this.rule.toStringFmt(options) + ".map()";
    }
  };
  var SyntaxRuleAndThen = class extends SyntaxRule {
    constructor(rule, then, description) {
      super();
      this.rule = rule;
      this.then = then;
      this.description = description;
    }
    tryMatch(tokens) {
      const peek = tokens.peek().value;
      const match = this.rule.tryMatch(tokens);
      if (match.kind === "match") {
        const then = this.then(match.match);
        if (then.kind == "match") {
          return {
            kind: "match",
            match: then.value,
            optionalAttempts: match.optionalAttempts
          };
        } else {
          return {
            kind: "nomatch",
            attempts: new MatchAttempts(peek, [this]).merge(
              match.optionalAttempts
            )
          };
        }
      }
      return match;
    }
    toStringFmt(options) {
      return this.description ?? this.rule.toStringFmt(options);
    }
  };
  var SyntaxRuleMutable = class extends SyntaxRule {
    constructor(rule) {
      super();
      this.rule = rule;
    }
    tryMatch(tokens) {
      if (this.rule === void 0) {
        throw "This method should never be called before the mutable rule is initialized. This is an error in syntax rules definition.";
      }
      return this.rule.tryMatch(tokens);
    }
    toStringFmt(_options) {
      if (this.rule === void 0) {
        return "<Missing Mutable Rule>";
      }
      return "<Mutable Rule>";
    }
  };

  // src/parser/syntax/util.ts
  var ArrayLexerStream = class {
    constructor(array) {
      this.array = array;
      this.index = 0;
      this.tokenKindFilter = DEFAULT_TOKEN_KIND_FILTER;
      this.source = new Source(
        array.map((token) => token.toStringDebug()).join("\n")
      );
    }
    index;
    tokenKindFilter;
    source;
    next(context) {
      if (this.index >= this.array.length) {
        return {
          done: true,
          value: void 0
        };
      }
      const token = this.array[this.index];
      let result = {
        done: false,
        value: token
      };
      this.index += 1;
      if (this.tokenKindFilter[token.data.kind]) {
        result = this.next(context);
      }
      return result;
    }
    peek(context) {
      const originalIndex = this.index;
      const result = this.next(context);
      this.index = originalIndex;
      return result;
    }
    save() {
      return this.index;
    }
    rollback(state) {
      this.index = state;
    }
    return(value) {
      return {
        done: true,
        value
      };
    }
    throw(e) {
      throw e;
    }
    [Symbol.iterator]() {
      return this;
    }
  };
  function extractDocumentation(input) {
    if (input === void 0) {
      return void 0;
    }
    const lines = input.split("\n");
    const firstNonemptyLineIndex = lines.findIndex((line) => line.trim() !== "");
    if (firstNonemptyLineIndex === -1) {
      return void 0;
    }
    const title = lines[firstNonemptyLineIndex].trim();
    const descriptionStart = lines.slice(0, firstNonemptyLineIndex + 1).reduce((acc, curr) => acc += curr.length, 0) + firstNonemptyLineIndex;
    const description = input.slice(descriptionStart).trim();
    if (description !== "") {
      return {
        title,
        description
      };
    } else {
      return {
        title
      };
    }
  }

  // src/parser/syntax/rules/common.ts
  function computeLocationSpan(...nodes) {
    const first = nodes.find((node) => node !== void 0)?.location;
    const last = nodes.reverse().find((node) => node !== void 0)?.location;
    if (first === void 0 || last === void 0) {
      return void 0;
    }
    return {
      start: {
        line: first.start.line,
        column: first.start.column,
        charIndex: first.start.charIndex
      },
      end: {
        line: last.end.line,
        column: last.end.column,
        charIndex: last.end.charIndex
      }
    };
  }
  function documentedNode(rule) {
    return SyntaxRule.followedBy(
      SyntaxRule.optional(SyntaxRule.string()),
      rule
    ).map(([maybeDoc, result]) => {
      const doc = extractDocumentation(maybeDoc?.data.string);
      if (maybeDoc !== void 0 && doc !== void 0) {
        result.documentation = {
          title: doc.title,
          description: doc.description,
          location: maybeDoc.location
        };
      }
      return result;
    });
  }
  function mapAssignmentPath(path) {
    if (path.length === 0) {
      throw new Error(
        "Expected at least one element in the assignment path. This in an error in the rule definition."
      );
    }
    return path.map((p) => {
      if (p.data.kind === 4 /* STRING */) {
        return p.data.string;
      } else {
        return p.data.identifier;
      }
    });
  }
  var ASSIGNMENT_KEY = SyntaxRule.identifier().or(SyntaxRule.string());
  var ASSIGNMENT_PATH_KEY = SyntaxRule.followedBy(
    ASSIGNMENT_KEY,
    SyntaxRule.optionalRepeat(
      SyntaxRule.followedBy(SyntaxRule.operator("."), ASSIGNMENT_KEY)
    )
  ).map(
    ([first, maybeRest]) => {
      const result = [first];
      if (maybeRest !== void 0) {
        maybeRest.forEach(([_op, key]) => result.push(key));
      }
      return result;
    }
  );
  var TERMINATOR_TOKENS = {
    ")": SyntaxRule.separator(")"),
    "]": SyntaxRule.separator("]"),
    "}": SyntaxRule.separator("}"),
    ",": SyntaxRule.operator(","),
    ";": SyntaxRule.operator(";"),
    "\n": SyntaxRule.newline()
  };
  function TERMINATOR_TOKEN_FACTORY(...terminators) {
    const rules = terminators.map((ter) => TERMINATOR_TOKENS[ter]);
    return SyntaxRule.or(...rules);
  }
  function expectTerminated(rule, ...terminators) {
    return rule.lookahead(TERMINATOR_TOKEN_FACTORY(...terminators)).skip(
      SyntaxRule.optional(
        TERMINATOR_TOKEN_FACTORY(
          ...terminators.filter((ter) => ter === "," || ter === ";")
        )
      )
    );
  }
  var SyntaxRuleSourceChecksum = class extends SyntaxRule {
    tryMatch(tokens) {
      return {
        kind: "match",
        match: tokens.source.checksum()
      };
    }
    toStringFmt(_options) {
      return "<CHECKSUM>";
    }
  };

  // src/parser/syntax/rules/profile/literal.ts
  var COMLINK_PRIMITIVE_LITERAL = SyntaxRule.or(SyntaxRule.literal(), SyntaxRule.string()).map(
    (match) => {
      const value = match.data.kind === 3 /* LITERAL */ ? match.data.literal : match.data.string;
      return {
        kind: "ComlinkPrimitiveLiteral",
        value,
        location: match.location
      };
    }
  );
  var COMLINK_LITERAL_MUT = new SyntaxRuleMutable();
  var COMLINK_OBJECT_LITERAL_ASSIGNMENT = documentedNode(
    SyntaxRule.followedBy(
      ASSIGNMENT_PATH_KEY,
      SyntaxRule.operator("=").forgetFollowedBy(
        expectTerminated(COMLINK_LITERAL_MUT, ",", "\n", "}")
      )
    ).map(([path, value]) => {
      return {
        kind: "ComlinkAssignment",
        key: mapAssignmentPath(path),
        value,
        location: computeLocationSpan(...path, value)
      };
    })
  );
  var COMLINK_OBJECT_LITERAL = SyntaxRule.followedBy(
    SyntaxRule.separator("{"),
    SyntaxRule.optionalRepeat(COMLINK_OBJECT_LITERAL_ASSIGNMENT),
    SyntaxRule.separator("}")
  ).map(
    ([sepStart, maybeFields, sepEnd]) => {
      return {
        kind: "ComlinkObjectLiteral",
        fields: maybeFields ?? [],
        location: computeLocationSpan(sepStart, sepEnd)
      };
    }
  );
  var COMLINK_LIST_LITERAL = SyntaxRule.followedBy(
    SyntaxRule.separator("["),
    SyntaxRule.optionalRepeat(
      expectTerminated(COMLINK_LITERAL_MUT, ",", "\n", "]")
    ),
    SyntaxRule.separator("]")
  ).map(
    ([sepStart, maybeItems, sepEnd]) => {
      return {
        kind: "ComlinkListLiteral",
        items: maybeItems ?? [],
        location: computeLocationSpan(sepStart, sepEnd)
      };
    }
  );
  var COMLINK_NONE_LITERAL = SyntaxRule.identifier("None").map(
    (match) => {
      return {
        kind: "ComlinkNoneLiteral",
        location: match.location
      };
    }
  );
  var COMLINK_LITERAL = SyntaxRule.or(
    COMLINK_PRIMITIVE_LITERAL,
    COMLINK_NONE_LITERAL,
    COMLINK_OBJECT_LITERAL,
    COMLINK_LIST_LITERAL
  );
  COMLINK_LITERAL_MUT.rule = COMLINK_LITERAL;

  // src/parser/syntax/rules/profile/profile.ts
  var TYPE_MUT = new SyntaxRuleMutable();
  var FIELD_DEFINITION_MUT = new SyntaxRuleMutable();
  var PRIMITIVE_TYPE_NAME = new SyntaxRuleOr(
    SyntaxRule.identifier("boolean"),
    SyntaxRule.identifier("number"),
    SyntaxRule.identifier("string")
  ).map((keywordMatch) => {
    let name;
    switch (keywordMatch.data.identifier) {
      case "number":
        name = "number";
        break;
      case "string":
        name = "string";
        break;
      case "boolean":
        name = "boolean";
        break;
      default:
        throw "Unexpected soft keyword. This is an error in the syntax rule definition";
    }
    return {
      kind: "PrimitiveTypeName",
      name,
      location: keywordMatch.location
    };
  });
  var ENUM_VALUE = documentedNode(
    expectTerminated(
      SyntaxRule.followedBy(
        SyntaxRule.identifier(),
        SyntaxRule.optional(
          SyntaxRule.operator("=").followedBy(
            SyntaxRule.literal().or(SyntaxRule.string())
          )
        )
      ),
      ",",
      "}",
      "\n"
    ).map(([name, maybeAssignment]) => {
      const variantName = name.data.identifier;
      let variantValue;
      if (maybeAssignment === void 0) {
        variantValue = variantName;
      } else {
        const match = maybeAssignment[1];
        switch (match.data.kind) {
          case 3 /* LITERAL */:
            variantValue = match.data.literal;
            break;
          case 4 /* STRING */:
            variantValue = match.data.string;
            break;
          default:
            throw new Error(
              "Unexpected token kind. This is an error in the syntax rule definition"
            );
        }
      }
      return {
        kind: "EnumValue",
        name: variantName,
        value: variantValue,
        location: computeLocationSpan(name, ...maybeAssignment ?? [])
      };
    })
  );
  var ENUM_DEFINITION = SyntaxRule.followedBy(
    SyntaxRule.identifier("enum"),
    SyntaxRule.separator("{"),
    SyntaxRule.repeat(ENUM_VALUE),
    SyntaxRule.separator("}")
  ).map(
    ([
      keyword,
      _sepStart,
      values,
      sepEnd
    ]) => {
      return {
        kind: "EnumDefinition",
        values,
        location: computeLocationSpan(keyword, sepEnd)
      };
    }
  );
  var MODEL_TYPE_NAME = SyntaxRule.identifier().map((name) => {
    return {
      kind: "ModelTypeName",
      name: name.data.identifier,
      location: computeLocationSpan(name)
    };
  });
  var OBJECT_DEFINITION = SyntaxRule.followedBy(
    SyntaxRule.separator("{"),
    SyntaxRule.optionalRepeat(FIELD_DEFINITION_MUT),
    SyntaxRule.separator("}")
  ).map(
    ([sepStart, maybeFields, sepEnd]) => {
      return {
        kind: "ObjectDefinition",
        fields: maybeFields ?? [],
        location: computeLocationSpan(sepStart, sepEnd)
      };
    }
  );
  var BASIC_TYPE = SyntaxRule.or(
    PRIMITIVE_TYPE_NAME,
    ENUM_DEFINITION,
    MODEL_TYPE_NAME,
    OBJECT_DEFINITION
  );
  var LIST_DEFINITION = SyntaxRule.followedBy(
    SyntaxRule.separator("["),
    TYPE_MUT,
    SyntaxRule.separator("]")
  ).map(([sepStart, type, sepEnd]) => {
    return {
      kind: "ListDefinition",
      elementType: type,
      location: computeLocationSpan(sepStart, sepEnd)
    };
  });
  var NON_UNION_TYPE = BASIC_TYPE.or(LIST_DEFINITION).followedBy(SyntaxRule.optional(SyntaxRule.operator("!"))).map(
    ([type, maybeOp]) => {
      if (maybeOp !== void 0) {
        return {
          kind: "NonNullDefinition",
          type,
          location: computeLocationSpan(type, maybeOp)
        };
      }
      return type;
    }
  );
  var TYPE = NON_UNION_TYPE.followedBy(
    SyntaxRule.optionalRepeat(SyntaxRule.operator("|").followedBy(NON_UNION_TYPE))
  ).map(([firstType, maybeRestPairs]) => {
    if (maybeRestPairs !== void 0) {
      const types = [firstType, ...maybeRestPairs.map(([_op, type]) => type)];
      return {
        kind: "UnionDefinition",
        types,
        location: computeLocationSpan(firstType, ...types)
      };
    }
    return firstType;
  });
  TYPE_MUT.rule = TYPE;
  var FIELD_DEFINITION = documentedNode(
    expectTerminated(
      SyntaxRule.followedBy(
        SyntaxRule.identifier(),
        SyntaxRule.optional(SyntaxRule.operator("!")),
        SyntaxRule.optional(SyntaxRule.sameLine(TYPE))
      ),
      ",",
      "}",
      "\n"
    ).map(
      ([name, maybeRequired, maybeType]) => {
        return {
          kind: "FieldDefinition",
          fieldName: name.data.identifier,
          required: maybeRequired !== void 0,
          type: maybeType,
          location: computeLocationSpan(name, maybeRequired, maybeType)
        };
      }
    )
  );
  FIELD_DEFINITION_MUT.rule = FIELD_DEFINITION;
  var NAMED_FIELD_DEFINITION = documentedNode(
    SyntaxRule.followedBy(
      SyntaxRule.identifier("field"),
      SyntaxRule.identifier(),
      SyntaxRule.optional(SyntaxRule.sameLine(TYPE))
    ).map(
      ([
        keyword,
        fieldName,
        maybeType
      ]) => {
        return {
          kind: "NamedFieldDefinition",
          fieldName: fieldName.data.identifier,
          type: maybeType,
          location: computeLocationSpan(keyword, fieldName, maybeType)
        };
      }
    )
  );
  var NAMED_MODEL_DEFINITION = documentedNode(
    SyntaxRule.followedBy(
      SyntaxRule.identifier("model"),
      SyntaxRule.identifier(),
      SyntaxRule.optional(SyntaxRule.sameLine(TYPE))
    ).map(
      ([
        keyword,
        modelName,
        maybeType
      ]) => {
        return {
          kind: "NamedModelDefinition",
          modelName: modelName.data.identifier,
          type: maybeType,
          location: computeLocationSpan(keyword, modelName, maybeType)
        };
      }
    )
  );
  function SLOT_FACTORY(names, rule) {
    const namesRule = SyntaxRule.followedBy(
      SyntaxRule.identifier(names[0]),
      ...names.slice(1).map((n) => SyntaxRule.sameLine(SyntaxRule.identifier(n)))
    );
    const slotrule = namesRule.followedBy(SyntaxRule.sameLine(rule)).map(([names2, value]) => {
      return {
        value,
        location: computeLocationSpan(...names2, value)
      };
    });
    return documentedNode(slotrule);
  }
  function USECASE_SLOT_DEFINITION_FACTORY(names, rule) {
    return SLOT_FACTORY(names, rule).map(
      (slot) => {
        return {
          kind: "UseCaseSlotDefinition",
          value: slot.value,
          location: slot.location,
          documentation: slot.documentation
        };
      }
    );
  }
  var USECASE_SAFETY = SyntaxRule.identifier("safe").or(SyntaxRule.identifier("unsafe")).or(SyntaxRule.identifier("idempotent"));
  var USECASE_EXAMPLE = SyntaxRule.followedBy(
    SyntaxRule.optional(SyntaxRule.identifier()),
    SyntaxRule.separator("{"),
    SyntaxRule.optional(
      USECASE_SLOT_DEFINITION_FACTORY(
        ["input"],
        COMLINK_OBJECT_LITERAL
      )
    ),
    SyntaxRule.optional(
      USECASE_SLOT_DEFINITION_FACTORY(
        ["result"],
        COMLINK_LITERAL
      )
    ),
    SyntaxRule.optional(
      USECASE_SLOT_DEFINITION_FACTORY(
        ["async", "result"],
        COMLINK_LITERAL
      )
    ),
    SyntaxRule.optional(
      USECASE_SLOT_DEFINITION_FACTORY(
        ["error"],
        COMLINK_LITERAL
      )
    ),
    SyntaxRule.separator("}")
  ).andThen(
    ([
      maybeName,
      sepStart,
      maybeInput,
      maybeResult,
      maybeAsyncResult,
      maybeError,
      sepEnd
    ]) => {
      if (maybeError !== void 0 && (maybeResult !== void 0 || maybeAsyncResult !== void 0)) {
        return { kind: "nomatch" };
      }
      const value = {
        kind: "UseCaseExample",
        exampleName: maybeName?.data.identifier,
        input: maybeInput,
        result: maybeResult,
        asyncResult: maybeAsyncResult,
        error: maybeError,
        location: computeLocationSpan(maybeName, sepStart, sepEnd)
      };
      return { kind: "match", value };
    }
  );
  var USECASE_DEFINITION = documentedNode(
    SyntaxRule.followedBy(
      SyntaxRule.identifier("usecase"),
      SyntaxRule.identifier(void 0),
      SyntaxRule.optional(USECASE_SAFETY),
      SyntaxRule.separator("{"),
      SyntaxRule.optional(
        USECASE_SLOT_DEFINITION_FACTORY(
          ["input"],
          OBJECT_DEFINITION
        )
      ),
      SyntaxRule.optional(
        USECASE_SLOT_DEFINITION_FACTORY(["result"], TYPE)
      ),
      SyntaxRule.optional(
        USECASE_SLOT_DEFINITION_FACTORY(["async", "result"], TYPE)
      ),
      SyntaxRule.optional(USECASE_SLOT_DEFINITION_FACTORY(["error"], TYPE)),
      SyntaxRule.optionalRepeat(
        USECASE_SLOT_DEFINITION_FACTORY(
          ["example"],
          USECASE_EXAMPLE
        )
      ),
      SyntaxRule.separator("}")
    ).map(
      ([
        keyword,
        name,
        maybeSafety,
        _sepStart,
        maybeInput,
        maybeResult,
        maybeAsyncResult,
        maybeError,
        maybeExamples,
        sepEnd
      ]) => {
        let safety = void 0;
        switch (maybeSafety?.data.identifier) {
          case void 0:
            break;
          case "safe":
            safety = "safe";
            break;
          case "unsafe":
            safety = "unsafe";
            break;
          case "idempotent":
            safety = "idempotent";
            break;
          default:
            throw "Unexpected soft keyword. This is an error in the syntax rule definition";
        }
        return {
          kind: "UseCaseDefinition",
          useCaseName: name.data.identifier,
          safety,
          input: maybeInput,
          result: maybeResult,
          asyncResult: maybeAsyncResult,
          error: maybeError,
          examples: maybeExamples,
          location: computeLocationSpan(keyword, sepEnd)
        };
      }
    )
  );
  var PROFILE_NAME = SyntaxRule.followedBy(
    SyntaxRule.identifier("name"),
    SyntaxRuleSeparator.operator("="),
    SyntaxRule.string().andThen(
      (name) => {
        const parseNameResult = parseDocumentId(name.data.string);
        if (parseNameResult.kind !== "parsed" || parseNameResult.value.middle.length !== 1 || parseNameResult.value.version !== void 0) {
          return {
            kind: "nomatch"
          };
        }
        const parsedName = parseNameResult.value;
        return {
          kind: "match",
          value: {
            scope: parsedName.scope,
            name: parsedName.middle[0],
            location: name.location
          }
        };
      },
      "profile name in format `[<scope>/]<name>` with lowercase identifier"
    )
  ).map(([keyword, op, name]) => {
    return {
      scope: name.scope,
      name: name.name,
      location: computeLocationSpan(keyword, op, name)
    };
  });
  var PROFILE_VERSION = SyntaxRule.followedBy(
    SyntaxRule.identifier("version"),
    SyntaxRuleSeparator.operator("="),
    SyntaxRule.string().andThen((version) => {
      try {
        const parsedVersion = ProfileVersion.fromString(version.data.string);
        return {
          kind: "match",
          value: {
            major: parsedVersion.major,
            minor: parsedVersion.minor,
            patch: parsedVersion.patch,
            label: parsedVersion.label,
            location: version.location
          }
        };
      } catch (error) {
        return { kind: "nomatch" };
      }
    }, "semver version in format `<major>.<minor>.<patch>`")
  ).map(([keyword, op, version]) => {
    return {
      version: {
        major: version.major,
        minor: version.minor,
        patch: version.patch
      },
      location: computeLocationSpan(keyword, op, version)
    };
  });
  var PROFILE_HEADER = documentedNode(
    PROFILE_NAME.followedBy(PROFILE_VERSION).map(
      ([name, version]) => {
        return {
          kind: "ProfileHeader",
          scope: name.scope,
          name: name.name,
          version: version.version,
          location: computeLocationSpan(name, version)
        };
      }
    )
  );
  var PROFILE_DOCUMENT_DEFINITION = USECASE_DEFINITION.or(NAMED_FIELD_DEFINITION).or(NAMED_MODEL_DEFINITION);
  var PROFILE_DOCUMENT = SyntaxRule.followedBy(
    SyntaxRule.separator("SOF"),
    PROFILE_HEADER,
    SyntaxRule.optionalRepeat(PROFILE_DOCUMENT_DEFINITION),
    SyntaxRule.separator("EOF"),
    new SyntaxRuleSourceChecksum()
  ).map(
    ([
      _SOF,
      header,
      maybeDefinitions,
      _EOF,
      sourceChecksum
    ]) => {
      const definitions = maybeDefinitions ?? [];
      return {
        kind: "ProfileDocument",
        header,
        definitions,
        location: computeLocationSpan(header, ...definitions),
        astMetadata: {
          astVersion: PARSED_AST_VERSION,
          parserVersion: PARSED_VERSION,
          sourceChecksum
        }
      };
    }
  );

  // src/parser/syntax/parser.ts
  function parseRuleResult(rule, source, skipSOF) {
    const lexer = new Lexer(source);
    if (skipSOF === true) {
      lexer.next();
    }
    const result = rule.tryMatch(lexer);
    if (result.kind === "match") {
      return { kind: "success", value: result.match };
    } else {
      const error = SyntaxError.fromSyntaxRuleNoMatch(source, result);
      return {
        kind: "failure",
        error
      };
    }
  }

  // src/validator/lib/error.ts
  var ErrorBase = class {
    constructor(kind, message) {
      this.kind = kind;
      this.message = message;
    }
    get [Symbol.toStringTag]() {
      return this.kind;
    }
    toString() {
      return `${this.kind}: ${this.message}`;
    }
  };
  var UnexpectedError = class extends ErrorBase {
    constructor(message, additionalContext) {
      super("UnexpectedError", message);
      this.message = message;
      this.additionalContext = additionalContext;
    }
  };
  var SDKExecutionError = class extends Error {
    constructor(shortMessage, longLines, hints) {
      super(shortMessage);
      this.shortMessage = shortMessage;
      this.longLines = longLines;
      this.hints = hints;
      Object.setPrototypeOf(this, SDKBindError.prototype);
      this.message = this.formatLong();
      this.name = "SDKExecutionError";
    }
    /**
     * Formats this error into a one-line string
     */
    formatShort() {
      return this.shortMessage;
    }
    /**
     * Formats this error into a possible multi-line string with more context, details and hints
     */
    formatLong() {
      let result = this.shortMessage;
      if (this.longLines.length > 0) {
        result += "\n";
        for (const line of this.longLines) {
          result += "\n" + line;
        }
      }
      if (this.hints.length > 0) {
        result += "\n";
        for (const hint of this.hints) {
          result += "\nHint: " + hint;
        }
      }
      return result + "\n";
    }
    get [Symbol.toStringTag]() {
      return this.name;
    }
    toString() {
      return this.formatLong();
    }
  };
  var SDKBindError = class extends SDKExecutionError {
    constructor(shortMessage, longLines, hints) {
      super(shortMessage, longLines, hints);
      Object.setPrototypeOf(this, SDKBindError.prototype);
      this.name = "SDKBindError";
    }
  };

  // src/validator/lib/result.ts
  var Ok = class {
    constructor(value) {
      this.value = value;
    }
    isOk() {
      return true;
    }
    isErr() {
      return !this.isOk();
    }
    map(f) {
      return ok(f(this.value));
    }
    mapErr(_) {
      return ok(this.value);
    }
    andThen(f) {
      return f(this.value);
    }
    match(ok3, _) {
      return ok3(this.value);
    }
    unwrap() {
      return this.value;
    }
    async mapAsync(f) {
      const inner = await f(this.value);
      return ok(inner);
    }
    async mapErrAsync(_) {
      return ok(this.value);
    }
    async andThenAsync(f) {
      return f(this.value);
    }
  };
  var Err = class {
    constructor(error) {
      this.error = error;
    }
    isOk() {
      return false;
    }
    isErr() {
      return !this.isOk();
    }
    map(_) {
      return err(this.error);
    }
    mapErr(f) {
      return err(f(this.error));
    }
    andThen(_) {
      return err(this.error);
    }
    match(_, err3) {
      return err3(this.error);
    }
    unwrap() {
      throw this.error;
    }
    async mapAsync(_) {
      return err(this.error);
    }
    async mapErrAsync(f) {
      const inner = await f(this.error);
      return err(inner);
    }
    async andThenAsync(_) {
      return err(this.error);
    }
  };
  var ok = (value) => new Ok(value);
  var err = (err3) => new Err(err3);

  // src/validator/interfaces/binary.ts
  function isBinaryData(input) {
    return typeof input === "object" && input !== null && "peek" in input && "getAllData" in input && "chunkBy" in input && "toStream" in input;
  }

  // src/validator/lib/variables.ts
  var Buffer3 = {
    isBuffer(_) {
      return false;
    }
  };
  function isClassInstance(input) {
    if (input === null || input === void 0) {
      return false;
    }
    if (typeof input !== "object") {
      return false;
    }
    if (Array.isArray(input)) {
      return false;
    }
    const proto = Object.getPrototypeOf(input);
    if (proto === null || proto === Object.prototype) {
      return false;
    }
    return typeof proto.constructor === "function";
  }
  function isNone(input) {
    return input === void 0 || input === null;
  }
  function isNonPrimitive(input) {
    return typeof input === "object" && input !== null && !Array.isArray(input) && !isBinaryData(input) && !Buffer3.isBuffer(input) && !isClassInstance(input);
  }

  // src/validator/profile/profile-parameter-validator.errors.ts
  function isWrongTypeError(err3) {
    return err3.kind === "wrongType";
  }
  function addFieldToErrors(errors, field) {
    return errors.map(
      (err3) => err3.kind === "missingRequired" ? { ...err3, context: { ...err3.context, field } } : err3
    );
  }
  function formatErrors(errors) {
    if (!errors) {
      return "Unknown error";
    }
    return errors.map((err3) => {
      const prefix = err3.context?.path ? `Path: ${err3.context.path.join(".")}
Error: ` : "Error: ";
      switch (err3.kind) {
        case "wrongType":
          return `${prefix}Wrong type: expected ${err3.context.expected}, but got ${err3.context.actual}`;
        case "notArray":
          return `${prefix}${JSON.stringify(
            err3.context.input
          )} is not an array`;
        case "missingRequired":
          return `${prefix}Missing required field`;
        case "wrongUnion":
          return `${prefix}Result does not satisfy union: expected one of: ${err3.context.expected.join(
            ", "
          )}`;
        case "elementsInArrayWrong":
          return `${prefix}Some elements in array do not match criteria:
${formatErrors(
            err3.context.suberrors
          )}`;
        case "enumValue":
          return `${prefix}Invalid enum value` + (err3.context !== void 0 ? `: ${err3.context?.actual}` : "");
        case "wrongInput":
          return "Wrong input";
        case "nullInNonNullable":
          return `${prefix}Null in non-nullable field`;
        default:
          throw new UnexpectedError("Invalid error!");
      }
    }).join("\n");
  }
  var InputValidationError = class extends ErrorBase {
    constructor(errors) {
      super(
        "InputValidationError",
        "Input validation failed:\n" + formatErrors(errors)
      );
      this.errors = errors;
    }
    name = "InputValidationError";
  };
  var ResultValidationError = class extends ErrorBase {
    constructor(errors) {
      super(
        "ResultValidationError",
        "Result validation failed:\n" + formatErrors(errors)
      );
      this.errors = errors;
    }
    name = "ResultValidationError";
  };

  // src/validator/profile/profile-parameter-validator.ts
  function assertUnreachable(node) {
    throw new UnexpectedError(`Invalid Node kind: ${node.kind}`);
  }
  function objectHasKey(obj, key) {
    if (typeof obj !== "object") {
      return false;
    }
    if (obj === null) {
      return false;
    }
    if (!(key in obj)) {
      return false;
    }
    return true;
  }
  function addPath(validator, path) {
    return (input) => {
      const result = validator(input);
      if (result[0]) {
        return result;
      }
      return [
        false,
        result[1].map((err3) => {
          return {
            ...err3,
            context: {
              ...err3.context ?? {},
              path: [path, ...err3.context?.path ?? []]
            }
          };
        })
      ];
    };
  }
  var ProfileParameterValidator = class {
    constructor(ast) {
      this.ast = ast;
    }
    namedFieldDefinitions = {};
    namedModelDefinitions = {};
    namedDefinitionsInitialized = false;
    validate(input, kind, usecase) {
      try {
        const validator = this.visit(this.ast, kind, usecase);
        const [result, errors] = validator(input);
        if (result !== true) {
          const error = kind === "input" ? InputValidationError : ResultValidationError;
          return err(new error(errors));
        }
        return ok(void 0);
      } catch (e) {
        return err(new UnexpectedError("Unknown error from validator", e));
      }
    }
    visit(node, kind, usecase) {
      switch (node.kind) {
        case "ComlinkListLiteral":
          return this.visitComlinkListLiteralNode(node, kind, usecase);
        case "ComlinkObjectLiteral":
          return this.visitComlinkObjectLiteralNode(node, kind, usecase);
        case "ComlinkPrimitiveLiteral":
          return this.visitComlinkPrimitiveLiteralNode(node, kind, usecase);
        case "ComlinkNoneLiteral":
          return this.visitComlinkNoneLiteralNode(node, kind, usecase);
        case "ComlinkAssignment":
          return this.visitComlinkAssignmentNode(node, kind, usecase);
        case "EnumDefinition":
          return this.visitEnumDefinitionNode(node, kind, usecase);
        case "EnumValue":
          return this.visitEnumValueNode(node, kind, usecase);
        case "FieldDefinition":
          return this.visitFieldDefinitionNode(node, kind, usecase);
        case "ListDefinition":
          return this.visitListDefinitionNode(node, kind, usecase);
        case "ModelTypeName":
          return this.visitModelTypeNameNode(node, kind, usecase);
        case "NamedFieldDefinition":
          return this.visitNamedFieldDefinitionNode(node, kind, usecase);
        case "NamedModelDefinition":
          return this.visitNamedModelDefinitionNode(node, kind, usecase);
        case "NonNullDefinition":
          return this.visitNonNullDefinitionNode(node, kind, usecase);
        case "ObjectDefinition":
          return this.visitObjectDefinitionNode(node, kind, usecase);
        case "PrimitiveTypeName":
          return this.visitPrimitiveTypeNameNode(node, kind, usecase);
        case "ProfileDocument":
          return this.visitProfileDocumentNode(node, kind, usecase);
        case "ProfileHeader":
          return this.visitProfileHeaderNode(node, kind, usecase);
        case "UnionDefinition":
          return this.visitUnionDefinitionNode(node, kind, usecase);
        case "UseCaseDefinition":
          return this.visitUseCaseDefinitionNode(node, kind, usecase);
        case "UseCaseSlotDefinition":
          return this.visitUseCaseSlotDefinitionNode(node, kind, usecase);
        case "UseCaseExample":
          return this.visitUseCaseExampleNode(node, kind, usecase);
        default:
          assertUnreachable(node);
      }
    }
    visitComlinkListLiteralNode(_node, _kind, _usecase) {
      throw new UnexpectedError("Method not implemented.");
    }
    visitComlinkObjectLiteralNode(_node, _kind, _usecase) {
      throw new UnexpectedError("Method not implemented.");
    }
    visitComlinkPrimitiveLiteralNode(_node, _kind, _usecase) {
      throw new UnexpectedError("Method not implemented.");
    }
    visitComlinkNoneLiteralNode(_node, _kind, _usecase) {
      throw new UnexpectedError("Method not implemented.");
    }
    visitComlinkAssignmentNode(_node, _kind, _usecase) {
      throw new UnexpectedError("Method not implemented.");
    }
    visitEnumDefinitionNode(node, kind, usecase) {
      return (input) => {
        if (isNone(input)) {
          return [true];
        }
        for (const value of node.values) {
          if (this.visit(value, kind, usecase)(input)[0]) {
            return [true];
          }
        }
        return [
          false,
          [{ kind: "enumValue", context: { actual: JSON.stringify(input) } }]
        ];
      };
    }
    visitEnumValueNode(node, _kind, _usecase) {
      return (input) => {
        if (input === node.value) {
          return [true];
        } else {
          return [false, []];
        }
      };
    }
    visitFieldDefinitionNode(node, kind, usecase) {
      return (input) => {
        if (objectHasKey(input, node.fieldName)) {
          const fieldValue = objectHasKey(input, node.fieldName) ? input[node.fieldName] : void 0;
          if (node.type) {
            return this.visit(node.type, kind, usecase)(fieldValue);
          }
          if (this.namedFieldDefinitions[node.fieldName] !== void 0) {
            return this.namedFieldDefinitions[node.fieldName](fieldValue);
          }
          return [true];
        }
        if (node.required) {
          return [false, [{ kind: "missingRequired" }]];
        } else {
          return [true];
        }
      };
    }
    visitListDefinitionNode(node, kind, usecase) {
      return (input) => {
        if (isNone(input)) {
          return [true];
        }
        if (!Array.isArray(input)) {
          return [false, [{ kind: "notArray", context: { input } }]];
        }
        const errors = [];
        const result = input.every((item) => {
          const result2 = this.visit(node.elementType, kind, usecase)(item);
          if (result2[1]) {
            errors.push(...result2[1]);
          }
          return result2[0];
        });
        if (result) {
          return [true];
        } else {
          return [
            false,
            [
              {
                kind: "elementsInArrayWrong",
                context: { suberrors: errors }
              }
            ]
          ];
        }
      };
    }
    visitModelTypeNameNode(node, _kind, _usecase) {
      if (this.namedModelDefinitions[node.name] !== void 0) {
        return this.namedModelDefinitions[node.name];
      }
      throw new UnexpectedError(`Invalid model name: ${node.name}`);
    }
    visitNamedFieldDefinitionNode(node, kind, usecase) {
      if (node.type) {
        return this.visit(node.type, kind, usecase);
      } else {
        return () => [true];
      }
    }
    visitNamedModelDefinitionNode(node, kind, usecase) {
      if (node.type) {
        return this.visit(node.type, kind, usecase);
      } else {
        return () => [true];
      }
    }
    visitNonNullDefinitionNode(node, kind, usecase) {
      return (input) => {
        if (isNone(input)) {
          return [false, [{ kind: "nullInNonNullable" }]];
        }
        return this.visit(node.type, kind, usecase)(input);
      };
    }
    visitObjectDefinitionNode(node, kind, usecase) {
      return (input) => {
        if (isNone(input)) {
          return [true];
        }
        if (typeof input !== "object") {
          return [
            false,
            [
              {
                kind: "wrongType",
                context: { expected: "object", actual: typeof input }
              }
            ]
          ];
        }
        return node.fields.reduce(
          (result, field) => {
            const subresult = addPath(
              this.visit(field, kind, usecase),
              field.fieldName
            )(input);
            if (subresult[0] === false) {
              if (result[1]) {
                return [
                  false,
                  [
                    ...result[1],
                    ...addFieldToErrors(subresult[1], field.fieldName)
                  ]
                ];
              } else {
                return [false, addFieldToErrors(subresult[1], field.fieldName)];
              }
            }
            return result;
          },
          [true]
        );
      };
    }
    visitPrimitiveTypeNameNode(node, _kind, _usecase) {
      return (input) => {
        if (isNone(input)) {
          return [true];
        }
        switch (node.name) {
          case "boolean":
            if (typeof input === "boolean") {
              return [true];
            } else {
              return [
                false,
                [
                  {
                    kind: "wrongType",
                    context: { expected: "boolean", actual: typeof input }
                  }
                ]
              ];
            }
          case "number":
            if (typeof input === "number") {
              return [true];
            } else {
              return [
                false,
                [
                  {
                    kind: "wrongType",
                    context: { expected: "number", actual: typeof input }
                  }
                ]
              ];
            }
          case "string":
            if (typeof input === "string") {
              return [true];
            } else {
              return [
                false,
                [
                  {
                    kind: "wrongType",
                    context: { expected: "string", actual: typeof input }
                  }
                ]
              ];
            }
        }
      };
    }
    visitProfileDocumentNode(node, kind, usecase) {
      const usecaseNode = node.definitions.find(
        (definition) => definition.kind === "UseCaseDefinition" && definition.useCaseName === usecase
      );
      if (!usecaseNode) {
        throw new UnexpectedError(`Usecase ${usecase} not found!`);
      }
      if (!this.namedDefinitionsInitialized) {
        node.definitions.filter((v) => v.kind === "NamedModelDefinition").forEach((definition) => {
          this.namedModelDefinitions[definition.modelName] = this.visit(
            definition,
            kind,
            usecase
          );
        });
        node.definitions.filter((v) => v.kind === "NamedFieldDefinition").forEach((definition) => {
          this.namedFieldDefinitions[definition.fieldName] = this.visit(
            definition,
            kind,
            usecase
          );
        });
        this.namedDefinitionsInitialized = true;
      }
      return this.visit(usecaseNode, kind, usecase);
    }
    visitProfileHeaderNode(_node, _kind, _usecase) {
      throw new UnexpectedError("Method not implemented.");
    }
    visitUnionDefinitionNode(node, kind, usecase) {
      return (input) => {
        const errors = [];
        for (const type of node.types) {
          const result = this.visit(type, kind, usecase)(input);
          if (result[0]) {
            return [true];
          } else {
            errors.push(...result[1]);
          }
        }
        const types = errors.filter(isWrongTypeError).map((err3) => err3.context.expected);
        return [false, [{ kind: "wrongUnion", context: { expected: types } }]];
      };
    }
    visitUseCaseDefinitionNode(node, kind, usecase) {
      if (kind === "input" && node.input !== void 0) {
        return addPath((input) => {
          if (isNone(input)) {
            return [false, [{ kind: "nullInNonNullable" }]];
          }
          if (node.input !== void 0) {
            return this.visit(node.input.value, kind, usecase)(input);
          }
          return [true];
        }, "input");
      }
      if (kind === "result" && node.result) {
        return addPath(this.visit(node.result.value, kind, usecase), "result");
      }
      return (input) => {
        if (isNone(input)) {
          return [true];
        }
        if (isNonPrimitive(input) && Object.keys(input).length === 0) {
          return [true];
        }
        return [false, [{ kind: "wrongInput" }]];
      };
    }
    visitUseCaseExampleNode(_node, _kind, _usecase) {
      throw new UnexpectedError("Method not implemented.");
    }
    visitUseCaseSlotDefinitionNode(_node, _kind, _usecase) {
      throw new UnexpectedError("Method not implemented.");
    }
  };

  // src/profile_validator.ts
  function _start() {
    let result;
    try {
      result = main(unstable_exports.takeInput());
      unstable_exports.setOutputSuccess(result);
    } catch (e) {
      unstable_exports.setOutputFailure(e.message);
    }
  }
  function main(input) {
    if (input.profile) {
      const ast = parseRuleResult(profile_exports.PROFILE_DOCUMENT, new Source(input.profile));
      if (ast.kind !== "success") {
        throw ast.error;
      }
      globalThis.profileValidator = new ProfileParameterValidator(ast.value);
      return true;
    }
    if (globalThis.profileValidator === void 0) {
      throw new Error("Profile not set");
    }
    if (!input.usecase) {
      throw new Error("Usecase not set");
    }
    if (input.input) {
      return globalThis.profileValidator.validate(input.input, "input", input.usecase).match(
        (_ok) => null,
        (err3) => err3.message
      );
    }
    if (input.result) {
      return globalThis.profileValidator.validate(input.input, "result", input.usecase).match(
        (_ok) => null,
        (err3) => err3.message
      );
    }
    if (input.error) {
      throw new Error("Error validation not supported");
    }
    return null;
  }
  _start();
})();
