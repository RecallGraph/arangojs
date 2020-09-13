"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collection = exports.CollectionStatus = exports.CollectionType = exports.collectionToString = exports.isArangoCollection = void 0;
const cursor_1 = require("./cursor");
const documents_1 = require("./documents");
const error_1 = require("./error");
const indexes_1 = require("./indexes");
const codes_1 = require("./lib/codes");
/**
 * Indicates whether the given value represents an {@link ArangoCollection}.
 *
 * @param collection - A value that might be a collection.
 */
function isArangoCollection(collection) {
    return Boolean(collection && collection.isArangoCollection);
}
exports.isArangoCollection = isArangoCollection;
/**
 * Coerces the given collection name or {@link ArangoCollection} object to
 * a string representing the collection name.
 *
 * @param collection - Collection name or {@link ArangoCollection} object.
 */
function collectionToString(collection) {
    if (isArangoCollection(collection)) {
        return String(collection.name);
    }
    else
        return String(collection);
}
exports.collectionToString = collectionToString;
/**
 * Integer values indicating the collection type.
 */
var CollectionType;
(function (CollectionType) {
    CollectionType[CollectionType["DOCUMENT_COLLECTION"] = 2] = "DOCUMENT_COLLECTION";
    CollectionType[CollectionType["EDGE_COLLECTION"] = 3] = "EDGE_COLLECTION";
})(CollectionType = exports.CollectionType || (exports.CollectionType = {}));
/**
 * Integer values indicating the collection loading status.
 */
var CollectionStatus;
(function (CollectionStatus) {
    CollectionStatus[CollectionStatus["NEWBORN"] = 1] = "NEWBORN";
    CollectionStatus[CollectionStatus["UNLOADED"] = 2] = "UNLOADED";
    CollectionStatus[CollectionStatus["LOADED"] = 3] = "LOADED";
    CollectionStatus[CollectionStatus["UNLOADING"] = 4] = "UNLOADING";
    CollectionStatus[CollectionStatus["DELETED"] = 5] = "DELETED";
    CollectionStatus[CollectionStatus["LOADING"] = 6] = "LOADING";
})(CollectionStatus = exports.CollectionStatus || (exports.CollectionStatus = {}));
/**
 * @internal
 * @hidden
 */
