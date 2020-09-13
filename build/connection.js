"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connection = exports.isArangoConnection = void 0;
const querystring_1 = require("querystring");
const x3_linkedlist_1 = require("x3-linkedlist");
const error_1 = require("./error");
const btoa_1 = require("./lib/btoa");
const normalizeUrl_1 = require("./lib/normalizeUrl");
const request_1 = require("./lib/request");
const MIME_JSON = /\/(json|javascript)(\W|$)/;
const LEADER_ENDPOINT_HEADER = "x-arango-endpoint";
function clean(obj) {
    const result = {};
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (value === undefined)
            continue;
        result[key] = value;
    }
    return result;
}
function isBearerAuth(auth) {
    return auth.hasOwnProperty("token");
}
/**
 * @internal
 * @hidden
 */
function generateStackTrace() {
    let err = new Error();
    if (!err.stack) {
        try {
            throw err;
        }
        catch (e) {
            err = e;
        }
    }
    return err.stack;
}
/**
 * Indicates whether the given value represents a {@link Connection}.
 *
 * @param connection - A value that might be a connection.
 *
 * @internal
 * @hidden
 */
function isArangoConnection(connection) {
    return Boolean(connection && connection.isArangoConnection);
}
exports.isArangoConnection = isArangoConnection;
/**
 * Represents a connection pool shared by one or more databases.
 *
 * @internal
 * @hidden
 */
