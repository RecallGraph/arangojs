"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const database_1 = require("../database");
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
describe("DocumentCollection API", function () {
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
        collection = await db.createCollection(`c_${Date.now()}`);
    });
    afterEach(async () => {
        await collection.drop();
    });
    describe("documentCollection.document", () => {
        const data = { foo: "bar" };
        let meta;
        beforeEach(async () => {
            meta = await collection.save(data);
        });
        it("returns a document in the collection", async () => {
            const doc = await collection.document(meta._id);
            chai_1.expect(doc).to.have.keys("_key", "_id", "_rev", "foo");
            chai_1.expect(doc._id).to.equal(meta._id);
            chai_1.expect(doc._key).to.equal(meta._key);
            chai_1.expect(doc._rev).to.equal(meta._rev);
            chai_1.expect(doc.foo).to.equal(data.foo);
        });
        it("does not throw on not found when graceful", async () => {
            const doc = await collection.document("does-not-exist", true);
            chai_1.expect(doc).to.equal(null);
        });
    });
    describe("documentCollection.documentExists", () => {
        let data = { foo: "bar" };
        let meta;
        beforeEach(async () => {
            meta = await collection.save(data);
        });
        it("returns true if the document exists", async () => {
            const exists = await collection.documentExists(meta._id);
            chai_1.expect(exists).to.equal(true);
        });
        it("returns false if the document does not exist", async () => {
            const exists = await collection.documentExists("does-not-exist");
            chai_1.expect(exists).to.equal(false);
        });
        it("returns false if the collection does not exist", async () => {
            const exists = await db
                .collection("does-not-exist")
                .documentExists("lol");
            chai_1.expect(exists).to.equal(false);
        });
    });
    describe("documentCollection.save", () => {
        it("creates a document in the collection", async () => {
            const data = { foo: "bar" };
            const meta = await collection.save(data);
            chai_1.expect(meta).to.be.an("object");
            chai_1.expect(meta).to.have.property("_id").that.is.a("string");
            chai_1.expect(meta).to.have.property("_rev").that.is.a("string");
            chai_1.expect(meta).to.have.property("_key").that.is.a("string");
            const doc = await collection.document(meta._id);
            chai_1.expect(doc).to.have.keys("_key", "_id", "_rev", "foo");
            chai_1.expect(doc._id).to.equal(meta._id);
            chai_1.expect(doc._key).to.equal(meta._key);
            chai_1.expect(doc._rev).to.equal(meta._rev);
            chai_1.expect(doc.foo).to.equal(data.foo);
        });
        it("uses the given _key if provided", async () => {
            const data = { potato: "tomato", _key: "banana" };
            const meta = await collection.save(data);
            chai_1.expect(meta).to.be.an("object");
            chai_1.expect(meta).to.have.property("_id").that.is.a("string");
            chai_1.expect(meta).to.have.property("_rev").that.is.a("string");
            chai_1.expect(meta).to.have.property("_key").that.equals(data._key);
            const doc = await collection.document(meta._id);
            chai_1.expect(doc).to.have.keys("_key", "_id", "_rev", "potato");
            chai_1.expect(doc._id).to.equal(meta._id);
            chai_1.expect(doc._rev).to.equal(meta._rev);
            chai_1.expect(doc._key).to.equal(data._key);
            chai_1.expect(doc.potato).to.equal(data.potato);
        });
        it("returns the document if options.returnNew is set", async () => {
            const data = { potato: "tomato" };
            const options = { returnNew: true };
            const meta = await collection.save(data, options);
            chai_1.expect(meta).to.be.an("object");
            chai_1.expect(meta).to.have.property("_id").that.is.a("string");
            chai_1.expect(meta).to.have.property("_rev").that.is.a("string");
            chai_1.expect(meta).to.have.property("_key").that.is.a("string");
            chai_1.expect(meta.new).to.be.an("object");
            chai_1.expect(meta.new).to.have.property("_id").that.is.a("string");
            chai_1.expect(meta.new).to.have.property("_rev").that.is.a("string");
            chai_1.expect(meta.new).to.have.property("_key").that.is.a("string");
            chai_1.expect(meta.new.potato).to.equal(data.potato);
        });
        it("interprets options as returnNew if it is a boolean", async () => {
            const data = { potato: "tomato" };
            const meta = await collection.save(data, { returnNew: true });
            chai_1.expect(meta).to.be.an("object");
            chai_1.expect(meta).to.have.property("_id").that.is.a("string");
            chai_1.expect(meta).to.have.property("_rev").that.is.a("string");
            chai_1.expect(meta).to.have.property("_key").that.is.a("string");
            chai_1.expect(meta.new).to.be.an("object");
            chai_1.expect(meta.new).to.have.property("_id").that.is.a("string");
            chai_1.expect(meta.new).to.have.property("_rev").that.is.a("string");
            chai_1.expect(meta.new).to.have.property("_key").that.is.a("string");
            chai_1.expect(meta.new.potato).to.equal(data.potato);
        });
    });
    describe("documentCollection.replace", () => {
        it("replaces the given document", async () => {
            const data = { potato: "tomato" };
            const meta = await collection.save(data, { returnNew: true });
            const doc = meta.new;
            await collection.replace(doc, { sup: "dawg" });
            const newData = await collection.document(doc._key);
            chai_1.expect(newData).not.to.have.property("potato");
            chai_1.expect(newData).to.have.property("sup").that.equals("dawg");
        });
    });
    describe("documentCollection.update", () => {
        it("updates the given document", async () => {
            const data = { potato: "tomato", empty: false };
            const meta = await collection.save(data, { returnNew: true });
            const doc = meta.new;
            await collection.update(doc, { sup: "dawg", empty: null });
            const newData = await collection.document(doc._key);
            chai_1.expect(newData).to.have.property("potato").that.equals(doc.potato);
            chai_1.expect(newData).to.have.property("sup").that.equals("dawg");
            chai_1.expect(newData).to.have.property("empty").that.equals(null);
        });
        it("removes null values if keepNull is explicitly set to false", async () => {
            const data = { potato: "tomato", empty: false };
            const meta = await collection.save(data, { returnNew: true });
            const doc = meta.new;
            await collection.update(doc, { sup: "dawg", empty: null }, { keepNull: false });
            const newData = await collection.document(doc._key);
            chai_1.expect(newData).to.have.property("potato").that.equals(doc.potato);
            chai_1.expect(newData).to.have.property("sup").that.equals("dawg");
            chai_1.expect(newData).not.to.have.property("empty");
        });
    });
    describe("documentCollection.remove", () => {
        const key = `d_${Date.now()}`;
        beforeEach(async () => {
            await collection.save({ _key: key });
        });
        it("deletes the given document", async () => {
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
//# sourceMappingURL=14-document-collections.js.map