"use strict";
/**
 * Utility function for constructing a multipart form in the browser.
 *
 * @packageDocumentation
 * @internal
 * @hidden
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toForm = void 0;
/**
 * @internal
 * @hidden
 */
function toForm(fields, callback) {
    let form;
    try {
        form = new FormData();
        for (const key of Object.keys(fields)) {
            let value = fields[key];
            if (value === undefined)
                continue;
            if (!(value instanceof Blob) &&
                (typeof value === "object" || typeof value === "function")) {
                value = JSON.stringify(value);
            }
            form.append(key, value);
        }
    }
    catch (e) {
        callback(e);
        return;
    }
    callback(null, { body: form });
}
exports.toForm = toForm;
//# sourceMappingURL=multipart.web.js.map