export type MultiMap = Record<string, string[]>;
export type Encoding = 'utf8' | 'base64';
export type FetchOptions = {
    method?: string;
    headers?: MultiMap;
    query?: MultiMap;
    body?: string | number[] | Buffer;
};
export type AnyValue = null | string | number | boolean | AnyValue[] | {
    [s in string]: AnyValue;
};
declare class __HttpRequest {
    #private;
    response(): __HttpResponse;
}
declare class __HttpResponse {
    #private;
    readonly status: number;
    readonly headers: MultiMap;
    private bodyBytes;
    bodyText(): string;
    bodyJson(): unknown;
    bodyAuto(): unknown;
}
export type Std = typeof std;
declare const std: {
    readonly unstable: {
        readonly MapError: {
            new (output: unknown): {
                readonly output: unknown;
            };
        };
        readonly print: (message: unknown) => void;
        readonly takeInput: () => AnyValue;
        readonly setOutputSuccess: (output: AnyValue) => void;
        readonly setOutputFailure: (output: AnyValue) => void;
        readonly HttpRequest: typeof __HttpRequest;
        readonly HttpResponse: typeof __HttpResponse;
        readonly CONTENT_TYPE: {
            readonly JSON: "application/json";
            readonly URLENCODED: "application/x-www-form-urlencoded";
            readonly FORMDATA: "multipart/form-data";
            readonly RE_BINARY: RegExp;
        };
        readonly resolveRequestUrl: (url: string, options: {
            parameters: any;
            security: any;
            serviceId?: string;
        }) => string;
        readonly fetch: (url: string, options: FetchOptions) => __HttpRequest;
    };
};
export declare class Buffer {
    #private;
    static from(value: unknown, encoding?: Encoding): Buffer;
    static isBuffer(value: unknown): value is Buffer;
    private constructor();
    toString(encoding?: Encoding): string;
}
export {};
