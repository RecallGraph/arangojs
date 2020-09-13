/**
 * ```ts
 * import type { ArangoError, HttpError } from "arangojs/error";
 * ```
 *
 * The "error" module provides types and interfaces for TypeScript related
 * to arangojs error handling.
 *
 * @packageDocumentation
 */
import { ExtendableError } from "./lib/error";
/**
 * Indicates whether the given value represents an {@link ArangoError}.
 *
 * @param error - A value that might be an `ArangoError`.
 */
export declare function isArangoError(error: any): error is ArangoError;
/**
 * Indicates whether the given value represents an ArangoDB error response.
 *
 * @internal
 */
export declare function isArangoErrorResponse(body: any): boolean;
/**
 * Indicates whether the given value represents a Node.js `SystemError`.
 */
export declare function isSystemError(err: any): err is SystemError;
/**
 * Interface representing a Node.js `SystemError`.
 */
export interface SystemError extends Error {
    code: string;
    errno: number | string;
    syscall: string;
}
/**
 * Represents an error returned by ArangoDB.
 */
export declare class ArangoError extends ExtendableError {
    name: string;
    /**
     * ArangoDB error code.
     *
     * See {@link https://www.arangodb.com/docs/stable/appendix-error-codes.html | ArangoDB error documentation}.
     */
    errorNum: number;
    /**
     * HTTP status code included in the server error response object.
     */
    code: number;
    /**
     * Server response object.
     */
    response: any;
    /**
     * @internal
     * @hidden
     */
    constructor(response: any);
    /**
     * @internal
     *
     * Indicates that this object represents an ArangoDB error.
     */
    get isArangoError(): true;
}
/**
 * Represents a plain HTTP error response.
 */
export declare class HttpError extends ExtendableError {
    name: string;
    /**
     * Server response object.
     */
    response: any;
    /**
     * HTTP status code of the server response.
     */
    code: number;
    /**
     * @internal
     * @hidden
     */
    constructor(response: any);
}
//# sourceMappingURL=error.d.ts.map