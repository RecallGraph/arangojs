/**
 * ```ts
 * import type { Document, Edge } from "arangojs/document";
 * ```
 *
 * The "document" module provides document/edge related types for TypeScript.
 *
 * @packageDocumentation
 */
/**
 * Common ArangoDB metadata properties of a document.
 */
export declare type DocumentMetadata = {
    /**
     * Key of the document, which uniquely identifies the document within its
     * collection.
     */
    _key: string;
    /**
     * Unique ID of the document, which is composed of the collection name
     * and the document `_key`.
     */
    _id: string;
    /**
     * Revision of the document data.
     */
    _rev: string;
};
/**
 * ArangoDB metadata defining the relations of an edge document.
 */
export declare type EdgeMetadata = {
    /**
     * Unique ID of the document that acts as the edge's start vertex.
     */
    _from: string;
    /**
     * Unique ID of the document that acts as the edge's end vertex.
     */
    _to: string;
};
/**
 * Type representing an object that can be stored in a collection.
 */
export declare type DocumentData<T extends object = any> = T & Partial<DocumentMetadata> & Partial<EdgeMetadata>;
/**
 * Type representing an object that can be stored in an edge collection.
 */
export declare type EdgeData<T extends object = any> = T & Partial<DocumentMetadata> & EdgeMetadata;
/**
 * Type representing a document stored in a collection.
 */
export declare type Document<T extends object = any> = T & DocumentMetadata & Partial<EdgeMetadata>;
/**
 * Type representing an edge document stored in an edge collection.
 */
export declare type Edge<T extends object = any> = T & DocumentMetadata & EdgeMetadata;
/**
 * Type representing patch data for a given object type to represent a payload
 * ArangoDB can apply in a document PATCH request (i.e. a partial update).
 *
 * This differs from `Partial` in that it also applies itself to any nested
 * objects recursively.
 */
export declare type Patch<T = object> = {
    [K in keyof T]?: T[K] | Patch<T[K]>;
};
/**
 * An object with an ArangoDB document `_id` property.
 *
 * See {@link DocumentMetadata}.
 */
export declare type ObjectWithId = {
    [key: string]: any;
    _id: string;
};
/**
 * An object with an ArangoDB document `_key` property.
 *
 * See {@link DocumentMetadata}.
 */
export declare type ObjectWithKey = {
    [key: string]: any;
    _key: string;
};
/**
 * A value that can be used to identify a document within a collection in
 * arangojs methods, i.e. a partial ArangoDB document or the value of a
 * document's `_key` or `_id`.
 *
 * See {@link DocumentMetadata}.
 */
export declare type DocumentSelector = ObjectWithId | ObjectWithKey | string;
/**
 * @internal
 * @hidden
 */
export declare function _documentHandle(selector: DocumentSelector, collectionName: string): string;
//# sourceMappingURL=documents.d.ts.map