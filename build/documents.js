"use strict";
/**
 * ```ts
 * import type { Document, Edge } from "arangojs/document";
 * ```
 *
 * The "document" module provides document/edge related types for TypeScript.
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports._documentHandle = void 0;
/**
 * @internal
 * @hidden
 */
function _documentHandle(selector, collectionName) {
    if (typeof selector !== "string") {
        if (selector._id) {
            return _documentHandle(selector._id, collectionName);
        }
        if (selector._key) {
            return _documentHandle(selector._key, collectionName);
        }
        throw new Error("Document handle must be a string or an object with a _key or _id attribute");
    }
    if (selector.includes("/")) {
        if (!selector.startsWith(`${collectionName}/`)) {
            throw new Error(`Document ID "${selector}" does not match collection name "${collectionName}"`);
        }
        return selector;
    }
    return `${collectionName}/${selector}`;
}
exports._documentHandle = _documentHandle;
//# sourceMappingURL=documents.js.map