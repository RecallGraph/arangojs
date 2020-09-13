"use strict";
/**
 * Node.js implementation of the HTTP(S) request function.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequest = exports.isBrowser = void 0;
const http_1 = require("http");
const https_1 = require("https");
const url_1 = require("url");
const btoa_1 = require("./btoa");
const joinPath_1 = require("./joinPath");
const omit_1 = require("./omit");
/**
 * @internal
 * @hidden
 */
exports.isBrowser = false;
/**
 * Create a function for performing requests against a given host.
 *
 * @param baseUrl - Base URL of the host, i.e. protocol, port and domain name.
 * @param agentOptions - Options to use for creating the agent.
 * @param agent - Agent to use for performing requests.
 *
 * @internal
 * @hidden
 */
function createRequest(baseUrl, agentOptions, agent) {
    const baseUrlParts = url_1.parse(baseUrl);
    if (!baseUrlParts.protocol) {
        throw new Error(`Invalid URL (no protocol): ${baseUrl}`);
    }
    const isTls = baseUrlParts.protocol === "https:";
    let socketPath;
    if (baseUrl.startsWith(`${baseUrlParts.protocol}//unix:`)) {
        if (!baseUrlParts.pathname) {
            throw new Error(`Unix socket URL must be in the format http://unix:/socket/path, http+unix:///socket/path or unix:///socket/path not ${baseUrl}`);
        }
        const i = baseUrlParts.pathname.indexOf(":");
        if (i === -1) {
            socketPath = baseUrlParts.pathname;
            delete baseUrlParts.pathname;
        }
        else {
            socketPath = baseUrlParts.pathname.slice(0, i);
            baseUrlParts.pathname = baseUrlParts.pathname.slice(i + 1);
            if (baseUrlParts.pathname === "") {
                delete baseUrlParts.pathname;
            }
        }
    }
    if (socketPath && !socketPath.replace(/\//g, "").length) {
        throw new Error(`Invalid URL (empty unix socket path): ${baseUrl}`);
    }
    if (!agent) {
        const opts = omit_1.omit(agentOptions, ["before", "after"]);
        if (isTls)
            agent = new https_1.Agent(opts);
        else
            agent = new http_1.Agent(opts);
    }
    return Object.assign(function request({ method, url, headers, body, timeout }, callback) {
        let path = baseUrlParts.pathname
            ? url.pathname
                ? joinPath_1.joinPath(baseUrlParts.pathname, url.pathname)
                : baseUrlParts.pathname
            : url.pathname;
        const search = url.search
            ? baseUrlParts.search
                ? `${baseUrlParts.search}&${url.search.slice(1)}`
                : url.search
            : baseUrlParts.search;
        if (search)
            path += search;
        if (body && !headers["content-length"]) {
            headers["content-length"] = String(Buffer.byteLength(body));
        }
        if (!headers["authorization"]) {
            headers["authorization"] = `Basic ${btoa_1.btoa(baseUrlParts.auth || "root:")}`;
        }
        const options = { path, method, headers, agent };
        if (socketPath) {
            options.socketPath = socketPath;
        }
        else {
            options.host = baseUrlParts.hostname;
            options.port = baseUrlParts.port;
        }
        let called = false;
        try {
            const req = (isTls ? https_1.request : http_1.request)(options, (res) => {
                const data = [];
                res.on("data", (chunk) => data.push(chunk));
                res.on("end", () => {
                    const response = res;
                    response.request = req;
                    response.body = Buffer.concat(data);
                    if (called)
                        return;
                    called = true;
                    if (agentOptions.after) {
                        agentOptions.after(null, response);
                    }
                    callback(null, response);
                });
            });
            if (timeout) {
                req.setTimeout(timeout);
            }
            req.on("timeout", () => {
                req.abort();
            });
            req.on("error", (err) => {
                const error = err;
                error.request = req;
                if (called)
                    return;
                called = true;
                if (agentOptions.after) {
                    agentOptions.after(error);
                }
                callback(error);
            });
            if (body)
                req.write(body);
            if (agentOptions.before) {
                agentOptions.before(req);
            }
            req.end();
        }
        catch (e) {
            if (called)
                return;
            called = true;
            setTimeout(() => {
                callback(e);
            }, 0);
        }
    }, {
        close() {
            agent.destroy();
        },
    });
}
exports.createRequest = createRequest;
//# sourceMappingURL=request.node.js.map