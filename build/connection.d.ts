/// <reference types="node" />
/**
 * ```ts
 * import type { Config } from "arangojs/connection";
 * ```
 *
 * The "connection" module provides connection and configuration related types
 * for TypeScript.
 *
 * @packageDocumentation
 */
import { ClientRequest } from "http";
import { AgentOptions as NodeAgentOptions } from "https";
import { LinkedList } from "x3-linkedlist";
import { Database } from "./database";
import { ArangojsError, ArangojsResponse, RequestFunction } from "./lib/request";
/**
 * Generic type representing an object with values of a given value type.
 *
 * @param T - Type of the object's property values.
 */
export declare type Dict<T> = {
    [key: string]: T;
};
/**
 * Determines the behavior when multiple URLs are used:
 *
 * - `"NONE"`: No load balancing. All requests will be handled by the first
 *   URL in the list until a network error is encountered. On network error,
 *   arangojs will advance to using the next URL in the list.
 *
 * - `"ONE_RANDOM"`: Randomly picks one URL from the list initially, then
 *   behaves like `"NONE"`.
 *
 * - `"ROUND_ROBIN"`: Every sequential request uses the next URL in the list.
 */
export declare type LoadBalancingStrategy = "NONE" | "ROUND_ROBIN" | "ONE_RANDOM";
/**
 * An arbitrary object with string values representing HTTP headers and their
 * values.
 *
 * Header names should always be lowercase.
 */
export declare type Headers = Dict<string>;
/**
 * An arbitrary object with scalar values representing query string parameters
 * and their values.
 */
export declare type Params = Dict<any>;
/**
 * Generic properties shared by all ArangoDB HTTP API responses.
 */
export declare type ArangoResponseMetadata = {
    /**
     * Indicates that the request was successful.
     */
    error: false;
    /**
     * Response status code, typically `200`.
     */
    code: number;
};
/**
 * Credentials for HTTP Basic authentication.
 */
export declare type BasicAuthCredentials = {
    /**
     * Username to use for authentication, e.g. `"root"`.
     */
    username: string;
    /**
     * Password to use for authentication. Defaults to an empty string.
     */
    password?: string;
};
/**
 * Credentials for HTTP Bearer token authentication.
 */
export declare type BearerAuthCredentials = {
    /**
     * Bearer token to use for authentication.
     */
    token: string;
};
/**
 * @internal
 * @hidden
 */
declare type UrlInfo = {
    absolutePath?: boolean;
    basePath?: string;
    path?: string;
    qs?: string | Params;
};
/**
 * Options of the `xhr` module that can be set using `agentOptions` when using
 * arangojs in the browser. Additionally `maxSockets` can be used to control
 * the maximum number of parallel requests.
 *
 * See also: {@link https://www.npmjs.com/package/xhr | `xhr` on npm }.
 */
export declare type XhrOptions = {
    /**
     * Maximum number of parallel requests arangojs will perform. If any
     * additional requests are attempted, they will be enqueued until one of the
     * active requests has completed.
     */
    maxSockets?: number;
    /**
     * Number of milliseconds to wait for a response.
     *
     * Default: `0` (disabled)
     */
    timeout?: number;
    /**
     * Callback that will be invoked immediately before the `send` method of the
     * request is called.
     *
     * See also {@link RequestInterceptors}.
     */
    beforeSend?: (xhrObject: any) => void;
    /**
     * `XMLHttpRequest` object to use instead of the native implementation.
     */
    xhr?: any;
    /**
     * (Internet Explorer 10 and lower only.) Whether `XDomainRequest` should be
     * used instead of `XMLHttpRequest`. Only required for performing
     * cross-domain requests in older versions of Internet Explorer.
     */
    useXdr?: boolean;
    /**
     * Specifies whether browser credentials (e.g. cookies) should be sent if
     * performing a cross-domain request.
     *
     * See {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials | `XMLHttpRequest.withCredentials`}.
     */
    withCredentials?: boolean;
};
/**
 * Additional options for intercepting the request/response. These methods
 * are primarily intended for tracking network related metrics.
 */
