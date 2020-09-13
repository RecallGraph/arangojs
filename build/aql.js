"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aql = exports.isAqlLiteral = exports.isGeneratedAqlQuery = exports.isAqlQuery = void 0;
/**
 * ```js
 * import { aql } from "arangojs/aql";
 * ```
 *
 * The "aql" module provides the {@link aql} template string handler and
 * helper functions, as well as associated types and interfaces for TypeScript.
 *
 * The aql function and namespace is also re-exported by the "index" module.
 *
 * @packageDocumentation
 */
const collection_1 = require("./collection");
const view_1 = require("./view");
/**
 * Indicates whether the given value is an {@link AqlQuery}.
 *
 * @param query - A value that might be an `AqlQuery`.
 */
function isAqlQuery(query) {
    return Boolean(query && typeof query.query === "string" && query.bindVars);
}
exports.isAqlQuery = isAqlQuery;
/**
 * Indicates whether the given value is a {@link GeneratedAqlQuery}.
 *
 * @param query - A value that might be a `GeneratedAqlQuery`.
 *
 * @internal
 * @hidden
 */
function isGeneratedAqlQuery(query) {
    return isAqlQuery(query) && typeof query._source === "function";
}
exports.isGeneratedAqlQuery = isGeneratedAqlQuery;
/**
 * Indicates whether the given value is an {@link AqlLiteral}.
 *
 * @param literal - A value that might be an `AqlLiteral`.
 */
function isAqlLiteral(literal) {
    return Boolean(literal && typeof literal.toAQL === "function");
}
exports.isAqlLiteral = isAqlLiteral;
/**
 * Template string handler (template tag) for AQL queries.
 *
 * The `aql` tag can be used to write complex AQL queries as multi-line strings
 * without having to worry about `bindVars` and the distinction between
 * collections and regular parameters.
 *
 * Tagged template strings will return an {@link AqlQuery} object with
 * `query` and `bindVars` attributes reflecting any interpolated values.
 *
 * Any {@link ArangoCollection} instance used in a query string will be
 * recognized as a collection reference and generate an AQL collection bind
 * parameter instead of a regular AQL value bind parameter.
 *
 * **Note**: you should always use the `aql` template tag when writing
 * dynamic AQL queries instead of using untagged (normal) template strings.
 * Untagged template strings will inline any interpolated values and return
 * a plain string as result. The `aql` template tag will only inline references
 * to the interpolated values and produce an AQL query object containing both
 * the query and the values. This prevents most injection attacks when using
 * untrusted values in dynamic queries.
 *
 * @example
 * ```js
 * // Some user-supplied string that may be malicious
 * const untrustedValue = req.body.email;
 *
 * // Without aql tag: BAD! DO NOT DO THIS!
 * const badQuery = `
 *   FOR user IN users
 *   FILTER user.email == "${untrustedValue}"
 *   RETURN user
 * `;
 * // e.g. if untrustedValue is '" || user.admin == true || "':
 * // Query:
 * //   FOR user IN users
 * //   FILTER user.email == "" || user.admin == true || ""
 * //   RETURN user
 *
 * // With the aql tag: GOOD! MUCH SAFER!
 * const betterQuery = aql`
 *   FOR user IN users
 *   FILTER user.email == ${untrustedValue}
 *   RETURN user
 * `;
 * // Query:
 * //   FOR user IN users
 * //   FILTER user.email == @value0
 * //   RETURN user
 * // Bind parameters:
 * //   value0 -> untrustedValue
 * ```
 *
 * @example
 * ```js
 * const collection = db.collection("some-collection");
 * const minValue = 23;
 * const result = await db.query(aql`
 *   FOR d IN ${collection}
 *   FILTER d.num > ${minValue}
 *   RETURN d
 * `);
 *
 * // Equivalent raw query object
 * const result2 = await db.query({
 *   query: `
 *     FOR d IN @@collection
 *     FILTER d.num > @minValue
 *     RETURN d
 *   `,
 *   bindVars: {
 *     "@collection": collection.name,
 *     minValue: minValue
 *   }
 * });
 * ```
 *
 * @example
 * ```js
 * const collection = db.collection("some-collection");
 * const color = "green";
 * const filter = aql`FILTER d.color == ${color}'`;
 * const result = await db.query(aql`
 *   FOR d IN ${collection}
 *   ${filter}
 *   RETURN d
 * `);
 * ```
 */
