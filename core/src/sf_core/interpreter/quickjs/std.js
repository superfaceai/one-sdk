globalThis.sf_std.internal = {
    classes() {
        class HttpRequest {
            static fire(method, url, headers, body) {
                return new HttpRequest();
            }

            response() {
                return {
                    status: 200,
                    body: {
                        json() {
                            return { foo: 1, bar: 2 };
                        }
                    }
                }
            }
        }

        return {
            HttpRequest: HttpRequest
        };
    }
}

globalThis.sf_std.unstable = {
    print(message) {
        if (message === undefined) {
            sf_std.ffi.unstable.print("undefined");
        } else if (message === null) {
            sf_std.ffi.unstable.print("null");
        } else {
            sf_std.ffi.unstable.print(message.toString());
        }
    },
    abort() {
        sf_std.ffi.unstable.abort();
    },
    getInput() {
        return { id: 1 };
    },
    setOutput(output) {
        sf_std.unstable.print(output);
    },
    ...globalThis.sf_std.internal.classes()
};

// delete from global scope
// delete HttpRequest;