export declare type RequestInterceptors = {
    /**
     * Callback that will be invoked with the finished request object before it
     * is finalized. In the browser the request may already have been sent.
     *
     * @param req - Request object or XHR instance used for this request.
     */
    before?: (req: ClientRequest) => void;
    /**
     * Callback that will be invoked when the server response has been received
     * and processed or when the request has been failed without a response.
     *
     * The originating request will be available as the `request` property
     * on either the error or response object.
     *
     * @param err - Error encountered when handling this request or `null`.
     * @param res - Response object for this request, if no error occurred.
     */
    after?: (err: ArangojsError | null, res?: ArangojsResponse) => void;
};
/**
 * Options for performing a request with arangojs.
 */
export declare type RequestOptions = {
    /**
     * @internal
     *
     * Identifier of a specific ArangoDB host to use when more than one is known.
     */
    host?: number;
    /**
     * HTTP method to use in order to perform the request.
     *
     * Default: `"GET"`
     */
    method?: string;
    /**
     * Request body data.
     */
    body?: any;
    /**
     * If set to `true`, the response body will not be interpreted as JSON and
     * instead passed as-is.
     */
    expectBinary?: boolean;
    /**
     * If set to `true`, the request body will not be converted to JSON and
     * instead passed as-is.
     */
    isBinary?: boolean;
    /**
     * Whether ArangoDB is allowed to perform a dirty read to respond to this
     * request. If set to `true`, the response may reflect a dirty state from
     * a non-authoritative server.
     */
    allowDirtyRead?: boolean;
    /**
     * HTTP headers to pass along with this request in addition to the default
     * headers generated by arangojs.
     */
    headers?: Headers;
    /**
     * Time in milliseconds after which arangojs will abort the request if the
     * socket has not already timed out.
     *
     * See also `agentOptions.timeout` in {@link Config}.
     */
    timeout?: number;
    /**
     * Optional prefix path to prepend to the `path`.
     */
    basePath?: string;
    /**
     * URL path, relative to the `basePath` and server domain.
     */
    path?: string;
    /**
     * URL parameters to pass as part of the query string.
     */
    qs?: string | Params;
};
/**
 * @internal
 * @hidden
 */
declare type Task = {
    host?: number;
    stack?: string;
    allowDirtyRead: boolean;
    resolve: Function;
    reject: Function;
    retries: number;
    options: {
        method: string;
        expectBinary: boolean;
        timeout?: number;
        url: {
            pathname: string;
            search?: string;
        };
        headers: Headers;
        body: any;
    };
};
/**
 * Options for creating the Node.js `http.Agent` or `https.Agent`.
 *
 * In browser environments this option can be used to pass additional options
 * to the underlying calls of the
 * {@link https://www.npmjs.com/package/xhr | xhr module}.
 *
 * See also {@link https://nodejs.org/api/http.html#http_new_agent_options | `http.Agent`}
 * and {@link https://nodejs.org/api/https.html#https_new_agent_options | `https.Agent`}
 * (when using TLS).
 */
export declare type AgentOptions = NodeAgentOptions | XhrOptions;
/**
 * Options for configuring arangojs.
 */
