"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const cursor_1 = require("../cursor");
const database_1 = require("../database");
const range = (n) => Array.from(Array(n).keys());
const alpha = (i) => String.fromCharCode("a".charCodeAt(0) + i);
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
describe("Simple queries", function () {
    let name = `testdb_${Date.now()}`;
    let db;
    let collection;
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
    beforeEach(async () => {
        collection = await db.createCollection(`c_${Date.now()}`);
        await Promise.all(range(10).map((i) => collection.save({
            _key: alpha(i),
            value: i + 1,
            group: Math.floor(i / 2) + 1,
        })));
    });
    afterEach(async () => {
        await collection.drop();
    });
    describe("collection.all", () => {
        it("returns a cursor for all documents in the collection", async () => {
            const cursor = await collection.all();
            chai_1.expect(cursor).to.be.an.instanceof(cursor_1.ArrayCursor);
            chai_1.expect(cursor.count).to.equal(10);
            const arr = await cursor.all();
            chai_1.expect(arr).to.have.length(10);
            arr.forEach((doc) => {
                chai_1.expect(doc).to.have.keys("_key", "_id", "_rev", "value", "group");
                chai_1.expect(doc._id).to.equal(`${collection.name}/${doc._key}`);
                chai_1.expect(doc.group).to.equal(Math.floor((doc.value - 1) / 2) + 1);
            });
            chai_1.expect(arr.map((d) => d.value).sort()).to.eql(range(10)
                .map((i) => i + 1)
                .sort());
            chai_1.expect(arr.map((d) => d._key).sort()).to.eql(range(10).map(alpha).sort());
        });
    });
    describe("collection.any", () => {
        it("returns a random document from the collection", async () => {
            const doc = await collection.any();
            chai_1.expect(doc).to.have.keys("_key", "_id", "_rev", "value", "group");
            chai_1.expect(doc._key).to.equal(alpha(doc.value - 1));
            chai_1.expect(doc._id).to.equal(`${collection.name}/${doc._key}`);
            chai_1.expect(doc.value).to.be.within(1, 10);
            chai_1.expect(doc.group).to.equal(Math.floor((doc.value - 1) / 2) + 1);
        });
    });
    describe("collection.byExample", () => {
        it("returns all documents matching the example", async () => {
            const cursor = await collection.byExample({ group: 2 });
            chai_1.expect(cursor).to.be.an.instanceof(cursor_1.ArrayCursor);
            const arr = await cursor.all();
            chai_1.expect(arr).to.have.length(2);
            arr.forEach((doc) => {
                chai_1.expect(doc).to.have.keys("_key", "_id", "_rev", "value", "group");
                chai_1.expect(doc._id).to.equal(`${collection.name}/${doc._key}`);
                chai_1.expect(doc.group).to.equal(2);
            });
            chai_1.expect(arr.map((d) => d._key).sort()).to.eql(["c", "d"]);
            chai_1.expect(arr.map((d) => d.value).sort()).to.eql([3, 4]);
        });
    });
    describe("collection.firstExample", () => {
        it("returns the first document matching the example", async () => {
            const doc = await collection.firstExample({ group: 2 });
            chai_1.expect(doc).to.have.keys("_key", "_id", "_rev", "value", "group");
            chai_1.expect(doc._key).to.match(/^[cd]$/);
            chai_1.expect(doc._id).to.equal(`${collection.name}/${doc._key}`);
            chai_1.expect(doc.group).to.equal(2);
        });
    });
    describe("collection.lookupByKeys", () => {
        it("returns the documents with the given keys", async () => {
            const arr = await collection.lookupByKeys(["b", "c", "d"]);
            chai_1.expect(arr).to.have.length(3);
            arr.forEach((doc) => {
                chai_1.expect(doc).to.have.keys("_key", "_id", "_rev", "value", "group");
                chai_1.expect(doc._id).to.equal(`${collection.name}/${doc._key}`);
                chai_1.expect(doc.group).to.equal(Math.floor((doc.value - 1) / 2) + 1);
            });
            chai_1.expect(arr.map((d) => d._key)).to.eql(["b", "c", "d"]);
        });
    });
});
//# sourceMappingURL=12-simple-queries.js.map