"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const database_1 = require("../database");
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
const itPre34 = ARANGO_VERSION < 30400 ? it : it.skip;
const it34 = ARANGO_VERSION >= 30400 ? it : it.skip;
describe("Managing indexes", function () {
    let db;
    let collection;
    const dbName = `testdb_${Date.now()}`;
    const collectionName = `collection-${Date.now()}`;
    before(async () => {
        db = new database_1.Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
        await db.createDatabase(dbName);
        db.useDatabase(dbName);
        collection = await db.createCollection(collectionName);
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
    describe("collection.ensureIndex#hash", () => {
        it("should create a hash index", async () => {
            const info = await collection.ensureIndex({
                type: "hash",
                fields: ["value"],
            });
            chai_1.expect(info).to.have.property("id");
            chai_1.expect(info).to.have.property("type", "hash");
            chai_1.expect(info).to.have.property("fields");
            chai_1.expect(info.fields).to.eql(["value"]);
            chai_1.expect(info).to.have.property("isNewlyCreated", true);
        });
    });
    describe("collection.ensureIndex#skiplist", () => {
        it("should create a skiplist index", async () => {
            const info = await collection.ensureIndex({
                type: "skiplist",
                fields: ["value"],
            });
            chai_1.expect(info).to.have.property("id");
            chai_1.expect(info).to.have.property("type", "skiplist");
            chai_1.expect(info).to.have.property("fields");
            chai_1.expect(info.fields).to.eql(["value"]);
            chai_1.expect(info).to.have.property("isNewlyCreated", true);
        });
    });
    describe("collection.ensureIndex#persistent", () => {
        it("should create a persistent index", async () => {
            const info = await collection.ensureIndex({
                type: "persistent",
                fields: ["value"],
            });
            chai_1.expect(info).to.have.property("id");
            chai_1.expect(info).to.have.property("type", "persistent");
            chai_1.expect(info).to.have.property("fields");
            chai_1.expect(info.fields).to.eql(["value"]);
            chai_1.expect(info).to.have.property("isNewlyCreated", true);
        });
    });
    describe("collection.ensureIndex#geo", () => {
        itPre34("should create a geo1 index for one field", async () => {
            const info = await collection.ensureIndex({
                type: "geo",
                fields: ["value"],
            });
            chai_1.expect(info).to.have.property("id");
            chai_1.expect(info).to.have.property("type", "geo1");
            chai_1.expect(info).to.have.property("fields");
            chai_1.expect(info.fields).to.eql(["value"]);
            chai_1.expect(info).to.have.property("isNewlyCreated", true);
        });
        itPre34("should create a geo2 index for two fields", async () => {
            const info = await collection.ensureIndex({
                type: "geo",
                fields: ["value1", "value2"],
            });
            chai_1.expect(info).to.have.property("id");
            chai_1.expect(info).to.have.property("type", "geo2");
            chai_1.expect(info).to.have.property("fields");
            chai_1.expect(info.fields).to.eql(["value1", "value2"]);
            chai_1.expect(info).to.have.property("isNewlyCreated", true);
        });
        it34("should create a geo index for one field", async () => {
            const info = await collection.ensureIndex({
                type: "geo",
                fields: ["value"],
            });
            chai_1.expect(info).to.have.property("id");
            chai_1.expect(info).to.have.property("type", "geo");
            chai_1.expect(info).to.have.property("fields");
            chai_1.expect(info.fields).to.eql(["value"]);
            chai_1.expect(info).to.have.property("isNewlyCreated", true);
        });
        it34("should create a geo index for two fields", async () => {
            const info = await collection.ensureIndex({
                type: "geo",
                fields: ["value1", "value2"],
            });
            chai_1.expect(info).to.have.property("id");
            chai_1.expect(info).to.have.property("type", "geo");
            chai_1.expect(info).to.have.property("fields");
            chai_1.expect(info.fields).to.eql(["value1", "value2"]);
            chai_1.expect(info).to.have.property("isNewlyCreated", true);
        });
    });
    describe("collection.ensureIndex#fulltext", () => {
        it("should create a fulltext index", async () => {
            const info = await collection.ensureIndex({
                type: "fulltext",
                fields: ["value"],
            });
            chai_1.expect(info).to.have.property("id");
            chai_1.expect(info).to.have.property("type", "fulltext");
            chai_1.expect(info).to.have.property("fields");
            chai_1.expect(info.fields).to.eql(["value"]);
            chai_1.expect(info).to.have.property("isNewlyCreated", true);
        });
    });
    describe("collection.index", () => {
        it("should return information about a index", async () => {
            const info = await collection.ensureIndex({
                type: "hash",
                fields: ["test"],
            });
            const index = await collection.index(info.id);
            chai_1.expect(index).to.have.property("id", info.id);
            chai_1.expect(index).to.have.property("type", info.type);
        });
    });
    describe("collection.indexes", () => {
        it("should return a list of indexes", async () => {
            const index = await collection.ensureIndex({
                type: "hash",
                fields: ["test"],
            });
            const indexes = await collection.indexes();
            chai_1.expect(indexes).to.be.instanceof(Array);
            chai_1.expect(indexes).to.not.be.empty;
            chai_1.expect(indexes.filter((i) => i.id === index.id).length).to.equal(1);
        });
    });
    describe("collection.dropIndex", () => {
        it("should drop existing index", async () => {
            const info = await collection.ensureIndex({
                type: "hash",
                fields: ["test"],
            });
            const index = await collection.dropIndex(info.id);
            chai_1.expect(index).to.have.property("id", info.id);
            const indexes = await collection.indexes();
            chai_1.expect(indexes).to.be.instanceof(Array);
            chai_1.expect(indexes).to.not.be.empty;
            chai_1.expect(indexes.filter((i) => i.id === index.id).length).to.equal(0);
        });
    });
});
//# sourceMappingURL=11-managing-indexes.js.map