"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.View = exports.isArangoView = exports.ViewType = void 0;
const error_1 = require("./error");
const codes_1 = require("./lib/codes");
/**
 * String values indicating the View type.
 */
var ViewType;
(function (ViewType) {
    ViewType["ARANGOSEARCH_VIEW"] = "arangosearch";
})(ViewType = exports.ViewType || (exports.ViewType = {}));
/**
 * Indicates whether the given value represents a {@link View}.
 *
 * @param view - A value that might be a View.
 */
function isArangoView(view) {
    return Boolean(view && view.isArangoView);
}
exports.isArangoView = isArangoView;
/**
 * Represents a View in a {@link Database}.
 *
 * See {@link ArangoSearchView} for the concrete type representing an
 * ArangoSearch View.
 */
class View {
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
     * Indicates that this object represents an ArangoDB View.
     */
    get isArangoView() {
        return true;
    }
    /**
     * Name of the View.
     */
    get name() {
        return this._name;
    }
    /**
     * Retrieves general information about the View.
     *
     * @example
     * ```js
     * const db = new Database();
     * const view = db.view("some-view");
     * const data = await view.get();
     * // data contains general information about the View
     * ```
     */
    get() {
        return this._db.request({ path: `/_api/view/${this.name}` }, (res) => res.body);
    }
    /**
     * Checks whether the View exists.
     *
     * @example
     * ```js
     * const db = new Database();
     * const view = db.view("some-view");
     * const exists = await view.exists();
     * console.log(exists); // indicates whether the View exists
     * ```
     */
    async exists() {
        try {
            await this.get();
            return true;
        }
        catch (err) {
            if (error_1.isArangoError(err) && err.errorNum === codes_1.VIEW_NOT_FOUND) {
                return false;
            }
            throw err;
        }
    }
    /**
     * Creates a View with the given `options` and the instance's name.
     *
     * See also {@link Database.createView}.
     *
     * @example
     * ```js
     * const db = new Database();
     * const view = db.view("potatoes");
     * await view.create();
     * // the ArangoSearch View "potatoes" now exists
     * ```
     */
    create(options) {
        return this._db.request({
            method: "POST",
            path: "/_api/view",
            body: {
                type: ViewType.ARANGOSEARCH_VIEW,
                ...(options || {}),
                name: this.name,
            },
        }, (res) => res.body);
    }
    /**
     * Renames the View and updates the instance's `name` to `newName`.
     *
     * Additionally removes the instance from the {@link Database}'s internal
     * cache.
     *
     * **Note**: Renaming Views may not be supported when ArangoDB is
     * running in a cluster configuration.
     *
     * @param newName - The new name of the View.
     *
     * @example
     * ```js
     * const db = new Database();
     * const view1 = db.view("some-view");
     * await view1.rename("other-view");
     * const view2 = db.view("some-view");
     * const view3 = db.view("other-view");
     * // Note all three View instances are different objects but
     * // view1 and view3 represent the same ArangoDB view!
     * ```
     */
    async rename(newName) {
        const result = this._db.renameView(this._name, newName);
        this._name = newName;
        return result;
    }
    /**
     * Retrieves the View's properties.
     *
     * @example
     * ```js
     * const db = new Database();
     * const view = db.view("some-view");
     * const data = await view.properties();
     * // data contains the View's properties
     * ```
     */
    properties() {
        return this._db.request({ path: `/_api/view/${this.name}/properties` }, (res) => res.body);
    }
    /**
     * Updates the properties of the View.
     *
     * @param properties - Properties of the View to update.
     *
     * @example
     * ```js
     * const db = new Database();
     * const view = db.view("some-view");
     * const result = await view.updateProperties({
     *   consolidationIntervalMsec: 234
     * });
     * console.log(result.consolidationIntervalMsec); // 234
     * ```
     */
    updateProperties(properties) {
        return this._db.request({
            method: "PATCH",
            path: `/_api/view/${this.name}/properties`,
            body: properties || {},
        }, (res) => res.body);
    }
    /**
     * Replaces the properties of the View.
     *
     * @param properties - New properties of the View.
     *
     * @example
     * ```js
     * const db = new Database();
     * const view = db.view("some-view");
     * const result = await view.replaceProperties({
     *   consolidationIntervalMsec: 234
     * });
     * console.log(result.consolidationIntervalMsec); // 234
     * ```
     */
    replaceProperties(properties) {
        return this._db.request({
            method: "PUT",
            path: `/_api/view/${this.name}/properties`,
            body: properties || {},
        }, (res) => res.body);
    }
    /**
     * Deletes the View from the database.
     *
     * @example
     *
     * ```js
     * const db = new Database();
     * const view = db.view("some-view");
     * await view.drop();
     * // the View "some-view" no longer exists
     * ```
     */
    drop() {
        return this._db.request({
            method: "DELETE",
            path: `/_api/view/${this.name}`,
        }, (res) => res.body.result);
    }
}
exports.View = View;
//# sourceMappingURL=view.js.map