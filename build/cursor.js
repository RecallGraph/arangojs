"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayCursor = exports.BatchedArrayCursor = void 0;
/**
 * ```ts
 * import type { ArrayCursor, BatchedArrayCursor } from "arangojs/cursor";
 * ```
 *
 * The "cursor" module provides cursor-related interfaces for TypeScript.
 *
 * @packageDocumentation
 */
const x3_linkedlist_1 = require("x3-linkedlist");
/**
 * The `BatchedArrayCursor` provides a batch-wise API to an {@link ArrayCursor}.
 *
 * When using TypeScript, cursors can be cast to a specific item type in order
 * to increase type safety.
 *
 * @param T - Type to use for each item. Defaults to `any`.
 *
 * @example
 * ```ts
 * const db = new Database();
 * const query = aql`FOR x IN 1..5 RETURN x`;
 * const cursor = await db.query(query) as ArrayCursor<number>;
 * const batches = cursor.batches;
 * ```
 *
 * @example
 * ```js
 * const db = new Database();
 * const query = aql`FOR x IN 1..10000 RETURN x`;
 * const cursor = await db.query(query, { batchSize: 10 });
 * for await (const batch of cursor.batches) {
 *   // Process all values in a batch in parallel
 *   await Promise.all(batch.map(
 *     value => asyncProcessValue(value)
 *   ));
 * }
 * ```
 */