function aql(templateStrings, ...args) {
    const strings = [...templateStrings];
    const bindVars = {};
    const bindValues = [];
    let query = strings[0];
    for (let i = 0; i < args.length; i++) {
        const rawValue = args[i];
        let value = rawValue;
        if (isGeneratedAqlQuery(rawValue)) {
            const src = rawValue._source();
            if (src.args.length) {
                query += src.strings[0];
                args.splice(i, 1, ...src.args);
                strings.splice(i, 2, strings[i] + src.strings[0], ...src.strings.slice(1, src.args.length), src.strings[src.args.length] + strings[i + 1]);
            }
            else {
                query += rawValue.query + strings[i + 1];
                args.splice(i, 1);
                strings.splice(i, 2, strings[i] + rawValue.query + strings[i + 1]);
            }
            i -= 1;
            continue;
        }
        if (rawValue === undefined) {
            query += strings[i + 1];
            continue;
        }
        if (isAqlLiteral(rawValue)) {
            query += `${rawValue.toAQL()}${strings[i + 1]}`;
            continue;
        }
        const index = bindValues.indexOf(rawValue);
        const isKnown = index !== -1;
        let name = `value${isKnown ? index : bindValues.length}`;
        if (collection_1.isArangoCollection(rawValue) || view_1.isArangoView(rawValue)) {
            name = `@${name}`;
            value = rawValue.name;
        }
        if (!isKnown) {
            bindValues.push(rawValue);
            bindVars[name] = value;
        }
        query += `@${name}${strings[i + 1]}`;
    }
    return {
        query,
        bindVars,
        _source: () => ({ strings, args }),
    };
}
exports.aql = aql;
(function (aql) {
    /**
     * Marks an arbitrary scalar value (i.e. a string, number or boolean) as
     * safe for being inlined directly into AQL queries when used in an `aql`
     * template string, rather than being converted into a bind parameter.
     *
     * **Note**: Nesting `aql` template strings is a much safer alternative for
     * most use cases. This low-level helper function only exists to help with
     * rare edge cases where a trusted AQL query fragment must be read from a
     * string (e.g. when reading query fragments from JSON) and should only be
     * used as a last resort.
     *
     * @example
     * ```js
     * // BAD! DO NOT DO THIS!
     * const sortDirection = aql.literal('ASC');
     *
     * // GOOD! DO THIS INSTEAD!
     * const sortDirection = aql`ASC`;
     * ```
     *
     * @example
     * ```js
     * // BAD! DO NOT DO THIS!
     * const filterColor = aql.literal('FILTER d.color == "green"');
     * const result = await db.query(aql`
     *   FOR d IN some-collection
     *   ${filterColor}
     *   RETURN d
     * `);
     *
     * // GOOD! DO THIS INSTEAD!
     * const color = "green";
     * const filterColor = aql`FILTER d.color === ${color}`;
     * const result = await db.query(aql`
     *   FOR d IN some-collection
     *   ${filterColor}
     *   RETURN d
     * `);
     * ```
     *
     * @example
     * ```js
     * // WARNING: We explicitly trust the environment variable to be safe!
     * const filter = aql.literal(process.env.FILTER_STATEMENT);
     * const users = await db.query(aql`
     *   FOR user IN users
     *   ${filter}
     *   RETURN user
     * `);
     * ```
     */
    function literal(value) {
        if (isAqlLiteral(value)) {
            return value;
        }
        return {
            toAQL() {
                if (value === undefined) {
                    return "";
                }
                return String(value);
            },
        };
    }
    aql.literal = literal;
    /**
     * Constructs {@link AqlQuery} objects from an array of arbitrary values.
     *
     * **Note**: Nesting `aql` template strings is a much safer alternative
     * for most use cases. This low-level helper function only exists to
     * complement the `aql` tag when constructing complex queries from dynamic
     * arrays of query fragments.
     *
     * @param values - Array of values to join. These values will behave exactly
     * like values interpolated in an `aql` template string.
     * @param sep - Seperator to insert between values. This value will behave
     * exactly like a value passed to {@link aql.literal}, i.e. it will be
     * inlined as-is, rather than being converted into a bind parameter.
     *
     * @example
     * ```js
     * const users = db.collection("users");
     * const filters = [];
     * if (adminsOnly) filters.push(aql`FILTER user.admin`);
     * if (activeOnly) filters.push(aql`FILTER user.active`);
     * const result = await db.query(aql`
     *   FOR user IN ${users}
     *   ${aql.join(filters)}
     *   RETURN user
     * `);
     * ```
     *
     * @example
     * ```js
     * const users = db.collection("users");
     * const keys = ["jreyes", "ghermann"];
     *
     * // BAD! NEEDLESSLY COMPLEX!
     * const docs = keys.map(key => aql`DOCUMENT(${users}, ${key}`));
     * const result = await db.query(aql`
     *   FOR user IN [
     *     ${aql.join(docs, ", ")}
     *   ]
     *   RETURN user
     * `);
     * // Query:
     * //   FOR user IN [
     * //     DOCUMENT(@@value0, @value1), DOCUMENT(@@value0, @value2)
     * //   ]
     * //   RETURN user
     * // Bind parameters:
     * //   @value0 -> "users"
     * //   value1 -> "jreyes"
     * //   value2 -> "ghermann"
     *
     * // GOOD! MUCH SIMPLER!
     * const result = await db.query(aql`
     *   FOR key IN ${keys}
     *   LET user = DOCUMENT(${users}, key)
     *   RETURN user
     * `);
     * // Query:
     * //   FOR user IN @value0
     * //   LET user = DOCUMENT(@@value1, key)
     * //   RETURN user
     * // Bind parameters:
     * //   value0 -> ["jreyes", "ghermann"]
     * //   @value1 -> "users"
     * ```
     */
    function join(values, sep = " ") {
        if (!values.length) {
            return aql ``;
        }
        if (values.length === 1) {
            return aql `${values[0]}`;
        }
        return aql(["", ...Array(values.length - 1).fill(sep), ""], ...values);
    }
    aql.join = join;
})(aql = exports.aql || (exports.aql = {}));
//# sourceMappingURL=aql.js.map