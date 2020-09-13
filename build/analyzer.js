"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Analyzer = exports.isArangoAnalyzer = void 0;
const error_1 = require("./error");
const codes_1 = require("./lib/codes");
/**
 * Indicates whether the given value represents an {@link Analyzer}.
 *
 * @param analyzer - A value that might be an Analyzer.
 */
function isArangoAnalyzer(analyzer) {
    return Boolean(analyzer && analyzer.isArangoAnalyzer);
}
exports.isArangoAnalyzer = isArangoAnalyzer;
/**
 * Represents an Analyzer in a {@link Database}.
 */
class Analyzer {
    /**
     * @internal
     * @hidden
     */
    constructor(db, name) {
        this._db = db;
        this._name = name;
    }
    /**
     * @internal
     *
     * Indicates that this object represents an ArangoDB Analyzer.
     */
    get isArangoAnalyzer() {
        return true;
    }
    /**
     * Name of this Analyzer.
     *
     * See also {@link Database.analyzer}.
     */
    get name() {
        return this._name;
    }
    /**
     * Checks whether the Analyzer exists.
     *
     * @example
     * ```js
     * const db = new Database();
     * const analyzer = db.analyzer("some-analyzer");
     * const result = await analyzer.exists();
     * // result indicates whether the Analyzer exists
     * ```
     */
    async exists() {
        try {
            await this.get();
            return true;
        }
        catch (err) {
            if (error_1.isArangoError(err) && err.errorNum === codes_1.ANALYZER_NOT_FOUND) {
                return false;
            }
            throw err;
        }
    }
    /**
     * Retrieves the Analyzer definition for the Analyzer.
     *
     * @example
     * ```js
     * const db = new Database();
     * const analyzer = db.analyzer("some-analyzer");
     * const definition = await analyzer.get();
     * // definition contains the Analyzer definition
     * ```
     */
    get() {
        return this._db.request({ path: `/_api/analyzer/${this.name}` }, (res) => res.body);
    }
    /**
     * Creates a new Analyzer with the given `options` and the instance's name.
     *
     * See also {@link Database.createAnalyzer}.
     *
     * @param options - Options for creating the Analyzer.
     *
     * @example
     * ```js
     * const db = new Database();
     * const analyzer = db.analyzer("potatoes");
     * await analyzer.create({ type: "identity" });
     * // the identity Analyzer "potatoes" now exists
     * ```
     */
    create(options) {
        return this._db.request({
            method: "POST",
            path: "/_api/analyzer",
            body: { name: this.name, ...options },
        }, (res) => res.body);
    }
    /**
     * Deletes the Analyzer from the database.
     *
     * @param force - Whether the Analyzer should still be deleted even if it
     * is currently in use.
     *
     * @example
     * ```js
     * const db = new Database();
     * const analyzer = db.analyzer("some-analyzer");
     * await analyzer.drop();
     * // the Analyzer "some-analyzer" no longer exists
     * ```
     */
    drop(force = false) {
        return this._db.request({
            method: "DELETE",
            path: `/_api/analyzer/${this.name}`,
            qs: { force },
        }, (res) => res.body);
    }
}
exports.Analyzer = Analyzer;
//# sourceMappingURL=analyzer.js.map