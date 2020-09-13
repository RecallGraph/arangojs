"use strict";
/**
 * Utility function for normalizing URLs.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUrl = void 0;
/**
 * @internal
 * @hidden
 */
function normalizeUrl(url) {
    const raw = url.match(/^(tcp|ssl|tls)((?::|\+).+)/);
    if (raw)
        url = (raw[1] === "tcp" ? "http" : "https") + raw[2];
    const unix = url.match(/^(?:(https?)\+)?unix:\/\/(\/.+)/);
    if (unix)
        url = `${unix[1] || "http"}://unix:${unix[2]}`;
    return url;
}
exports.normalizeUrl = normalizeUrl;
//# sourceMappingURL=normalizeUrl.js.map