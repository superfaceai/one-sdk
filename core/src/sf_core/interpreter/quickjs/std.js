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
            this.#buffer.set(buffer, this.#len);
            this.#len += buffer.byteLength;
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
    
    getInput() {
        const response = std.private.message_exchange({
            kind: 'get-input'
        });

        if (response.kind === 'ok') {
            // TODO: revive
            return response.input;
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
    HttpRequest: class HttpRequest {
        static fire(method, url, headers, body) {
            const response = std.private.message_exchange({
                kind: "http-call",
                method,
                url,
                headers,
                body
            });

            if (response.kind === "ok") {
                return new HttpRequest(response.handle);
            } else {
                throw new Error(response.error);
            }
        }

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
            this.headers = headers;
            this.#bodyStream = bodyStream;
        }

        bodyBytes() {
            const buffer = std.private.Bytes.readStreamToEnd(this.#bodyStream);
            std.ffi.unstable.stream_close(this.#bodyStream);

            return buffer.data;
        }

        bodyText() {
            // TODO: possibly infer encoding from headers?
            return std.ffi.unstable.decode_utf8(this.bodyBytes());
        }

        bodyJson() {
            return JSON.parse(this.bodyText());
        }
    }
};