class Connection {
    /**
     * @internal
     *
     * Creates a new `Connection` instance.
     *
     * @param config - An object with configuration options.
     *
     * @hidden
     */
    constructor(config = {}) {
        this._activeTasks = 0;
        this._arangoVersion = 30400;
        this._queue = new x3_linkedlist_1.LinkedList();
        this._databases = new Map();
        this._hosts = [];
        this._urls = [];
        this._transactionId = null;
        if (config.arangoVersion !== undefined) {
            this._arangoVersion = config.arangoVersion;
        }
        this._agent = config.agent;
        this._agentOptions = request_1.isBrowser
            ? { maxSockets: 3, ...config.agentOptions }
            : {
                maxSockets: 3,
                keepAlive: true,
                keepAliveMsecs: 1000,
                ...config.agentOptions,
            };
        this._maxTasks = this._agentOptions.maxSockets;
        if (this._agentOptions.keepAlive)
            this._maxTasks *= 2;
        this._headers = { ...config.headers };
        this._loadBalancingStrategy = config.loadBalancingStrategy || "NONE";
        this._useFailOver = this._loadBalancingStrategy !== "ROUND_ROBIN";
        this._precaptureStackTraces = Boolean(config.precaptureStackTraces);
        if (config.maxRetries === false) {
            this._shouldRetry = false;
            this._maxRetries = 0;
        }
        else {
            this._shouldRetry = true;
            this._maxRetries = config.maxRetries || 0;
        }
        const urls = config.url
            ? Array.isArray(config.url)
                ? config.url
                : [config.url]
            : ["http://localhost:8529"];
        this.addToHostList(urls);
        if (config.auth) {
            if (isBearerAuth(config.auth)) {
                this.setBearerAuth(config.auth);
            }
            else {
                this.setBasicAuth(config.auth);
            }
        }
        if (this._loadBalancingStrategy === "ONE_RANDOM") {
            this._activeHost = Math.floor(Math.random() * this._hosts.length);
            this._activeDirtyHost = Math.floor(Math.random() * this._hosts.length);
        }
        else {
            this._activeHost = 0;
            this._activeDirtyHost = 0;
        }
    }
    /**
     * @internal
     *
     * Indicates that this object represents an ArangoDB connection.
     */
    get isArangoConnection() {
        return true;
    }
    _runQueue() {
        if (!this._queue.length || this._activeTasks >= this._maxTasks)
            return;
        const task = this._queue.shift();
        let host = this._activeHost;
        if (task.host !== undefined) {
            host = task.host;
        }
        else if (task.allowDirtyRead) {
            host = this._activeDirtyHost;
            this._activeDirtyHost = (this._activeDirtyHost + 1) % this._hosts.length;
            task.options.headers["x-arango-allow-dirty-read"] = "true";
        }
        else if (this._loadBalancingStrategy === "ROUND_ROBIN") {
            this._activeHost = (this._activeHost + 1) % this._hosts.length;
        }
        this._activeTasks += 1;
        const callback = (err, res) => {
            this._activeTasks -= 1;
            if (err) {
                if (!task.allowDirtyRead &&
                    this._hosts.length > 1 &&
                    this._activeHost === host &&
                    this._useFailOver) {
                    this._activeHost = (this._activeHost + 1) % this._hosts.length;
                }
                if (!task.host &&
                    this._shouldRetry &&
                    task.retries < (this._maxRetries || this._hosts.length - 1) &&
                    error_1.isSystemError(err) &&
                    err.syscall === "connect" &&
                    err.code === "ECONNREFUSED") {
                    task.retries += 1;
                    this._queue.push(task);
                }
                else {
                    if (task.stack) {
                        err.stack += task.stack;
                    }
                    task.reject(err);
                }
            }
            else {
                const response = res;
                if (response.statusCode === 503 &&
                    response.headers[LEADER_ENDPOINT_HEADER]) {
                    const url = response.headers[LEADER_ENDPOINT_HEADER];
                    const [index] = this.addToHostList(url);
                    task.host = index;
                    if (this._activeHost === host) {
                        this._activeHost = index;
                    }
                    this._queue.push(task);
                }
                else {
                    response.arangojsHostId = host;
                    task.resolve(response);
                }
            }
            this._runQueue();
        };
        try {
            this._hosts[host](task.options, callback);
        }
        catch (e) {
            callback(e);
        }
    }
    _buildUrl({ basePath, path, qs }) {
        const pathname = `${basePath || ""}${path || ""}`;
        let search;
        if (qs) {
            if (typeof qs === "string")
                search = `?${qs}`;
            else
                search = `?${querystring_1.stringify(clean(qs))}`;
        }
        return search ? { pathname, search } : { pathname };
    }
    setBearerAuth(auth) {
        this.setHeader("authorization", `Bearer ${auth.token}`);
    }
    setBasicAuth(auth) {
        this.setHeader("authorization", `Basic ${btoa_1.btoa(`${auth.username}:${auth.password}`)}`);
    }
    database(databaseName, database) {
        if (database === null) {
            this._databases.delete(databaseName);
            return undefined;
        }
        if (!database) {
            return this._databases.get(databaseName);
        }
        this._databases.set(databaseName, database);
        return database;
    }
    /**
     * @internal
     *
     * Adds the given URL or URLs to the host list.
     *
     * See {@link Connection.acquireHostList}.
     *
     * @param urls - URL or URLs to add.
     */
    addToHostList(urls) {
        const cleanUrls = (Array.isArray(urls) ? urls : [urls]).map((url) => normalizeUrl_1.normalizeUrl(url));
        const newUrls = cleanUrls.filter((url) => this._urls.indexOf(url) === -1);
        this._urls.push(...newUrls);
        this._hosts.push(...newUrls.map((url) => request_1.createRequest(url, this._agentOptions, this._agent)));
        return cleanUrls.map((url) => this._urls.indexOf(url));
    }
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
    setTransactionId(transactionId) {
        this._transactionId = transactionId;
    }
    /**
     * @internal
     *
     * Clears the connection's active `transactionId`.
     */
    clearTransactionId() {
        this._transactionId = null;
    }
    /**
     * @internal
     *
     * Sets the header `headerName` with the given `value` or clears the header if
     * `value` is `null`.
     *
     * @param headerName - Name of the header to set.
     * @param value - Value of the header.
     */
    setHeader(headerName, value) {
        if (value === null) {
            delete this._headers[headerName];
        }
        else {
            this._headers[headerName] = value;
        }
    }
    /**
     * @internal
     *
     * Closes all open connections.
     *
     * See {@link Database.close}.
     */
    close() {
        for (const host of this._hosts) {
            if (host.close)
                host.close();
        }
    }
    /**
     * @internal
     *
     * Performs a request using the arangojs connection pool.
     */
    request({ host, method = "GET", body, expectBinary = false, isBinary = false, allowDirtyRead = false, timeout = 0, headers, ...urlInfo }, transform) {
        return new Promise((resolve, reject) => {
            let contentType = "text/plain";
            if (isBinary) {
                contentType = "application/octet-stream";
            }
            else if (body) {
                if (typeof body === "object") {
                    body = JSON.stringify(body);
                    contentType = "application/json";
                }
                else {
                    body = String(body);
                }
            }
            const extraHeaders = {
                ...this._headers,
                "content-type": contentType,
                "x-arango-version": String(this._arangoVersion),
            };
            if (this._transactionId) {
                extraHeaders["x-arango-trx-id"] = this._transactionId;
            }
            const task = {
                retries: 0,
                host,
                allowDirtyRead,
                options: {
                    url: this._buildUrl(urlInfo),
                    headers: { ...extraHeaders, ...headers },
                    timeout,
                    method,
                    expectBinary,
                    body,
                },
                reject,
                resolve: (res) => {
                    const contentType = res.headers["content-type"];
                    let parsedBody = undefined;
                    if (res.body.length && contentType && contentType.match(MIME_JSON)) {
                        try {
                            parsedBody = res.body;
                            parsedBody = JSON.parse(parsedBody);
                        }
                        catch (e) {
                            if (!expectBinary) {
                                if (typeof parsedBody !== "string") {
                                    parsedBody = res.body.toString("utf-8");
                                }
                                e.response = res;
                                reject(e);
                                return;
                            }
                        }
                    }
                    else if (res.body && !expectBinary) {
                        parsedBody = res.body.toString("utf-8");
                    }
                    else {
                        parsedBody = res.body;
                    }
                    if (error_1.isArangoErrorResponse(parsedBody)) {
                        res.body = parsedBody;
                        reject(new error_1.ArangoError(res));
                    }
                    else if (res.statusCode && res.statusCode >= 400) {
                        res.body = parsedBody;
                        reject(new error_1.HttpError(res));
                    }
                    else {
                        if (!expectBinary)
                            res.body = parsedBody;
                        resolve(transform ? transform(res) : res);
                    }
                },
            };
            if (this._precaptureStackTraces) {
                if (typeof Error.captureStackTrace === "function") {
                    Error.captureStackTrace(task);
                    task.stack = `\n${task.stack.split("\n").slice(3).join("\n")}`;
                }
                else {
                    const stack = generateStackTrace();
                    if (stack) {
                        task.stack = `\n${stack.split("\n").slice(4).join("\n")}`;
                    }
                }
            }
            this._queue.push(task);
            this._runQueue();
        });
    }
}
exports.Connection = Connection;
//# sourceMappingURL=connection.js.map