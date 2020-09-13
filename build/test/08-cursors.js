"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const aql_1 = require("../aql");
const database_1 = require("../database");
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
const aqlQuery = aql_1.aql `FOR i In 0..10 RETURN i`;
const aqlResult = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), ms);
    });
}
describe("Item-wise Cursor API", () => {
    let db;
    let cursor;
    before(() => {
        db = new database_1.Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
    });
    after(() => {
        db.close();
    });
    beforeEach(async () => {
        cursor = await db.query(aqlQuery);
    });
    describe("for await of cursor", () => {
        it("returns each next result of the Cursor", async () => {
            let i = 0;
            for await (const value of cursor) {
                chai_1.expect(value).to.equal(aqlResult[i]);
                i += 1;
            }
            chai_1.expect(i).to.equal(aqlResult.length);
            chai_1.expect(cursor.hasNext).to.equal(false);
        });
    });
    describe("cursor.all", () => {
        it("returns an Array of all results", async () => {
            const values = await cursor.all();
            chai_1.expect(values).to.eql(aqlResult);
        });
    });
    describe("cursor.next", () => {
        it("returns the next result of the Cursor", async () => {
            const val1 = await cursor.next();
            chai_1.expect(val1).to.equal(0);
            const val2 = await cursor.next();
            chai_1.expect(val2).to.equal(1);
        });
    });
    describe("cursor.hasNext", () => {
        it("returns true if the Cursor has more results", async () => {
            chai_1.expect(cursor.hasNext).to.equal(true);
            const val = await cursor.next();
            chai_1.expect(val).to.be.a("number");
        });
        it("returns false if the Cursor is empty", async () => {
            await cursor.all();
            chai_1.expect(cursor.hasNext).to.equal(false);
        });
        it("returns true after first batch is consumed", async () => {
            const cursor = await db.query(aqlQuery, { batchSize: 1 });
            chai_1.expect(cursor.batches._batches.length).to.equal(1);
            cursor.next();
            chai_1.expect(cursor.batches._batches.length).to.equal(0);
            chai_1.expect(cursor.hasNext).to.equal(true);
        });
        it("returns false after last batch is consumed", async () => {
            const cursor = await db.query(aql_1.aql `FOR i In 0..1 RETURN i`, {
                batchSize: 2,
            });
            chai_1.expect(cursor.hasNext).to.equal(true);
            chai_1.expect(cursor.batches._batches.length).to.equal(1);
            const val1 = await cursor.next();
            chai_1.expect(val1).to.equal(0);
            chai_1.expect(cursor.hasNext).to.equal(true);
            chai_1.expect(cursor.batches._batches.length).to.equal(1);
            const val2 = await cursor.next();
            chai_1.expect(val2).to.equal(1);
            chai_1.expect(cursor.hasNext).to.equal(false);
            chai_1.expect(cursor.batches._batches.length).to.equal(0);
        });
        it("returns false after last result is consumed", async () => {
            const cursor = await db.query(aql_1.aql `FOR i In 0..1 RETURN i`, {
                batchSize: 2,
            });
            chai_1.expect(cursor.hasNext).to.equal(true);
            chai_1.expect(cursor.batches._batches.length).to.equal(1);
            const val1 = await cursor.next();
            chai_1.expect(val1).to.equal(0);
            chai_1.expect(cursor.hasNext).to.equal(true);
            chai_1.expect(cursor.batches._batches.length).to.equal(1);
            const val2 = await cursor.next();
            chai_1.expect(val2).to.equal(1);
            chai_1.expect(cursor.hasNext).to.equal(false);
            chai_1.expect(cursor.batches._batches.length).to.equal(0);
        });
        it.skip("returns 404 after timeout", async () => {
            const cursor = await db.query(aql_1.aql `FOR i In 0..1 RETURN i`, {
                batchSize: 1,
                ttl: 1,
            });
            chai_1.expect(cursor.hasNext).to.equal(true);
            chai_1.expect(cursor._batches.length).to.equal(1);
            const val = await cursor.next();
            chai_1.expect(val).to.equal(0);
            chai_1.expect(cursor.hasNext).to.equal(true);
            chai_1.expect(cursor._batches.length).to.equal(0);
            await sleep(3000);
            try {
                await cursor.next();
            }
            catch (err) {
                chai_1.expect(err.code).to.equal(404);
                return;
            }
            chai_1.expect.fail();
        });
        it("returns false after last result is consumed (with large amount of results)", async () => {
            const EXPECTED_LENGTH = 100000;
            async function loadMore(cursor, totalLength) {
                await cursor.next();
                totalLength++;
                chai_1.expect(cursor.hasNext).to.equal(totalLength !== EXPECTED_LENGTH);
                if (cursor.hasNext) {
                    await loadMore(cursor, totalLength);
                }
            }
            const cursor = await db.query(`FOR i In 1..${EXPECTED_LENGTH} RETURN i`);
            await loadMore(cursor, 0);
        });
    });
    describe("cursor.forEach", () => {
        it("invokes the callback for each value", async () => {
            const results = [];
            await cursor.forEach((value) => {
                results.push(value);
            });
            chai_1.expect(results).to.eql(aqlResult);
        });
        it("aborts if the callback returns false", async () => {
            const results = [];
            await cursor.forEach((value) => {
                results.push(value);
                if (value === 5)
                    return false;
                return;
            });
            chai_1.expect(results).to.eql([0, 1, 2, 3, 4, 5]);
        });
    });
    describe("cursor.map", () => {
        it("maps all result values over the callback", async () => {
            const results = await cursor.map((value) => value * 2);
            chai_1.expect(results).to.eql(aqlResult.map((value) => value * 2));
        });
    });
    describe("cursor.flatMap", () => {
        it("flat-maps all result values over the callback", async () => {
            const results = await cursor.flatMap((value) => [value, value * 2]);
            chai_1.expect(results).to.eql(aqlResult
                .map((value) => [value, value * 2])
                .reduce((acc, next) => {
                acc.push(...next);
                return acc;
            }, []));
        });
        it("doesn't choke on non-arrays", async () => {
            const results = await cursor.flatMap((value) => value * 2);
            chai_1.expect(results).to.eql(aqlResult.map((value) => value * 2));
        });
    });
    describe("cursor.reduce", () => {
        it("reduces the result values with the callback", async () => {
            const result = await cursor.reduce((a, b) => a + b);
            chai_1.expect(result).to.eql(aqlResult.reduce((a, b) => a + b));
        });
    });
    describe("cursor.kill", () => {
        it("kills the cursor", async () => {
            const cursor = await db.query(aql_1.aql `FOR i IN 1..5 RETURN i`, {
                batchSize: 2,
            });
            const { _host: host, _id: id } = cursor;
            chai_1.expect(cursor.batches.hasMore).to.equal(true);
            await cursor.kill();
            chai_1.expect(cursor.batches.hasMore).to.equal(false);
            try {
                await db.request({
                    method: "PUT",
                    path: `/_api/cursor/${id}`,
                    host: host,
                });
            }
            catch (e) {
                chai_1.expect(e).to.have.property("errorNum", 1600);
                return;
            }
            chai_1.expect.fail("should not be able to fetch additional result set");
        });
    });
});
describe("Batch-wise Cursor API", () => {
    let db;
    let cursor;
    before(() => {
        db = new database_1.Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
    });
    after(() => {
        db.close();
    });
    beforeEach(async () => {
        cursor = (await db.query(aqlQuery, { batchSize: 1 })).batches;
    });
    describe("for await of cursor", () => {
        it("returns each next result of the Cursor", async () => {
            let i = 0;
            for await (const value of cursor) {
                chai_1.expect(value).to.eql([aqlResult[i]]);
                i += 1;
            }
            chai_1.expect(i).to.equal(aqlResult.length);
            chai_1.expect(cursor.hasNext).to.equal(false);
        });
    });
    describe("cursor.all", () => {
        it("returns an Array of all results", async () => {
            const values = await cursor.all();
            chai_1.expect(values).to.eql(aqlResult.map((v) => [v]));
        });
    });
    describe("cursor.next", () => {
        it("returns the next result of the Cursor", async () => {
            const val1 = await cursor.next();
            chai_1.expect(val1).to.eql([0]);
            const val2 = await cursor.next();
            chai_1.expect(val2).to.eql([1]);
        });
    });
    describe("cursor.hasNext", () => {
        it("returns true if the Cursor has more results", async () => {
            chai_1.expect(cursor.hasNext).to.equal(true);
            const val = await cursor.next();
            chai_1.expect(val).to.be.an("array");
            chai_1.expect(val === null || val === void 0 ? void 0 : val[0]).to.be.a("number");
        });
        it("returns false if the Cursor is empty", async () => {
            await cursor.all();
            chai_1.expect(cursor.hasNext).to.equal(false);
        });
        it("returns true after first batch is consumed", async () => {
            const cursor = (await db.query(aqlQuery, { batchSize: 1 })).batches;
            chai_1.expect(cursor._batches.length).to.equal(1);
            cursor.next();
            chai_1.expect(cursor._batches.length).to.equal(0);
            chai_1.expect(cursor.hasNext).to.equal(true);
        });
        it("returns false after last batch is consumed", async () => {
            const cursor = (await db.query(aql_1.aql `FOR i In 0..1 RETURN i`, {
                batchSize: 1,
            })).batches;
            chai_1.expect(cursor.hasNext).to.equal(true);
            chai_1.expect(cursor._batches.length).to.equal(1);
            const val1 = await cursor.next();
            chai_1.expect(val1).to.eql([0]);
            chai_1.expect(cursor.hasNext).to.equal(true);
            chai_1.expect(cursor._batches.length).to.equal(0);
            const val2 = await cursor.next();
            chai_1.expect(val2).to.eql([1]);
            chai_1.expect(cursor.hasNext).to.equal(false);
            chai_1.expect(cursor._batches.length).to.equal(0);
        });
        it.skip("returns 404 after timeout", async () => {
            const cursor = await db.query(aql_1.aql `FOR i In 0..1 RETURN i`, {
                batchSize: 1,
                ttl: 1,
            });
            chai_1.expect(cursor.hasNext).to.equal(true);
            chai_1.expect(cursor._batches.length).to.equal(1);
            const val = await cursor.next();
            chai_1.expect(val).to.equal(0);
            chai_1.expect(cursor.hasNext).to.equal(true);
            chai_1.expect(cursor._batches.length).to.equal(0);
            await sleep(3000);
            try {
                await cursor.next();
            }
            catch (err) {
                chai_1.expect(err.code).to.equal(404);
                return;
            }
            chai_1.expect.fail();
        });
        it("returns false after last result is consumed (with large amount of results)", async () => {
            const EXPECTED_LENGTH = 100000;
            async function loadMore(cursor, totalLength) {
                await cursor.next();
                totalLength++;
                chai_1.expect(cursor.hasNext).to.equal(totalLength !== EXPECTED_LENGTH);
                if (cursor.hasNext) {
                    await loadMore(cursor, totalLength);
                }
            }
            const cursor = await db.query(`FOR i In 1..${EXPECTED_LENGTH} RETURN i`);
            await loadMore(cursor, 0);
        });
    });
    describe("cursor.forEach", () => {
        it("invokes the callback for each value", async () => {
            const results = [];
            await cursor.forEach((batch) => {
                results.push(...batch);
            });
            chai_1.expect(results).to.eql(aqlResult);
        });
        it("aborts if the callback returns false", async () => {
            const results = [];
            await cursor.forEach((batch) => {
                results.push(...batch);
                if (batch[0] === 5)
                    return false;
                return;
            });
            chai_1.expect(results).to.eql([0, 1, 2, 3, 4, 5]);
        });
    });
    describe("cursor.map", () => {
        it("maps all result values over the callback", async () => {
            const results = await cursor.map(([value]) => value * 2);
            chai_1.expect(results).to.eql(aqlResult.map((value) => value * 2));
        });
    });
    describe("cursor.flatMap", () => {
        it("flat-maps all result values over the callback", async () => {
            const results = await cursor.flatMap(([value]) => [value, value * 2]);
            chai_1.expect(results).to.eql(aqlResult
                .map((value) => [value, value * 2])
                .reduce((acc, next) => {
                acc.push(...next);
                return acc;
            }, []));
        });
        it("doesn't choke on non-arrays", async () => {
            const results = await cursor.flatMap(([value]) => value * 2);
            chai_1.expect(results).to.eql(aqlResult.map((value) => value * 2));
        });
    });
    describe("cursor.reduce", () => {
        it("reduces the result values with the callback", async () => {
            const result = await cursor.reduce((a, [b]) => a + b, 0);
            chai_1.expect(result).to.eql(aqlResult.reduce((a, b) => a + b));
        });
    });
    describe("cursor.next", () => {
        beforeEach(async () => {
            cursor = (await db.query(aql_1.aql `FOR i IN 1..10 RETURN i`, { batchSize: 5 }))
                .batches;
        });
        it("fetches the next batch when empty", async () => {
            const result = cursor._batches;
            chai_1.expect([...result.first.value.values()]).to.eql([1, 2, 3, 4, 5]);
            chai_1.expect(cursor.hasMore).to.equal(true);
            result.clear();
            chai_1.expect(await cursor.next()).to.eql([6, 7, 8, 9, 10]);
            chai_1.expect(cursor.hasMore).to.equal(false);
        });
        it("returns all fetched values", async () => {
            chai_1.expect(await cursor.next()).to.eql([1, 2, 3, 4, 5]);
            chai_1.expect(await cursor.items.next()).to.equal(6);
            chai_1.expect(await cursor.next()).to.eql([7, 8, 9, 10]);
        });
    });
    describe("cursor.kill", () => {
        it("kills the cursor", async () => {
            const cursor = await db.query(aql_1.aql `FOR i IN 1..5 RETURN i`, {
                batchSize: 2,
            });
            const { _host: host, _id: id } = cursor;
            chai_1.expect(cursor.batches.hasMore).to.equal(true);
            await cursor.kill();
            chai_1.expect(cursor.batches.hasMore).to.equal(false);
            try {
                await db.request({
                    method: "PUT",
                    path: `/_api/cursor/${id}`,
                    host: host,
                });
            }
            catch (e) {
                chai_1.expect(e).to.have.property("errorNum", 1600);
                return;
            }
            chai_1.expect.fail("should not be able to fetch additional result set");
        });
    });
});
//# sourceMappingURL=08-cursors.js.map