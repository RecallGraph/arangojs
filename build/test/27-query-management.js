"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const aql_1 = require("../aql");
const cursor_1 = require("../cursor");
const database_1 = require("../database");
const error_1 = require("../error");
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
describe("Query Management API", function () {
    const dbName = `testdb_${Date.now()}`;
    let db;
    before(async () => {
        db = new database_1.Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
        await db.createDatabase(dbName);
        db.useDatabase(dbName);
    });
    after(async () => {
        try {
            db.useDatabase("_system");
            await db.dropDatabase(dbName);
        }
        finally {
            db.close();
        }
    });
    describe("database.query", () => {
        it("returns a cursor for the query result", (done) => {
            db.query("RETURN 23")
                .then((cursor) => {
                chai_1.expect(cursor).to.be.an.instanceof(cursor_1.ArrayCursor);
                done();
            })
                .catch(done);
        });
        it("throws an exception on error", async () => {
            try {
                await db.query("FOR i IN no RETURN i");
            }
            catch (err) {
                chai_1.expect(err).is.instanceof(error_1.ArangoError);
                chai_1.expect(err).to.have.property("code", 404);
                chai_1.expect(err).to.have.property("errorNum", 1203);
                return;
            }
            chai_1.expect.fail();
        });
        it("times out if a timeout is set and exceeded", async () => {
            try {
                await db.query(aql_1.aql `RETURN SLEEP(0.02)`, { timeout: 10 });
            }
            catch (err) {
                chai_1.expect(err).is.instanceof(Error);
                chai_1.expect(err).is.not.instanceof(error_1.ArangoError);
                chai_1.expect(err).to.have.property("code", "ECONNRESET");
                return;
            }
            chai_1.expect.fail();
        });
        it("does not time out if a timeout is set and not exceeded", async () => {
            try {
                await db.query(aql_1.aql `RETURN SLEEP(0.01)`, { timeout: 1000 });
            }
            catch (err) {
                chai_1.expect.fail();
            }
        });
        it("supports bindVars", async () => {
            const cursor = await db.query("RETURN @x", { x: 5 });
            const value = await cursor.next();
            chai_1.expect(value).to.equal(5);
        });
        it("supports options", async () => {
            const cursor = await db.query("FOR x IN 1..10 RETURN x", undefined, {
                batchSize: 2,
                count: true,
            });
            chai_1.expect(cursor.count).to.equal(10);
            chai_1.expect(cursor.batches.hasMore).to.equal(true);
        });
        it("supports AQB queries", async () => {
            const cursor = await db.query({ toAQL: () => "RETURN 42" });
            const value = await cursor.next();
            chai_1.expect(value).to.equal(42);
        });
        it("supports query objects", async () => {
            const cursor = await db.query({ query: "RETURN 1337", bindVars: {} });
            const value = await cursor.next();
            chai_1.expect(value).to.equal(1337);
        });
        it("supports compact queries", async () => {
            const cursor = await db.query({
                query: "RETURN @potato",
                bindVars: { potato: "tomato" },
            });
            const value = await cursor.next();
            chai_1.expect(value).to.equal("tomato");
        });
        it("supports compact queries with options", async () => {
            const query = {
                query: "FOR x IN RANGE(1, @max) RETURN x",
                bindVars: { max: 10 },
            };
            const cursor = await db.query(query, { batchSize: 2, count: true });
            chai_1.expect(cursor.count).to.equal(10);
            chai_1.expect(cursor.batches.hasMore).to.equal(true);
        });
    });
    describe("database.explain", () => {
        it("returns an explanation", async () => {
            const result = await db.explain(aql_1.aql `FOR x IN RANGE(1, ${10}) RETURN x`);
            chai_1.expect(result.plan).to.have.property("nodes");
        });
    });
    describe("database.parse", () => {
        it("returns a parse result", async () => {
            const result = await db.parse(aql_1.aql `FOR x IN _users RETURN x`);
            chai_1.expect(result).to.have.property("parsed", true);
            chai_1.expect(result).to.have.property("collections");
            chai_1.expect(result).to.have.property("bindVars");
            chai_1.expect(result).to.have.property("ast");
        });
    });
    describe("database.queryTracking", () => {
        it("returns the AQL query tracking properties", async () => {
            const result = await db.queryTracking();
            chai_1.expect(result).to.have.property("enabled");
            chai_1.expect(result).to.have.property("maxQueryStringLength");
            chai_1.expect(result).to.have.property("maxSlowQueries");
            chai_1.expect(result).to.have.property("slowQueryThreshold");
            chai_1.expect(result).to.have.property("trackBindVars");
            chai_1.expect(result).to.have.property("trackSlowQueries");
        });
    });
    describe("database.queryTracking", () => {
        afterEach(async () => {
            await db.queryTracking({
                enabled: true,
                slowQueryThreshold: 5,
            });
            await db.clearSlowQueries();
        });
        it("returns the AQL query tracking properties", async () => {
            const result = await db.queryTracking({
                enabled: true,
                maxQueryStringLength: 64,
                maxSlowQueries: 2,
                slowQueryThreshold: 5,
                trackBindVars: true,
                trackSlowQueries: true,
            });
            chai_1.expect(result).to.have.property("enabled", true);
            chai_1.expect(result).to.have.property("maxQueryStringLength", 64);
            chai_1.expect(result).to.have.property("maxSlowQueries", 2);
            chai_1.expect(result).to.have.property("slowQueryThreshold", 5);
            chai_1.expect(result).to.have.property("trackBindVars", true);
            chai_1.expect(result).to.have.property("trackSlowQueries", true);
        });
    });
    describe("database.listRunningQueries", () => {
        it("returns a list of running queries", async () => {
            const query = "RETURN SLEEP(0.5)";
            const p1 = db.query(query);
            const queries = await db.listRunningQueries();
            chai_1.expect(queries).to.have.lengthOf(1);
            chai_1.expect(queries[0]).to.have.property("bindVars");
            chai_1.expect(queries[0]).to.have.property("query", query);
            await p1;
        });
    });
    describe("database.listSlowQueries", () => {
        beforeEach(async () => {
            await db.queryTracking({
                enabled: true,
                slowQueryThreshold: 0.1,
                trackSlowQueries: true,
            });
            await db.clearSlowQueries();
        });
        afterEach(async () => {
            await db.queryTracking({
                enabled: true,
                slowQueryThreshold: 5,
            });
            await db.clearSlowQueries();
        });
        it("returns a list of slow queries", async () => {
            const query = "RETURN SLEEP(0.2)";
            await db.query(query);
            const queries = await db.listSlowQueries();
            chai_1.expect(queries).to.have.lengthOf(1);
            chai_1.expect(queries[0]).to.have.property("query", query);
        });
    });
    describe("database.clearSlowQueries", () => {
        beforeEach(async () => {
            await db.queryTracking({
                enabled: true,
                slowQueryThreshold: 0.1,
                trackSlowQueries: true,
            });
            await db.clearSlowQueries();
        });
        afterEach(async () => {
            await db.queryTracking({
                enabled: true,
                slowQueryThreshold: 5,
            });
            await db.clearSlowQueries();
        });
        it("clears the list of slow queries", async () => {
            await db.query("RETURN SLEEP(0.2)");
            const queries1 = await db.listSlowQueries();
            chai_1.expect(queries1).to.have.lengthOf(1);
            await db.clearSlowQueries();
            const queries2 = await db.listSlowQueries();
            chai_1.expect(queries2).to.have.lengthOf(0);
        });
    });
    // FIXME rewrite this test to use async mode to eliminate the timing
    // dependence. This test is flakey on Jenkins otherwise.
    describe.skip("database.killQuery", () => {
        it("kills the given query", async () => {
            const query = "RETURN SLEEP(5)";
            const p1 = db.query(query);
            const queries = await db.listRunningQueries();
            chai_1.expect(queries).to.have.lengthOf(1);
            chai_1.expect(queries[0]).to.have.property("bindVars");
            chai_1.expect(queries[0]).to.have.property("query", query);
            await db.killQuery(queries[0].id);
            try {
                await p1;
            }
            catch (e) {
                chai_1.expect(e).to.be.instanceOf(error_1.ArangoError);
                chai_1.expect(e).to.have.property("errorNum", 1500);
                chai_1.expect(e).to.have.property("code", 410);
                return;
            }
            chai_1.expect.fail();
        });
    });
});
//# sourceMappingURL=27-query-management.js.map