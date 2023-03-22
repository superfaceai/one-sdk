const __std = {
    // TODO: make public?
    Bytes: class Bytes {
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
            // resize exponentially, copy old data into new buffer
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
        decode(encoding = 'utf8') {
            // TODO: again support for TypedArrays in Javy
            const buffer = this.#buffer.buffer.slice(0, this.len);
            if (encoding === 'utf8') {
                return __ffi.unstable.bytes_to_utf8(buffer);
            }
            else if (encoding === 'base64') {
                return __ffi.unstable.bytes_to_base64(buffer);
            }
            throw new Error(`encoding "${encoding}" not implemented`);
        }
        // TODO: support other encodings, currently this is always utf-8
        static encode(string, encoding = 'utf8') {
            let buffer;
            if (encoding === 'utf8') {
                buffer = __ffi.unstable.utf8_to_bytes(string);
            }
            else if (encoding === 'base64') {
                buffer = __ffi.unstable.base64_to_bytes(string);
            }
            else {
                throw new Error(`encoding "${encoding}" not implemented`);
            }
            return new Bytes(new Uint8Array(buffer), buffer.byteLength);
        }
    },
    ByteStream: class ByteStream {
        #handle;
        constructor(handle) {
            this.#handle = handle;
        }
        readToEnd() {
            const buffer = __std.Bytes.withCapacity(8192);
            // TODO: support for TypedArrays in Javy - without them we have to read into a plain ArrayBuffer (which cannot be a subarray)
            // and then copy that data into our final buffer.
            //
            // If Javy supported TypedArrays (they are supported in quickjs, just not exposed in Javy), we could directly pass a subarray
            // to the `stream_read` call and we'd only need one buffer.
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
    },
    message: {
        jsonReplacerMapValue(key, value) {
            // TODO: this is how node Buffer gets serialized - do we want that?
            // to keep in line with our core convention, this should be some kind of `$MapValue::Buffer` and only transformed to the NodeJS buffer for the sake of tests
            if (Buffer.isBuffer(value)) {
                return { type: 'Buffer', data: value.inner.toArray() };
            }
            return value;
        },
        jsonReviverMapValue(key, value) {
            if (typeof value === 'object' && value !== null) {
                if (value['type'] === 'Buffer' && Array.isArray(value['data'])) {
                    return Buffer.from(value['data']);
                }
            }
            // TODO: revive streams
            return value;
        },
        exchange(message, replacer = undefined, reviver = undefined) {
            const response = __ffi.unstable.message_exchange(JSON.stringify(message, replacer));
            return JSON.parse(response, reviver);
        },
    },
    util: {
        ensureMultimap(map, lowercaseKeys = false) {
            const result = {};
            if (typeof map !== 'object' || map === null) {
                return result;
            }
            for (let [key, value] of Object.entries(map)) {
                if (lowercaseKeys) {
                    key = key.toLowerCase();
                }
                if (!Array.isArray(value)) {
                    value = [value];
                }
                result[key] = value.filter((v) => v !== undefined && v !== null).map((v) => v.toString());
            }
            return result;
        }
    }
};
// TODO: couldn't make these types inline with `std` because then it fails with self-referential instantiation error. but they ideally should not pollute the global namespace
class __HttpRequest {
    #handle;
    /** @internal */
    constructor(handle) {
        this.#handle = handle;
    }
    response() {
        const response = __std.message.exchange({
            kind: 'http-call-head',
            handle: this.#handle
        });
        if (response.kind === 'ok') {
            return new std.unstable.HttpResponse(response.status, response.headers, response.body_stream);
        }
        else {
            throw new Error(response.error);
        }
    }
}
class __HttpResponse {
    status;
    headers;
    #bodyStream;
    /** @internal */
    constructor(status, headers, bodyStream) {
        this.status = status;
        this.headers = headers;
        this.#bodyStream = new __std.ByteStream(bodyStream);
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
            return '';
        }
        // TODO: possibly infer encoding from headers?
        return bytes.decode();
    }
    bodyJson() {
        const text = this.bodyText();
        if (text === undefined || text === '') {
            return undefined;
        }
        return JSON.parse(text);
    }
    bodyAuto() {
        if (this.status === 204) {
            return undefined;
        }
        if (this.headers['content-type']?.some(ct => ct.indexOf(std.unstable.CONTENT_TYPE.JSON) >= 0) ?? false) {
            return this.bodyJson();
        }
        if (this.headers['content-type']?.some(ct => std.unstable.CONTENT_TYPE.RE_BINARY.test(ct)) ?? false) {
            return this.bodyBytes();
        }
        return this.bodyText();
    }
}
const std = {
    unstable: {
        MapError: class MapError {
            output;
            constructor(output) {
                this.output = output;
            }
        },
        // env
        print(message) {
            if (message === undefined) {
                __ffi.unstable.print('undefined');
            }
            else if (message === null) {
                __ffi.unstable.print('null');
            }
            else {
                __ffi.unstable.print(message.toString());
            }
        },
        // input and output
        takeInput() {
            const response = __std.message.exchange({
                kind: 'take-input'
            }, undefined, __std.message.jsonReviverMapValue);
            if (response.kind === 'ok') {
                return { input: response.input, parameters: response.parameters, security: response.security };
            }
            else {
                throw new Error(response.error);
            }
        },
        setOutputSuccess(output) {
            const response = __std.message.exchange({
                kind: 'set-output-success',
                output: output ?? null
            }, __std.message.jsonReplacerMapValue, undefined);
            if (response.kind === 'ok') {
                return;
            }
            else {
                throw new Error(response.error);
            }
        },
        setOutputFailure(output) {
            const response = __std.message.exchange({
                kind: 'set-output-failure',
                output: output ?? null
            }, __std.message.jsonReplacerMapValue, undefined);
            if (response.kind === 'ok') {
                return;
            }
            else {
                throw new Error(response.error);
            }
        },
        // networking
        HttpRequest: __HttpRequest,
        HttpResponse: __HttpResponse,
        CONTENT_TYPE: {
            JSON: 'application/json',
            URLENCODED: 'application/x-www-form-urlencoded',
            FORMDATA: 'multipart/form-data',
            RE_BINARY: /application\/octet-stream|video\/.*|audio\/.*|image\/.*/
        },
        resolveRequestUrl(url, options) {
            const { parameters, security } = options;
            let serviceId = options.serviceId ?? parameters.__provider.defaultService;
            if (url === '') {
                return parameters.__provider.services[serviceId].baseUrl;
            }
            const isRelative = /^\/([^/]|$)/.test(url);
            if (isRelative) {
                url = parameters.__provider.services[serviceId].baseUrl.replace(/\/+$/, '') + url;
            }
            return url;
        },
        fetch(url, options) {
            const headers = __std.util.ensureMultimap(options.headers ?? {}, true);
            let finalBody;
            let body = options.body;
            if (body !== undefined && body !== null) {
                const contentType = headers['content-type']?.[0] ?? 'application/json';
                let bodyBytes;
                if (contentType.startsWith(std.unstable.CONTENT_TYPE.JSON)) {
                    bodyBytes = __std.Bytes.encode(JSON.stringify(body));
                }
                else if (contentType.startsWith(std.unstable.CONTENT_TYPE.URLENCODED)) {
                    bodyBytes = __std.Bytes.encode(__ffi.unstable.map_to_urlencode(__std.util.ensureMultimap(body)));
                }
                else if (std.unstable.CONTENT_TYPE.RE_BINARY.test(contentType)) {
                    bodyBytes = Buffer.from(body).inner;
                }
                else {
                    throw new Error(`Content type not supported: ${contentType}`);
                }
                // TODO: support formdata
                // turn Bytes into number[] to serialize correctly
                finalBody = Array.from(bodyBytes.data);
            }
            const response = __std.message.exchange({
                kind: 'http-call',
                method: options.method ?? 'GET',
                url,
                headers,
                query: __std.util.ensureMultimap(options.query ?? {}),
                body: finalBody
            });
            if (response.kind === 'ok') {
                return new std.unstable.HttpRequest(response.handle);
            }
            else {
                throw new Error(response.error);
            }
        }
    }
};
// TODO: Comlink/node map compat
class Buffer {
    static from(value, encoding = 'utf8') {
        if (typeof value === 'string') {
            return new Buffer(__std.Bytes.encode(value, encoding));
        }
        if (Buffer.isBuffer(value)) {
            return value;
        }
        if (Array.isArray(value)) {
            return new Buffer(__std.Bytes.fromArray(value));
        }
        throw new Error('not implemented');
    }
    static isBuffer(value) {
        if (value === undefined || value === null) {
            return false;
        }
        if (value instanceof Buffer) {
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
    toString(encoding = 'utf8') {
        return this.#inner.decode(encoding);
    }
}
