"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const database_1 = require("../database");
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
describe("EdgeCollection API", function () {
    const name = `testdb_${Date.now()}`;
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
        collection = await db.createEdgeCollection(`c_${Date.now()}`);
    });
    afterEach(async () => {
        await collection.drop();
    });
    describe("edgeCollection.edge", () => {
        const data = { _from: "d/1", _to: "d/2" };
        let meta;
        beforeEach(async () => {
            meta = await collection.save(data);
        });
        it("returns an edge in the collection", async () => {
            const doc = await collection.document(meta._id);
            chai_1.expect(doc).to.have.keys("_key", "_id", "_rev", "_from", "_to");
            chai_1.expect(doc._id).to.equal(meta._id);
            chai_1.expect(doc._key).to.equal(meta._key);
            chai_1.expect(doc._rev).to.equal(meta._rev);
            chai_1.expect(doc._from).to.equal(data._from);
            chai_1.expect(doc._to).to.equal(data._to);
        });
        it("does not throw on not found when graceful", async () => {
            const doc = await collection.document("does-not-exist", true);
            chai_1.expect(doc).to.equal(null);
        });
    });
    describe("edgeCollection.document", () => {
        const data = { _from: "d/1", _to: "d/2" };
        let meta;
        beforeEach(async () => {
            meta = await collection.save(data);
        });
        it("returns an edge in the collection", async () => {
            const doc = await collection.document(meta._id);
            chai_1.expect(doc).to.have.keys("_key", "_id", "_rev", "_from", "_to");
            chai_1.expect(doc._id).to.equal(meta._id);
            chai_1.expect(doc._key).to.equal(meta._key);
            chai_1.expect(doc._rev).to.equal(meta._rev);
            chai_1.expect(doc._from).to.equal(data._from);
            chai_1.expect(doc._to).to.equal(data._to);
        });
        it("does not throw on not found when graceful", async () => {
            const doc = await collection.document("does-not-exist", true);
            chai_1.expect(doc).to.equal(null);
        });
    });
    describe("edgeCollection.documentExists", () => {
        const data = { _from: "d/1", _to: "d/2" };
        let meta;
        beforeEach(async () => {
            meta = await collection.save(data);
        });
        it("returns true if the edge exists", async () => {
            const exists = await collection.documentExists(meta._id);
            chai_1.expect(exists).to.equal(true);
        });
        it("returns false if the edge does not exist", async () => {
            const exists = await collection.documentExists("does-not-exist");
            chai_1.expect(exists).to.equal(false);
        });
    });
    describe("edgeCollection.save", () => {
        it("creates an edge in the collection", async () => {
            const data = { something: "chicken", _from: "d/1", _to: "d/2" };
            const meta = await collection.save(data);
            chai_1.expect(meta).to.be.an("object");
            chai_1.expect(meta).to.have.property("_id").that.is.a("string");
            chai_1.expect(meta).to.have.property("_rev").that.is.a("string");
            chai_1.expect(meta).to.have.property("_key").that.is.a("string");
            const doc = await collection.document(meta._id);
            chai_1.expect(doc).to.have.keys("something", "_key", "_id", "_rev", "_from", "_to");
            chai_1.expect(doc._id).to.equal(meta._id);
            chai_1.expect(doc._key).to.equal(meta._key);
            chai_1.expect(doc._rev).to.equal(meta._rev);
            chai_1.expect(doc._from).to.equal(data._from);
            chai_1.expect(doc._to).to.equal(data._to);
            chai_1.expect(doc.something).to.equal(data.something);
        });
        it("uses the given _key if provided", async () => {
            const data = {
                something: "chicken",
                _key: "banana",
                _from: "d/1",
                _to: "d/2",
            };
            const meta = await collection.save(data);
            chai_1.expect(meta).to.be.an("object");
            chai_1.expect(meta).to.have.property("_id").that.is.a("string");
            chai_1.expect(meta).to.have.property("_rev").that.is.a("string");
            chai_1.expect(meta).to.have.property("_key").that.equals(data._key);
            const doc = await collection.document(meta._id);
            chai_1.expect(doc).to.have.keys("something", "_key", "_id", "_rev", "_from", "_to");
            chai_1.expect(doc._id).to.equal(meta._id);
            chai_1.expect(doc._rev).to.equal(meta._rev);
            chai_1.expect(doc._key).to.equal(data._key);
            chai_1.expect(doc._from).to.equal(data._from);
            chai_1.expect(doc._to).to.equal(data._to);
            chai_1.expect(doc.something).to.equal(data.something);
        });
        it("takes an options object", async () => {
            const data = { something: "chicken", _from: "d/1", _to: "d/2" };
            const meta = await collection.save(data, { returnNew: true });
            chai_1.expect(meta).to.be.an("object");
            chai_1.expect(meta).to.have.property("_id").that.is.a("string");
            chai_1.expect(meta).to.have.property("_rev").that.is.a("string");
            chai_1.expect(meta).to.have.property("_key").that.is.a("string");
            chai_1.expect(meta).to.have.property("new").that.is.an("object");
            chai_1.expect(meta.new).to.have.property("something", data.something);
            const doc = await collection.document(meta._id);
            chai_1.expect(doc).to.have.keys("something", "_key", "_id", "_rev", "_from", "_to");
            chai_1.expect(doc.something).to.equal(data.something);
            chai_1.expect(doc._id).to.equal(meta._id);
            chai_1.expect(doc._key).to.equal(meta._key);
            chai_1.expect(doc._rev).to.equal(meta._rev);
            chai_1.expect(doc._from).to.equal(data._from);
            chai_1.expect(doc._to).to.equal(data._to);
        });
    });
    describe("edgeCollection.traversal", () => {
        let knows;
        beforeEach(async () => {
            let person;
            [knows, person] = await Promise.all([db.createEdgeCollection("knows"), db.createCollection("person")]);
            await Promise.all([
                person.import([
                    { _key: "Alice" },
                    { _key: "Bob" },
                    { _key: "Charlie" },
                    { _key: "Dave" },
                    { _key: "Eve" },
                ]),
                knows.import([
                    { _from: "person/Alice", _to: "person/Bob" },
                    { _from: "person/Bob", _to: "person/Charlie" },
                    { _from: "person/Bob", _to: "person/Dave" },
                    { _from: "person/Eve", _to: "person/Alice" },
                    { _from: "person/Eve", _to: "person/Bob" },
                ]),
            ]);
        });
        it("executes traversal", async () => {
            const result = await knows.traversal("person/Alice", {
                direction: "outbound",
            });
            chai_1.expect(result).to.have.property("visited");
            const visited = result.visited;
            chai_1.expect(visited).to.have.property("vertices");
            const vertices = visited.vertices;
            chai_1.expect(vertices).to.be.instanceOf(Array);
            chai_1.expect(vertices.length).to.equal(4);
            const names = vertices.map((d) => d._key);
            for (const name of ["Alice", "Bob", "Charlie", "Dave"]) {
                chai_1.expect(names).to.contain(name);
            }
            chai_1.expect(visited).to.have.property("paths");
            const paths = visited.paths;
            chai_1.expect(paths).to.be.instanceOf(Array);
            chai_1.expect(paths.length).to.equal(4);
        });
    });
    describe("edgeCollection.replace", () => {
        it("replaces the given edge", async () => {
            const data = { potato: "tomato", _from: "d/1", _to: "d/2" };
            const meta = await collection.save(data, { returnNew: true });
            const doc = meta.new;
            await collection.replace(doc, {
                something: "peanuts",
                _from: "d/1",
                _to: "d/2",
            });
            const newData = await collection.document(doc._key);
            chai_1.expect(newData).not.to.have.property("potato");
            chai_1.expect(newData).to.have.property("something", "peanuts");
        });
    });
    describe("edgeCollection.update", () => {
        it("updates the given document", async () => {
            const data = {
                something: "tomato",
                empty: false,
                _from: "d/1",
                _to: "d/2",
            };
            const meta = await collection.save(data, { returnNew: true });
            const doc = meta.new;
            await collection.update(doc, { more: "peanuts", empty: null });
            const newData = await collection.document(doc._key);
            chai_1.expect(newData).to.have.property("something", doc.something);
            chai_1.expect(newData).to.have.property("more", "peanuts");
            chai_1.expect(newData).to.have.property("empty", null);
        });
        it("removes null values if keepNull is explicitly set to false", async () => {
            const data = {
                something: "tomato",
                empty: false,
                _from: "d/1",
                _to: "d/2",
            };
            const meta = await collection.save(data, { returnNew: true });
            const doc = meta.new;
            await collection.update(doc, { more: "peanuts", empty: null }, { keepNull: false });
            const newData = await collection.document(doc._key);
            chai_1.expect(newData).to.have.property("something", doc.something);
            chai_1.expect(newData).to.have.property("more", "peanuts");
            chai_1.expect(newData).not.to.have.property("empty");
        });
    });
    describe("edgeCollection.remove", () => {
        const key = `d_${Date.now()}`;
        beforeEach(async () => {
            await collection.save({ _key: key, _from: "d/1", _to: "d/2" });
        });
        it("deletes the given edge", async () => {
            await collection.remove(key);
            try {
                await collection.document(key);
            }
            catch (e) {
                return;
            }
            chai_1.expect.fail();
        });
    });
});
//# sourceMappingURL=15-edge-collections.js.map