class Collection {
    //#endregion
    /**
     * @internal
     * @hidden
     */
    constructor(db, name) {
        this._name = name;
        this._db = db;
    }
    //#region internals
    _get(path, qs) {
        return this._db.request({ path: `/_api/collection/${this._name}/${path}`, qs }, (res) => res.body);
    }
    _put(path, body) {
        return this._db.request({
            method: "PUT",
            path: `/_api/collection/${this._name}/${path}`,
            body,
        }, (res) => res.body);
    }
    //#endregion
    //#region metadata
    get isArangoCollection() {
        return true;
    }
    get name() {
        return this._name;
    }
    get() {
        return this._db.request({ path: `/_api/collection/${this._name}` }, (res) => res.body);
    }
    async exists() {
        try {
            await this.get();
            return true;
        }
        catch (err) {
            if (error_1.isArangoError(err) && err.errorNum === codes_1.COLLECTION_NOT_FOUND) {
                return false;
            }
            throw err;
        }
    }
    create(options) {
        const { waitForSyncReplication = undefined, enforceReplicationFactor = undefined, ...opts } = options || {};
        const qs = {};
        if (typeof waitForSyncReplication === "boolean") {
            qs.waitForSyncReplication = waitForSyncReplication ? 1 : 0;
        }
        if (typeof enforceReplicationFactor === "boolean") {
            qs.enforceReplicationFactor = enforceReplicationFactor ? 1 : 0;
        }
        return this._db.request({
            method: "POST",
            path: "/_api/collection",
            qs,
            body: {
                ...opts,
                name: this.name,
            },
        }, (res) => res.body);
    }
    properties(properties) {
        if (!properties)
            return this._get("properties");
        return this._put("properties", properties);
    }
    count() {
        return this._get("count");
    }
    async recalculateCount() {
        const body = await this._put("recalculateCount");
        return body.result;
    }
    figures() {
        return this._get("figures");
    }
    revision() {
        return this._get("revision");
    }
    checksum(options) {
        return this._get("checksum", options);
    }
    load(count) {
        return this._put("load", typeof count === "boolean" ? { count } : undefined);
    }
    async loadIndexes() {
        const body = await this._put("loadIndexesIntoMemory");
        return body.result;
    }
    unload() {
        return this._put("unload");
    }
    async rename(newName) {
        const result = await this._db.renameCollection(this._name, newName);
        this._name = newName;
        return result;
    }
    async rotate() {
        const body = await this._put("rotate");
        return body.result;
    }
    truncate() {
        return this._put("truncate");
    }
    drop(options) {
        return this._db.request({
            method: "DELETE",
            path: `/_api/collection/${this._name}`,
            qs: options,
        }, (res) => res.body);
    }
    //#endregion
    //#region crud
    getResponsibleShard(document) {
        return this._db.request({
            method: "PUT",
            path: `/_api/collection/${this.name}/responsibleShard`,
            body: document,
        }, (res) => res.body.shardId);
    }
    documentId(selector) {
        return documents_1._documentHandle(selector, this._name);
    }
    async documentExists(selector) {
        try {
            return await this._db.request({
                method: "HEAD",
                path: `/_api/document/${documents_1._documentHandle(selector, this._name)}`,
            }, () => true);
        }
        catch (err) {
            if (err.code === 404) {
                return false;
            }
            throw err;
        }
    }
    async document(selector, options = {}) {
        if (typeof options === "boolean") {
            options = { graceful: options };
        }
        const { allowDirtyRead = undefined, graceful = false } = options;
        const result = this._db.request({
            path: `/_api/document/${documents_1._documentHandle(selector, this._name)}`,
            allowDirtyRead,
        }, (res) => res.body);
        if (!graceful)
            return result;
        try {
            return await result;
        }
        catch (err) {
            if (error_1.isArangoError(err) && err.errorNum === codes_1.DOCUMENT_NOT_FOUND) {
                return null;
            }
            throw err;
        }
    }
    save(data, options) {
        return this._db.request({
            method: "POST",
            path: `/_api/document/${this._name}`,
            body: data,
            qs: options,
        }, (res) => (options && options.silent ? undefined : res.body));
    }
    saveAll(data, options) {
        return this._db.request({
            method: "POST",
            path: `/_api/document/${this._name}`,
            body: data,
            qs: options,
        }, (res) => (options && options.silent ? undefined : res.body));
    }
    replace(selector, newData, options) {
        return this._db.request({
            method: "PUT",
            path: `/_api/document/${documents_1._documentHandle(selector, this._name)}`,
            body: newData,
            qs: options,
        }, (res) => (options && options.silent ? undefined : res.body));
    }
    replaceAll(newData, options) {
        return this._db.request({
            method: "PUT",
            path: `/_api/document/${this._name}`,
            body: newData,
            qs: options,
        }, (res) => (options && options.silent ? undefined : res.body));
    }
    update(selector, newData, options) {
        return this._db.request({
            method: "PATCH",
            path: `/_api/document/${documents_1._documentHandle(selector, this._name)}`,
            body: newData,
            qs: options,
        }, (res) => (options && options.silent ? undefined : res.body));
    }
    updateAll(newData, options) {
        return this._db.request({
            method: "PATCH",
            path: `/_api/document/${this._name}`,
            body: newData,
            qs: options,
        }, (res) => (options && options.silent ? undefined : res.body));
    }
    remove(selector, options) {
        return this._db.request({
            method: "DELETE",
            path: `/_api/document/${documents_1._documentHandle(selector, this._name)}`,
            qs: options,
        }, (res) => (options && options.silent ? undefined : res.body));
    }
    removeAll(selectors, options) {
        return this._db.request({
            method: "DELETE",
            path: `/_api/document/${this._name}`,
            body: selectors.map((selector) => documents_1._documentHandle(selector, this._name)),
            qs: options,
        }, (res) => (options && options.silent ? undefined : res.body));
    }
    import(data, options = {}) {
        const qs = { ...options, collection: this._name };
        if (Array.isArray(data)) {
            qs.type = Array.isArray(data[0]) ? undefined : "documents";
            const lines = data;
            data = lines.map((line) => JSON.stringify(line)).join("\r\n") + "\r\n";
        }
        return this._db.request({
            method: "POST",
            path: "/_api/import",
            body: data,
            isBinary: true,
            qs,
        }, (res) => res.body);
    }
    //#endregion
    //#region edges
    _edges(selector, direction) {
        return this._db.request({
            path: `/_api/edges/${this._name}`,
            qs: {
                direction,
                vertex: documents_1._documentHandle(selector, this._name),
            },
        }, (res) => res.body);
    }
    edges(vertex) {
        return this._edges(vertex);
    }
    inEdges(vertex) {
        return this._edges(vertex, "in");
    }
    outEdges(vertex) {
        return this._edges(vertex, "out");
    }
    traversal(startVertex, options) {
        return this._db.request({
            method: "POST",
            path: "/_api/traversal",
            body: {
                ...options,
                startVertex,
                edgeCollection: this._name,
            },
        }, (res) => res.body.result);
    }
    //#endregion
    //#region simple queries
    list(type = "id") {
        return this._db.request({
            method: "PUT",
            path: "/_api/simple/all-keys",
            body: { type, collection: this._name },
        }, (res) => new cursor_1.BatchedArrayCursor(this._db, res.body, res.arangojsHostId).items);
    }
    all(options) {
        return this._db.request({
            method: "PUT",
            path: "/_api/simple/all",
            body: {
                ...options,
                collection: this._name,
            },
        }, (res) => new cursor_1.BatchedArrayCursor(this._db, res.body, res.arangojsHostId).items);
    }
    any() {
        return this._db.request({
            method: "PUT",
            path: "/_api/simple/any",
            body: { collection: this._name },
        }, (res) => res.body.document);
    }
    byExample(example, options) {
        return this._db.request({
            method: "PUT",
            path: "/_api/simple/by-example",
            body: {
                ...options,
                example,
                collection: this._name,
            },
        }, (res) => new cursor_1.BatchedArrayCursor(this._db, res.body, res.arangojsHostId).items);
    }
    firstExample(example) {
        return this._db.request({
            method: "PUT",
            path: "/_api/simple/first-example",
            body: {
                example,
                collection: this._name,
            },
        }, (res) => res.body.document);
    }
    removeByExample(example, options) {
        return this._db.request({
            method: "PUT",
            path: "/_api/simple/remove-by-example",
            body: {
                ...options,
                example,
                collection: this._name,
            },
        }, (res) => res.body);
    }
    replaceByExample(example, newData, options) {
        return this._db.request({
            method: "PUT",
            path: "/_api/simple/replace-by-example",
            body: {
                ...options,
                example,
                newData,
                collection: this._name,
            },
        }, (res) => res.body);
    }
    updateByExample(example, newData, options) {
        return this._db.request({
            method: "PUT",
            path: "/_api/simple/update-by-example",
            body: {
                ...options,
                example,
                newData,
                collection: this._name,
            },
        }, (res) => res.body);
    }
    lookupByKeys(keys) {
        return this._db.request({
            method: "PUT",
            path: "/_api/simple/lookup-by-keys",
            body: {
                keys,
                collection: this._name,
            },
        }, (res) => res.body.documents);
    }
    removeByKeys(keys, options) {
        return this._db.request({
            method: "PUT",
            path: "/_api/simple/remove-by-keys",
            body: {
                options: options,
                keys,
                collection: this._name,
            },
        }, (res) => res.body);
    }
    //#endregion
    //#region indexes
    indexes() {
        return this._db.request({
            path: "/_api/index",
            qs: { collection: this._name },
        }, (res) => res.body.indexes);
    }
    index(selector) {
        return this._db.request({ path: `/_api/index/${indexes_1._indexHandle(selector, this._name)}` }, (res) => res.body);
    }
    ensureIndex(options) {
        return this._db.request({
            method: "POST",
            path: "/_api/index",
            body: options,
            qs: { collection: this._name },
        }, (res) => res.body);
    }
    dropIndex(selector) {
        return this._db.request({
            method: "DELETE",
            path: `/_api/index/${indexes_1._indexHandle(selector, this._name)}`,
        }, (res) => res.body);
    }
    fulltext(attribute, query, { index, ...options } = {}) {
        return this._db.request({
            method: "PUT",
            path: "/_api/simple/fulltext",
            body: {
                ...options,
                index: index ? indexes_1._indexHandle(index, this._name) : undefined,
                attribute,
                query,
                collection: this._name,
            },
        }, (res) => new cursor_1.BatchedArrayCursor(this._db, res.body, res.arangojsHostId).items);
    }
}
exports.Collection = Collection;
//# sourceMappingURL=collection.js.map