class BatchedArrayCursor {
    /**
     * @internal
     * @hidden
     */
    constructor(db, body, host, allowDirtyRead) {
        const initialBatch = new x3_linkedlist_1.LinkedList(body.result);
        const batches = new x3_linkedlist_1.LinkedList([initialBatch]);
        this._db = db;
        this._batches = batches;
        this._id = body.id;
        this._hasMore = Boolean(body.id && body.hasMore);
        this._host = host;
        this._count = body.count;
        this._extra = body.extra;
        this._allowDirtyRead = allowDirtyRead;
        this._itemsCursor = new ArrayCursor(this, {
            get isEmpty() {
                return !batches.length;
            },
            more: () => this._more(),
            shift: () => {
                var _a, _b;
                let batch = (_a = batches.first) === null || _a === void 0 ? void 0 : _a.value;
                while (batch && !batch.length) {
                    batches.shift();
                    batch = (_b = batches.first) === null || _b === void 0 ? void 0 : _b.value;
                }
                if (!batch)
                    return undefined;
                const value = batch.shift();
                if (!batch.length)
                    batches.shift();
                return value;
            },
        });
    }
    async _more() {
        if (!this.hasMore)
            return;
        const res = await this._db.request({
            method: "PUT",
            path: `/_api/cursor/${this._id}`,
            host: this._host,
            allowDirtyRead: this._allowDirtyRead,
        });
        this._batches.push(new x3_linkedlist_1.LinkedList(res.body.result));
        this._hasMore = res.body.hasMore;
    }
    /**
     * An {@link ArrayCursor} providing item-wise access to the cursor result set.
     *
     * See also {@link ArrayCursor.batches}.
     */
    get items() {
        return this._itemsCursor;
    }
    /**
     * Additional information about the cursor.
     */
    get extra() {
        return this._extra;
    }
    /**
     * Total number of documents in the query result. Only available if the
     * `count` option was used.
     */
    get count() {
        return this._count;
    }
    /**
     * Whether the cursor has any remaining batches that haven't yet been
     * fetched. If set to `false`, all batches have been fetched and no
     * additional requests to the server will be made when consuming any
     * remaining batches from this cursor.
     */
    get hasMore() {
        return this._hasMore;
    }
    /**
     * Whether the cursor has more batches. If set to `false`, the cursor has
     * already been depleted and contains no more batches.
     */
    get hasNext() {
        return this.hasMore || Boolean(this._batches.length);
    }
    /**
     * Enables use with `for await` to deplete the cursor by asynchronously
     * yielding every batch in the cursor's remaining result set.
     *
     * **Note**: If the result set spans multiple batches, any remaining batches
     * will only be fetched on demand. Depending on the cursor's TTL and the
     * processing speed, this may result in the server discarding the cursor
     * before it is fully depleted.
     *
     * @example
     * ```js
     * const cursor = await db.query(aql`
     *   FOR user IN users
     *   FILTER user.isActive
     *   RETURN user
     * `);
     * for await (const users of cursor.batches) {
     *   for (const user of users) {
     *     console.log(user.email, user.isAdmin);
     *   }
     * }
     * ```
     */
    async *[Symbol.asyncIterator]() {
        while (this.hasNext) {
            yield this.next();
        }
        return undefined;
    }
    /**
     * Loads all remaining batches from the server.
     *
     * **Warning**: This may impact memory use when working with very large
     * query result sets.
     *
     * @example
     * ```js
     * const cursor = await db.query(
     *   aql`FOR x IN 1..5 RETURN x`,
     *   { batchSize: 1 }
     * );
     * console.log(cursor.hasMore); // true
     * await cursor.batches.loadAll();
     * console.log(cursor.hasMore); // false
     * console.log(cursor.hasNext); // true
     * for await (const item of cursor) {
     *   console.log(item);
     *   // No server roundtrips necessary any more
     * }
     * ```
     */
    async loadAll() {
        while (this._hasMore) {
            await this._more();
        }
    }
    /**
     * Depletes the cursor, then returns an array containing all batches in the
     * cursor's remaining result list.
     *
     * @example
     * ```js
     * const cursor = await db.query(
     *   aql`FOR x IN 1..5 RETURN x`,
     *   { batchSize: 2 }
     * );
     * const result = await cursor.batches.all(); // [[1, 2], [3, 4], [5]]
     * console.log(cursor.hasNext); // false
     * ```
     */
    async all() {
        return this.map((batch) => batch);
    }
    /**
     * Advances the cursor and returns all remaining values in the cursor's
     * current batch. If the current batch has already been exhausted, fetches
     * the next batch from the server and returns it, or `undefined` if the
     * cursor has been depleted.
     *
     * **Note**: If the result set spans multiple batches, any remaining batches
     * will only be fetched on demand. Depending on the cursor's TTL and the
     * processing speed, this may result in the server discarding the cursor
     * before it is fully depleted.
     *
     * @example
     * ```js
     * const cursor = await db.query(
     *   aql`FOR i IN 1..10 RETURN i`,
     *   { batchSize: 5 }
     * );
     * const firstBatch = await cursor.batches.next(); // [1, 2, 3, 4, 5]
     * await cursor.next(); // 6
     * const lastBatch = await cursor.batches.next(); // [7, 8, 9, 10]
     * console.log(cursor.hasNext); // false
     * ```
     */
    async next() {
        while (!this._batches.length && this.hasNext) {
            await this._more();
        }
        if (!this._batches.length) {
            return undefined;
        }
        const batch = this._batches.shift();
        return batch && [...batch.values()];
    }
    /**
     * Advances the cursor by applying the `callback` function to each item in
     * the cursor's remaining result list until the cursor is depleted or
     * `callback` returns the exact value `false`. Returns a promise that
     * evalues to `true` unless the function returned `false`.
     *
     * **Note**: If the result set spans multiple batches, any remaining batches
     * will only be fetched on demand. Depending on the cursor's TTL and the
     * processing speed, this may result in the server discarding the cursor
     * before it is fully depleted.
     *
     * See also:
     * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach | `Array.prototype.forEach`}.
     *
     * @param callback - Function to execute on each element.
     *
     * @example
     * ```js
     * const cursor = await db.query(
     *   aql`FOR x IN 1..5 RETURN x`,
     *   { batchSize: 2 }
     * );
     * const result = await cursor.batches.forEach((currentBatch) => {
     *   for (const value of currentBatch) {
     *     console.log(value);
     *   }
     * });
     * console.log(result) // true
     * console.log(cursor.hasNext); // false
     * ```
     *
     * @example
     * ```js
     * const cursor = await db.query(
     *   aql`FOR x IN 1..5 RETURN x`,
     *   { batchSize: 2 }
     * );
     * const result = await cursor.batches.forEach((currentBatch) => {
     *   for (const value of currentBatch) {
     *     console.log(value);
     *   }
     *   return false; // stop after the first batch
     * });
     * console.log(result); // false
     * console.log(cursor.hasNext); // true
     * ```
     */
    async forEach(callback) {
        let index = 0;
        while (this.hasNext) {
            const currentBatch = await this.next();
            const result = callback(currentBatch, index, this);
            index++;
            if (result === false)
                return result;
            if (this.hasNext)
                await this._more();
        }
        return true;
    }
    /**
     * Depletes the cursor by applying the `callback` function to each batch in
     * the cursor's remaining result list. Returns an array containing the
     * return values of `callback` for each batch.
     *
     * **Note**: This creates an array of all return values, which may impact
     * memory use when working with very large query result sets. Consider using
     * {@link BatchedArrayCursor.forEach}, {@link BatchedArrayCursor.reduce} or
     * {@link BatchedArrayCursor.flatMap} instead.
     *
     * See also:
     * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map | `Array.prototype.map`}.
     *
     * @param R - Return type of the `callback` function.
     * @param callback - Function to execute on each element.
     *
     * @example
     * ```js
     * const cursor = await db.query(
     *   aql`FOR x IN 1..5 RETURN x`,
     *   { batchSize: 2 }
     * );
     * const squares = await cursor.batches.map((currentBatch) => {
     *   return currentBatch.map((value) => value ** 2);
     * });
     * console.log(squares); // [[1, 4], [9, 16], [25]]
     * console.log(cursor.hasNext); // false
     * ```
     */
    async map(callback) {
        let index = 0;
        let result = [];
        while (this.hasNext) {
            const currentBatch = await this.next();
            result.push(callback(currentBatch, index, this));
            index++;
        }
        return result;
    }
    /**
     * Depletes the cursor by applying the `callback` function to each batch in
     * the cursor's remaining result list. Returns an array containing the
     * return values of `callback` for each batch, flattened to a depth of 1.
     *
     * **Note**: If the result set spans multiple batches, any remaining batches
     * will only be fetched on demand. Depending on the cursor's TTL and the
     * processing speed, this may result in the server discarding the cursor
     * before it is fully depleted.
     *
     * See also:
     * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap | `Array.prototype.flatMap`}.
     *
     * @param R - Return type of the `callback` function.
     * @param callback - Function to execute on each element.
     *
     * @example
     * ```js
     * const cursor = await db.query(
     *   aql`FOR x IN 1..5 RETURN x`,
     *   { batchSize: 2 }
     * );
     * const squares = await cursor.batches.flatMap((currentBatch) => {
     *   return currentBatch.map((value) => value ** 2);
     * });
     * console.log(squares); // [1, 1, 2, 4, 3, 9, 4, 16, 5, 25]
     * console.log(cursor.hasNext); // false
     * ```
     *
     * @example
     * ```js
     * const cursor = await db.query(
     *   aql`FOR x IN 1..5 RETURN x`,
     *   { batchSize: 1 }
     * );
     * const odds = await cursor.batches.flatMap((currentBatch) => {
     *   if (currentBatch[0] % 2 === 0) {
     *     return []; // empty array flattens into nothing
     *   }
     *   return currentBatch;
     * });
     * console.logs(odds); // [1, 3, 5]
     * ```
     */
    async flatMap(callback) {
        let index = 0;
        let result = [];
        while (this.hasNext) {
            const currentBatch = await this.next();
            const value = callback(currentBatch, index, this);
            if (Array.isArray(value)) {
                result.push(...value);
            }
            else {
                result.push(value);
            }
            index++;
        }
        return result;
    }
    async reduce(reducer, initialValue) {
        let index = 0;
        if (!this.hasNext)
            return initialValue;
        if (initialValue === undefined) {
            initialValue = (await this.next());
            index += 1;
        }
        let value = initialValue;
        while (this.hasNext) {
            const currentBatch = await this.next();
            value = reducer(value, currentBatch, index, this);
            index++;
        }
        return value;
    }
    /**
     * Kills the cursor and frees up associated database resources.
     *
     * This method has no effect if all batches have already been fetched.
     *
     * @example
     * ```js
     * const cursor1 = await db.query(aql`FOR x IN 1..5 RETURN x`);
     * console.log(cursor1.hasMore); // false
     * await cursor1.kill(); // no effect
     *
     * const cursor2 = await db.query(
     *   aql`FOR x IN 1..5 RETURN x`,
     *   { batchSize: 2 }
     * );
     * console.log(cursor2.hasMore); // true
     * await cursor2.kill(); // cursor is depleted
     * ```
     */
    async kill() {
        if (!this.hasNext)
            return undefined;
        return this._db.request({
            method: "DELETE",
            path: `/_api/cursor/${this._id}`,
        }, () => {
            this._hasMore = false;
            return undefined;
        });
    }
}
exports.BatchedArrayCursor = BatchedArrayCursor;
/**
 * The `ArrayCursor` type represents a cursor returned from a
 * {@link Database.query}.
 *
 * When using TypeScript, cursors can be cast to a specific item type in order
 * to increase type safety.
 *
 * See also {@link BatchedArrayCursor}.
 *
 * @param T - Type to use for each item. Defaults to `any`.
 *
 * @example
 * ```ts
 * const db = new Database();
 * const query = aql`FOR x IN 1..5 RETURN x`;
 * const result = await db.query(query) as ArrayCursor<number>;
 * ```
 *
 * @example
 * ```js
 * const db = new Database();
 * const query = aql`FOR x IN 1..10 RETURN x`;
 * const cursor = await db.query(query);
 * for await (const value of cursor) {
 *   // Process each value asynchronously
 *   await processValue(value);
 * }
 * ```
 */
