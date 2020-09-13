"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route = void 0;
/**
 * Represents an arbitrary route relative to an ArangoDB database.
 */
class Route {
    /**
     * @internal
     * @hidden
     */
    constructor(db, path = "", headers = {}) {
        if (!path)
            path = "";
        else if (path.charAt(0) !== "/")
            path = `/${path}`;
        this._db = db;
        this._path = path;
        this._headers = headers;
    }
    /**
     * Creates a new route relative to this route that inherits any of its default
     * HTTP headers.
     *
     * @param path - Path relative to this route.
     * @param headers - Additional headers that will be sent with each request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const users = foxx.route("/users");
     * ```
     */
    route(path, headers) {
        if (!path)
            path = "";
        else if (path.charAt(0) !== "/")
            path = `/${path}`;
        return new Route(this._db, this._path + path, {
            ...this._headers,
            ...headers,
        });
    }
    /**
     * Performs an arbitrary HTTP request relative to this route and returns the
     * server response.
     *
     * @param options - Options for performing the request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const res = await foxx.request({
     *   method: "POST",
     *   path: "/users",
     *   body: {
     *     username: "admin",
     *     password: "hunter2"
     *   }
     * });
     * ```
     */
    request(options) {
        const opts = { ...options };
        if (!opts.path || opts.path === "/")
            opts.path = "";
        else if (!this._path || opts.path.charAt(0) === "/")
            opts.path = opts.path;
        else
            opts.path = `/${opts.path}`;
        opts.basePath = this._path;
        opts.headers = { ...this._headers, ...opts.headers };
        opts.method = opts.method ? opts.method.toUpperCase() : "GET";
        return this._db.request(opts);
    }
    delete(...args) {
        const path = typeof args[0] === "string" ? args.shift() : undefined;
        const [body, qs, headers] = args;
        return this.request({ method: "DELETE", path, body, qs, headers });
    }
    get(...args) {
        const path = typeof args[0] === "string" ? args.shift() : undefined;
        const [qs, headers] = args;
        return this.request({ method: "GET", path, qs, headers });
    }
    head(...args) {
        const path = typeof args[0] === "string" ? args.shift() : undefined;
        const [qs, headers] = args;
        return this.request({ method: "HEAD", path, qs, headers });
    }
    patch(...args) {
        const path = typeof args[0] === "string" ? args.shift() : undefined;
        const [body, qs, headers] = args;
        return this.request({ method: "PATCH", path, body, qs, headers });
    }
    post(...args) {
        const path = typeof args[0] === "string" ? args.shift() : undefined;
        const [body, qs, headers] = args;
        return this.request({ method: "POST", path, body, qs, headers });
    }
    put(...args) {
        const path = typeof args[0] === "string" ? args.shift() : undefined;
        const [body, qs, headers] = args;
        return this.request({ method: "PUT", path, body, qs, headers });
    }
}
exports.Route = Route;
//# sourceMappingURL=route.js.map