export declare type Config = {
    /**
     * Name of the database to use.
     *
     * Default: `"_system"`
     */
    databaseName?: string;
    /**
     * Base URL of the ArangoDB server or list of server URLs.
     *
     * When working with a cluster or a single server with leader/follower
     * failover, the method {@link Database.acquireHostList} can be used to
     * automatically pick up additional coordinators/followers at any point.
     *
     * When running ArangoDB on a unix socket, e.g. `/tmp/arangodb.sock`, the
     * following URL formats are supported for unix sockets:
     *
     * - `unix:///tmp/arangodb.sock` (no SSL)
     * - `http+unix:///tmp/arangodb.sock` (or `https+unix://` for SSL)
     * - `http://unix:/tmp/arangodb.sock` (or `https://unix:` for SSL)
     *
     * Additionally `ssl` and `tls` are treated as synonymous with `https` and
     * `tcp` is treated as synonymous with `http`, so the following URLs are
     * considered identical:
     *
     * - `tcp://localhost:8529` and `http://localhost:8529`
     * - `ssl://localhost:8529` and `https://localhost:8529`
     * - `tcp+unix:///tmp/arangodb.sock` and `http+unix:///tmp/arangodb.sock`
     * - `ssl+unix:///tmp/arangodb.sock` and `https+unix:///tmp/arangodb.sock`
     * - `tcp://unix:/tmp/arangodb.sock` and `http://unix:/tmp/arangodb.sock`
     * - `ssl://unix:/tmp/arangodb.sock` and `https://unix:/tmp/arangodb.sock`
     *
     * See also `auth` for passing authentication credentials.
     *
     * Default: `"http://localhost:8529"`
     */
    url?: string | string[];
    /**
     * Credentials to use for authentication.
     *
     * See also {@link Database.useBasicAuth} and {@link Database.useBearerAuth}.
     *
     * Default: `{ username: "root", password: "" }`
     */
    auth?: BasicAuthCredentials | BearerAuthCredentials;
    /**
     * Numeric representation of the ArangoDB version the driver should expect.
     * The format is defined as `XYYZZ` where `X` is the major version, `Y` is
     * the zero-filled two-digit minor version and `Z` is the zero-filled two-digit
     * bugfix version, e.g. `30102` for 3.1.2, `20811` for 2.8.11.
     *
     * Depending on this value certain methods may become unavailable or change
     * their behavior to remain compatible with different versions of ArangoDB.
     *
     * Default: `30400`
     */
    arangoVersion?: number;
    /**
     * Determines the behavior when multiple URLs are provided:
     *
     * - `"NONE"`: No load balancing. All requests will be handled by the first
     *   URL in the list until a network error is encountered. On network error,
     *   arangojs will advance to using the next URL in the list.
     *
     * - `"ONE_RANDOM"`: Randomly picks one URL from the list initially, then
     *   behaves like `"NONE"`.
     *
     * - `"ROUND_ROBIN"`: Every sequential request uses the next URL in the list.
     *
     * Default: `"NONE"`
     */
    loadBalancingStrategy?: LoadBalancingStrategy;
    /**
     * Determines the behavior when a request fails because the underlying
     * connection to the server could not be opened
     * (i.e. {@link https://nodejs.org/api/errors.html#errors_common_system_errors | `ECONNREFUSED` in Node.js}):
     *
     * - `false`: the request fails immediately.
     *
     * - `0`: the request is retried until a server can be reached but only a
     *   total number of times matching the number of known servers (including
     *   the initial failed request).
     *
     * - any other number: the request is retried until a server can be reached
     *   the request has been retried a total of `maxRetries` number of times
     *   (not including the initial failed request).
     *
     * When working with a single server without leader/follower failover, the
     * retries (if any) will be made to the same server.
     *
     * This setting currently has no effect when using arangojs in a browser.
     *
     * **Note**: Requests bound to a specific server (e.g. fetching query results)
     * will never be retried automatically and ignore this setting.
     *
     * Default: `0`
     */
    maxRetries?: false | number;
    /**
     * An http `Agent` instance to use for connections.
     *
     * By default a new `Agent` instance will be created using the `agentOptions`.
     *
     * This option has no effect when using the browser version of arangojs.
     *
     * See also: {@link https://nodejs.org/api/http.html#http_new_agent_options | `http.Agent`}
     * and {@link https://nodejs.org/api/https.html#https_new_agent_options | `https.Agent`}
     * (when using TLS).
     */
    agent?: any;
    /**
     * Options used to create that underlying HTTP/HTTPS `Agent` (or the `xhr`
     * module when using arangojs in the browser). This will be ignored if
     * `agent` is also provided.
     *
     * The option `maxSockets` can also be used to limit how many requests
     * arangojs will perform concurrently. The maximum number of requests is
     * equal to `maxSockets * 2` with `keepAlive: true` or equal to `maxSockets`
     * with `keepAlive: false` (or in the browser).
     *
     * Default (Node.js): `{ maxSockets: 3, keepAlive: true, keepAliveMsecs: 1000 }`
     *
     * Default (browser): `{ maxSockets: 3, useXDR: true, withCredentials: true }`
     */
    agentOptions?: AgentOptions & RequestInterceptors;
    /**
     * An object with additional headers to send with every request.
     *
     * If an `"authorization"` header is provided, it will be overridden when
     * using {@link Database.useBasicAuth}, {@link Database.useBearerAuth} or
     * the `auth` configuration option.
     */
    headers?: Headers;
    /**
     * If set to `true`, arangojs will generate stack traces every time a request
     * is initiated and augment the stack traces of any errors it generates.
     *
     * **Warning**: This will cause arangojs to generate stack traces in advance
     * even if the request does not result in an error. Generating stack traces
     * may negatively impact performance.
     */
    precaptureStackTraces?: boolean;
};
/**
 * Indicates whether the given value represents a {@link Connection}.
 *
 * @param connection - A value that might be a connection.
 *
 * @internal
 * @hidden
 */