class ArrayCursor {
    constructor(batchedCursor, view) {
        this._batches = batchedCursor;
        this._view = view;
    }
    /**
     * A {@link BatchedArrayCursor} providing batch-wise access to the cursor
     * result set.
     *
     * See also {@link BatchedArrayCursor.items}.
     */
    get batches() {
        return this._batches;
    }
    /**
     * Additional information about the cursor.
     */
    get extra() {
        return this.batches.extra;
    }
    /**
     * Total number of documents in the query result. Only available if the
     * `count` option was used.
     */
    get count() {
        return this.batches.count;
    }
    /**
     * Whether the cursor has more values. If set to `false`, the cursor has
     * already been depleted and contains no more items.
     */
    get hasNext() {
        return this.batches.hasNext;
    }
    /**
     * Enables use with `for await` to deplete the cursor by asynchronously
     * yielding every value in the cursor's remaining result set.
     *
     * **Note**: If the result set spans multiple batches, any remaining batches
     * will only be fetched on demand. Depending on the cursor's TTL and the
     * processing speed, this may result in the server discarding the cursor
     * before it is fully depleted.
     *
     * @example
     * ```js
     * const cursor = await db.query(aql`
     *   FOR user IN users
     *   FILTER user.isActive
     *   RETURN user
     * `);
     * for await (const user of cursor) {
     *   console.log(user.email, user.isAdmin);
     * }
     * ```
     */
    async *[Symbol.asyncIterator]() {
        while (this.hasNext) {
            yield this.next();
        }
        return undefined;
    }
    /**
     * Depletes the cursor, then returns an array containing all values in the
     * cursor's remaining result list.
     *
     * @example
     * ```js
     * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
     * const result = await cursor.all(); // [1, 2, 3, 4, 5]
     * console.log(cursor.hasNext); // false
     * ```
     */
    async all() {
        return this.batches.flatMap((v) => v);
    }
    /**
     * Advances the cursor and returns the next value in the cursor's remaining
     * result list, or `undefined` if the cursor has been depleted.
     *
     * **Note**: If the result set spans multiple batches, any remaining batches
     * will only be fetched on demand. Depending on the cursor's TTL and the
     * processing speed, this may result in the server discarding the cursor
     * before it is fully depleted.
     *
     * @example
     * ```js
     * const cursor = await db.query(aql`FOR x IN 1..3 RETURN x`);
     * const one = await cursor.next(); // 1
     * const two = await cursor.next(); // 2
     * const three = await cursor.next(); // 3
     * const empty = await cursor.next(); // undefined
     * ```
     */
    async next() {
        while (this._view.isEmpty && this.batches.hasMore) {
            await this._view.more();
        }
        if (this._view.isEmpty) {
            return undefined;
        }
        return this._view.shift();
    }
    /**
     * Advances the cursor by applying the `callback` function to each item in
     * the cursor's remaining result list until the cursor is depleted or
     * `callback` returns the exact value `false`. Returns a promise that
     * evalues to `true` unless the function returned `false`.
     *
     * **Note**: If the result set spans multiple batches, any remaining batches
     * will only be fetched on demand. Depending on the cursor's TTL and the
     * processing speed, this may result in the server discarding the cursor
     * before it is fully depleted.
     *
     * See also:
     * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach | `Array.prototype.forEach`}.
     *
     * @param callback - Function to execute on each element.
     *
     * @example
     * ```js
     * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
     * const result = await cursor.forEach((currentValue) => {
     *   console.log(currentValue);
     * });
     * console.log(result) // true
     * console.log(cursor.hasNext); // false
     * ```
     *
     * @example
     * ```js
     * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
     * const result = await cursor.forEach((currentValue) => {
     *   console.log(currentValue);
     *   return false; // stop after the first item
     * });
     * console.log(result); // false
     * console.log(cursor.hasNext); // true
     * ```
     */
    async forEach(callback) {
        let index = 0;
        while (this.hasNext) {
            const value = await this.next();
            const result = callback(value, index, this);
            index++;
            if (result === false)
                return result;
        }
        return true;
    }
    /**
     * Depletes the cursor by applying the `callback` function to each item in
     * the cursor's remaining result list. Returns an array containing the
     * return values of `callback` for each item.
     *
     * **Note**: This creates an array of all return values, which may impact
     * memory use when working with very large query result sets. Consider using
     * {@link ArrayCursor.forEach}, {@link ArrayCursor.reduce} or
     * {@link ArrayCursor.flatMap} instead.
     *
     * See also:
     * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map | `Array.prototype.map`}.
     *
     * @param R - Return type of the `callback` function.
     * @param callback - Function to execute on each element.
     *
     * @example
     * ```js
     * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
     * const squares = await cursor.map((currentValue) => {
     *   return currentValue ** 2;
     * });
     * console.log(squares); // [1, 4, 9, 16, 25]
     * console.log(cursor.hasNext); // false
     * ```
     */
    async map(callback) {
        let index = 0;
        let result = [];
        while (this.hasNext) {
            const value = await this.next();
            result.push(callback(value, index, this));
            index++;
        }
        return result;
    }
    /**
     * Depletes the cursor by applying the `callback` function to each item in
     * the cursor's remaining result list. Returns an array containing the
     * return values of `callback` for each item, flattened to a depth of 1.
     *
     * **Note**: If the result set spans multiple batches, any remaining batches
     * will only be fetched on demand. Depending on the cursor's TTL and the
     * processing speed, this may result in the server discarding the cursor
     * before it is fully depleted.
     *
     * See also:
     * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap | `Array.prototype.flatMap`}.
     *
     * @param R - Return type of the `callback` function.
     * @param callback - Function to execute on each element.
     *
     * @example
     * ```js
     * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
     * const squares = await cursor.flatMap((currentValue) => {
     *   return [currentValue, currentValue ** 2];
     * });
     * console.log(squares); // [1, 1, 2, 4, 3, 9, 4, 16, 5, 25]
     * console.log(cursor.hasNext); // false
     * ```
     *
     * @example
     * ```js
     * const cursor = await db.query(aql`FOR x IN 1..5 RETURN x`);
     * const odds = await cursor.flatMap((currentValue) => {
     *   if (currentValue % 2 === 0) {
     *     return []; // empty array flattens into nothing
     *   }
     *   return currentValue; // or [currentValue]
     * });
     * console.logs(odds); // [1, 3, 5]
     * ```
     */
    async flatMap(callback) {
        let index = 0;
        let result = [];
        while (this.hasNext) {
            const value = await this.next();
            const item = callback(value, index, this);
            if (Array.isArray(item)) {
                result.push(...item);
            }
            else {
                result.push(item);
            }
            index++;
        }
        return result;
    }
    async reduce(reducer, initialValue) {
        let index = 0;
        if (!this.hasNext)
            return initialValue;
        if (initialValue === undefined) {
            const value = (await this.next());
            initialValue = value;
            index += 1;
        }
        let value = initialValue;
        while (this.hasNext) {
            const item = await this.next();
            value = reducer(value, item, index, this);
            index++;
        }
        return value;
    }
    /**
     * Kills the cursor and frees up associated database resources.
     *
     * This method has no effect if all batches have already been fetched.
     *
     * @example
     * ```js
     * const cursor1 = await db.query(aql`FOR x IN 1..5 RETURN x`);
     * console.log(cursor1.hasMore); // false
     * await cursor1.kill(); // no effect
     *
     * const cursor2 = await db.query(
     *   aql`FOR x IN 1..5 RETURN x`,
     *   { batchSize: 2 }
     * );
     * console.log(cursor2.hasMore); // true
     * await cursor2.kill(); // cursor is depleted
     * ```
     */
    async kill() {
        return this.batches.kill();
    }
}
exports.ArrayCursor = ArrayCursor;
//# sourceMappingURL=cursor.js.map