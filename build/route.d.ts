/**
 * ```ts
 * import type { Route } from "arangojs/route";
 * ```
 *
 * The "route" module provides route related types and interfaces for TypeScript.
 *
 * @packageDocumentation
 */
import { Headers, Params, RequestOptions } from "./connection";
import { Database } from "./database";
import { ArangojsResponse } from "./lib/request";
/**
 * Represents an arbitrary route relative to an ArangoDB database.
 */
export declare class Route {
    protected _db: Database;
    protected _path: string;
    protected _headers: Headers;
    /**
     * @internal
     * @hidden
     */
    constructor(db: Database, path?: string, headers?: Headers);
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
    route(path: string, headers?: Headers): Route;
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
    request(options?: RequestOptions): Promise<ArangojsResponse>;
    /**
     * Performs a DELETE request against the given path relative to this route
     * and returns the server response.
     *
     * @param path - Path relative to this route.
     * @param body - Body of the request object. Must not be a string.
     * @param qs - Query string parameters for this request.
     * @param headers - Additional headers to send with this request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const res = await foxx.delete("/users/admin");
     * ```
     */
    delete(path: string, body?: any, qs?: string | Params, headers?: Headers): Promise<ArangojsResponse>;
    /**
     * Performs a DELETE request against the given path relative to this route
     * and returns the server response.
     *
     * @param body - Body of the request object. Must not be a string.
     * @param qs - Query string parameters for this request.
     * @param headers - Additional headers to send with this request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const user = foxx.roue("/users/admin");
     * const res = await user.delete();
     * ```
     */
    delete(body?: any, qs?: Params, headers?: Headers): Promise<ArangojsResponse>;
    /**
     * Performs a GET request against the given path relative to this route
     * and returns the server response.
     *
     * @param path - Path relative to this route.
     * @param qs - Query string parameters for this request.
     * @param headers - Additional headers to send with this request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const res = await foxx.get("/users", { offset: 10, limit: 5 });
     * ```
     */
    get(path: string, qs?: string | Params, headers?: Headers): Promise<ArangojsResponse>;
    /**
     * Performs a GET request against the given path relative to this route
     * and returns the server response.
     *
     * @param qs - Query string parameters for this request.
     * @param headers - Additional headers to send with this request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const users = foxx.route("/users");
     * const res = await users.get({ offset: 10, limit: 5 });
     * ```
     */
    get(qs?: Params, headers?: Headers): Promise<ArangojsResponse>;
    /**
     * Performs a HEAD request against the given path relative to this route
     * and returns the server response.
     *
     * @param path - Path relative to this route.
     * @param qs - Query string parameters for this request.
     * @param headers - Additional headers to send with this request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const res = await foxx.head("/users", { offset: 10, limit: 5 });
     * ```
     */
    head(path: string, qs?: string | Params, headers?: Headers): Promise<ArangojsResponse>;
    /**
     * Performs a HEAD request against the given path relative to this route
     * and returns the server response.
     *
     * @param qs - Query string parameters for this request.
     * @param headers - Additional headers to send with this request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const users = foxx.route("/users");
     * const res = await users.head({ offset: 10, limit: 5 });
     * ```
     */
    head(qs?: Params, headers?: Headers): Promise<ArangojsResponse>;
    /**
     * Performs a PATCH request against the given path relative to this route
     * and returns the server response.
     *
     * @param path - Path relative to this route.
     * @param body - Body of the request object.
     * @param qs - Query string parameters for this request.
     * @param headers - Additional headers to send with this request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const res = await foxx.patch("/users/admin", { password: "admin" });
     * ```
     */
    patch(path: string, body?: any, qs?: string | Params, headers?: Headers): Promise<ArangojsResponse>;
    /**
     * Performs a PATCH request against the given path relative to this route
     * and returns the server response.
     *
     * **Note**: `body` must not be a `string`.
     *
     * @param body - Body of the request object. Must not be a string.
     * @param qs - Query string parameters for this request.
     * @param headers - Additional headers to send with this request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const user = foxx.route("/users/admin")
     * const res = await user.patch({ password: "admin" });
     * ```
     */
    patch(body?: any, qs?: string | Params, headers?: Headers): Promise<ArangojsResponse>;
    /**
     * Performs a POST request against the given path relative to this route
     * and returns the server response.
     *
     * @param path - Path relative to this route.
     * @param body - Body of the request object.
     * @param qs - Query string parameters for this request.
     * @param headers - Additional headers to send with this request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const res = await foxx.post("/users", {
     *   username: "admin",
     *   password: "hunter2"
     * });
     * ```
     */
    post(path: string, body?: any, qs?: string | Params, headers?: Headers): Promise<ArangojsResponse>;
    /**
     * Performs a POST request against the given path relative to this route
     * and returns the server response.
     *
     * **Note**: `body` must not be a `string`.
     *
     * @param body - Body of the request object. Must not be a string.
     * @param qs - Query string parameters for this request.
     * @param headers - Additional headers to send with this request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const users = foxx.route("/users");
     * const res = await users.post({
     *   username: "admin",
     *   password: "hunter2"
     * });
     * ```
     */
    post(body?: any, qs?: string | Params, headers?: Headers): Promise<ArangojsResponse>;
    /**
     * Performs a PUT request against the given path relative to this route
     * and returns the server response.
     *
     * @param path - Path relative to this route.
     * @param body - Body of the request object.
     * @param qs - Query string parameters for this request.
     * @param headers - Additional headers to send with this request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const res = await foxx.put("/users/admin/password", { password: "admin" });
     * ```
     */
    put(path: string, body?: any, qs?: string | Params, headers?: Headers): Promise<ArangojsResponse>;
    /**
     * Performs a PUT request against the given path relative to this route
     * and returns the server response.
     *
     * **Note**: `body` must not be a `string`.
     *
     * @param body - Body of the request object. Must not be a string.
     * @param qs - Query string parameters for this request.
     * @param headers - Additional headers to send with this request.
     *
     * @example
     * ```js
     * const db = new Database();
     * const foxx = db.route("/my-foxx-service");
     * const password = foxx.route("/users/admin/password");
     * const res = await password.put({ password: "admin" });
     * ```
     */
    put(body?: any, qs?: string | Params, headers?: Headers): Promise<ArangojsResponse>;
}
//# sourceMappingURL=route.d.ts.map