export declare function isArangoConnection(connection: any): connection is Connection;
/**
 * Represents a connection pool shared by one or more databases.
 *
 * @internal
 * @hidden
 */
export declare class Connection {
    protected _activeTasks: number;
    protected _agent?: any;
    protected _agentOptions: {
        [key: string]: any;
    };
    protected _arangoVersion: number;
    protected _headers: Headers;
    protected _loadBalancingStrategy: LoadBalancingStrategy;
    protected _useFailOver: boolean;
    protected _shouldRetry: boolean;
    protected _maxRetries: number;
    protected _maxTasks: number;
    protected _queue: LinkedList<Task>;
    protected _databases: Map<string, Database>;
    protected _hosts: RequestFunction[];
    protected _urls: string[];
    protected _activeHost: number;
    protected _activeDirtyHost: number;
    protected _transactionId: string | null;
    protected _precaptureStackTraces: boolean;
    /**
     * @internal
     *
     * Creates a new `Connection` instance.
     *
     * @param config - An object with configuration options.
     *
     * @hidden
     */
    constructor(config?: Omit<Config, "databaseName">);
    /**
     * @internal
     *
     * Indicates that this object represents an ArangoDB connection.
     */
    get isArangoConnection(): true;
    protected _runQueue(): void;
    protected _buildUrl({ basePath, path, qs }: UrlInfo): {
        pathname: string;
        search: string;
    } | {
        pathname: string;
        search?: undefined;
    };
    setBearerAuth(auth: BearerAuthCredentials): void;
    setBasicAuth(auth: BasicAuthCredentials): void;
    /**
     * @internal
     *
     * Fetches a {@link Database} instance for the given database name from the
     * internal cache, if available.
     *
     * @param databaseName - Name of the database.
     */
    database(databaseName: string): Database | undefined;
    /**
     * @internal
     *
     * Adds a {@link Database} instance for the given database name to the
     * internal cache.
     *
     * @param databaseName - Name of the database.
     * @param database - Database instance to add to the cache.
     */
    database(databaseName: string, database: Database): Database;
    /**
     * @internal
     *
     * Clears any {@link Database} instance stored for the given database name
     * from the internal cache, if present.
     *
     * @param databaseName - Name of the database.
     * @param database - Must be `null`.
     */
    database(databaseName: string, database: null): undefined;
    /**
     * @internal
     *
     * Adds the given URL or URLs to the host list.
     *
     * See {@link Connection.acquireHostList}.
     *
     * @param urls - URL or URLs to add.
     */
    addToHostList(urls: string | string[]): number[];
    /**
     * @internal
     *
     * Sets the connection's active `transactionId`.
     *
     * While set, all requests will use this ID, ensuring the requests are executed
     * within the transaction if possible. Setting the ID manually may cause
     * unexpected behavior.
     *
     * See also {@link Connection.clearTransactionId}.
     *
     * @param transactionId - ID of the active transaction.
     */
    setTransactionId(transactionId: string): void;
    /**
     * @internal
     *
     * Clears the connection's active `transactionId`.
     */
    clearTransactionId(): void;
    /**
     * @internal
     *
     * Sets the header `headerName` with the given `value` or clears the header if
     * `value` is `null`.
     *
     * @param headerName - Name of the header to set.
     * @param value - Value of the header.
     */
    setHeader(headerName: string, value: string | null): void;
    /**
     * @internal
     *
     * Closes all open connections.
     *
     * See {@link Database.close}.
     */
    close(): void;
    /**
     * @internal
     *
     * Performs a request using the arangojs connection pool.
     */
    request<T = ArangojsResponse>({ host, method, body, expectBinary, isBinary, allowDirtyRead, timeout, headers, ...urlInfo }: RequestOptions, transform?: (res: ArangojsResponse) => T): Promise<T>;
}
export {};
//# sourceMappingURL=connection.d.ts.map