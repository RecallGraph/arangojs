"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const aql_1 = require("../aql");
const cursor_1 = require("../cursor");
const database_1 = require("../database");
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
const describe34 = ARANGO_VERSION >= 30400 ? describe : describe.skip;
const itRdb = process.env.ARANGO_STORAGE_ENGINE !== "mmfiles" ? it : it.skip;
describe34("AQL Stream queries", function () {
    let name = `testdb_${Date.now()}`;
    let db;
    before(async () => {
        db = new database_1.Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
        await db.createDatabase(name);
        db.useDatabase(name);
    });
    after(async () => {
        try {
            db.useDatabase("_system");
            await db.dropDatabase(name);
        }
        finally {
            db.close();
        }
    });
    describe("database.query", () => {
        it("returns a cursor for the query result", async () => {
            const cursor = await db.query("RETURN 23", {}, { stream: true });
            chai_1.expect(cursor).to.be.an.instanceof(cursor_1.ArrayCursor);
        });
        it("supports bindVars", async () => {
            const cursor = await db.query("RETURN @x", { x: 5 }, { stream: true });
            const value = await cursor.next();
            chai_1.expect(value).to.equal(5);
        });
        it("supports options", async () => {
            const cursor = await db.query("FOR x IN 1..10 RETURN x", undefined, {
                batchSize: 2,
                count: true,
                stream: true,
            });
            chai_1.expect(cursor.count).to.equal(undefined);
            chai_1.expect(cursor.batches.hasMore).to.equal(true);
        });
        it("supports compact queries with options", async () => {
            let query = {
                query: "FOR x IN RANGE(1, @max) RETURN x",
                bindVars: { max: 10 },
            };
            const cursor = await db.query(query, {
                batchSize: 2,
                count: true,
                stream: true,
            });
            chai_1.expect(cursor.count).to.equal(undefined); // count will be ignored
            chai_1.expect(cursor.batches.hasMore).to.equal(true);
        });
    });
    describe("with some data", () => {
        let cname = "MyTestCollection";
        before(async () => {
            let collection = await db.createCollection(cname);
            await Promise.all(Array.from(Array(1000).keys()).map((i) => collection.save({ hallo: i })));
        });
        /*after(async () => {
          await db.collection(cname).drop()
        });*/
        it("can access large collection in parallel", async () => {
            let collection = db.collection(cname);
            let query = aql_1.aql `FOR doc in ${collection} RETURN doc`;
            const options = { batchSize: 250, stream: true };
            let count = 0;
            const cursors = await Promise.all(Array.from(Array(25)).map(() => db.query(query, options)));
            await Promise.all(cursors.map((c) => c.forEach(() => {
                count++;
            })));
            chai_1.expect(count).to.equal(25 * 1000);
        });
        itRdb("can do writes and reads", async () => {
            let collection = db.collection(cname);
            let readQ = aql_1.aql `FOR doc in ${collection} RETURN doc`;
            let writeQ = aql_1.aql `FOR i in 1..1000 LET y = SLEEP(1) INSERT {forbidden: i} INTO ${collection}`;
            const options = { batchSize: 500, ttl: 5, stream: true };
            // 900s lock timeout + 5s ttl
            let readCursor = db.query(readQ, options);
            let writeCursor = db.query(writeQ, options);
            // the read cursor should always win
            const c = await Promise.race([readCursor, writeCursor]);
            // therefore no document should have been written here
            for await (const d of c) {
                chai_1.expect(d).not.to.haveOwnProperty("forbidden");
            }
        });
    });
});
//# sourceMappingURL=23-aql-queries-stream.js.map