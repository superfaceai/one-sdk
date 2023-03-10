// TODO: module support is exposed in git Javy project - we could depend on git directly and rework this as a module
globalThis.std = globalThis.std ?? {};
globalThis.std.private = {
    message_exchange(message) {
        const response = std.ffi.unstable.message_exchange(
            JSON.stringify(message)
        );
        return JSON.parse(response);
    },
    Bytes: class Bytes {
        #buffer;
        #len;
        constructor(capacity) {
            this.#buffer = new Uint8Array(capacity ?? 0);
            this.#len = 0;
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

        decode() {
            // TODO: again support for TypedArrays in Javy
            const buffer = this.#buffer.buffer.slice(0, this.len);
            return std.ffi.unstable.decode_utf8(buffer);
        }

        static readStreamToEnd(handle) {
            const buffer = new std.private.Bytes(128);
            // TODO: support for TypedArrays in Javy - without them we have to read into a plain ArrayBuffer (which cannot be a subarray)
            // and then copy that data into our final buffer.
            //
            // If Javy supported TypedArrays (they are supported in quickjs, just not exposed in Javy), we could directly pass a subarray
            // to the `stream_read` call and we'd only need one buffer.
            const readBuffer = new ArrayBuffer(128);

            while (true) {
                const count = std.ffi.unstable.stream_read(handle, readBuffer);
                if (count === 0) {
                    break;
                }

                buffer.extend(readBuffer.slice(0, count));
            }

            return buffer;
        }
    }
};
globalThis.std.unstable = {
    print(message) {
        if (message === undefined) {
            std.ffi.unstable.print("undefined");
        } else if (message === null) {
            std.ffi.unstable.print("null");
        } else {
            std.ffi.unstable.print(message.toString());
        }
    },
    abort() {
        std.ffi.unstable.abort();
    },
    
    takeInput() {
        const response = std.private.message_exchange({
            kind: 'take-input'
        });

        if (response.kind === 'ok') {
            // TODO: revive while parsing JSON to support custom types (streams)
            return { input: response.input, parameters: response.parameters, security: response.security };
        } else {
            throw new Error(response.error);
        }
    },
    setOutput(output) {
        const response = std.private.message_exchange({
            kind: 'set-output',
            output
        });

        if (response.kind === 'ok') {
            return;
        } else {
            throw new Error(response.error);
        }
    },
    fetch(url, options) {
        const response = std.private.message_exchange({
            kind: "http-call",
            method: options.method ?? 'GET',
            url,
            headers: options.headers ?? {},
            query: options.query ?? {},
            body: options.body ?? undefined
        });

        if (response.kind === "ok") {
            return new std.unstable.HttpRequest(response.handle);
        } else {
            throw new Error(response.error);
        }
    },
    HttpRequest: class HttpRequest {
        #handle;
        constructor(handle) {
            this.#handle = handle;
        }

        response() {
            const response = std.private.message_exchange({
                kind: "http-call-head",
                handle: this.#handle
            });

            if (response.kind === "ok") {
                return new std.unstable.HttpResponse(response.status, response.headers, response.body_stream);
            } else {
                throw new Error(response.error);
            }
        }
    },
    HttpResponse: class HttpResponse {
        #bodyStream;
        constructor(status, headers, bodyStream) {
            this.status = status;
            this.headers = Object.fromEntries(
                Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
            );
            this.#bodyStream = bodyStream;
        }

        bodyBytes() {
            const buffer = std.private.Bytes.readStreamToEnd(this.#bodyStream);
            std.ffi.unstable.stream_close(this.#bodyStream);

            return buffer;
        }

        bodyText() {
            // TODO: possibly infer encoding from headers?
            return this.bodyBytes().decode();
        }

        bodyJson() {
            return JSON.parse(this.bodyText());
        }
    }
};
