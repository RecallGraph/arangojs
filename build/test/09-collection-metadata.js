"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const database_1 = require("../database");
const codes_1 = require("../lib/codes");
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
describe("Collection metadata", function () {
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
        db.useDatabase("_system");
        await db.dropDatabase(dbName);
    });
    describe("collection.get", () => {
        it("should return information about a collection", async () => {
            const info = await collection.get();
            chai_1.expect(info).to.have.property("name", collectionName);
            chai_1.expect(info).to.have.property("isSystem", false);
            chai_1.expect(info).to.have.property("status", 3); // loaded
            chai_1.expect(info).to.have.property("type", 2); // document collection
        });
        it("should throw if collection does not exist", async () => {
            try {
                await db.collection("no").get();
            }
            catch (e) {
                chai_1.expect(e).to.have.property("errorNum", codes_1.COLLECTION_NOT_FOUND);
                return;
            }
            chai_1.expect.fail("should throw");
        });
    });
    describe("collection.exists", () => {
        it("should return true if collection exists", async () => {
            const exists = await collection.exists();
            chai_1.expect(exists).to.equal(true);
        });
        it("should return false if collection does not exist", async () => {
            const exists = await db.collection("no").exists();
            chai_1.expect(exists).to.equal(false);
        });
    });
    describe("collection.properties", () => {
        it("should return properties of a collection", async () => {
            const properties = await collection.properties();
            chai_1.expect(properties).to.have.property("name", collectionName);
            chai_1.expect(properties).to.have.property("waitForSync", false);
        });
    });
    describe("collection.count", () => {
        it("should return information about a collection", async () => {
            const info = await collection.count();
            chai_1.expect(info).to.have.property("name", collectionName);
            chai_1.expect(info).to.have.property("count", 0);
        });
    });
    describe("collection.revision", () => {
        it("should return information about a collection", async () => {
            const info = await collection.revision();
            chai_1.expect(info).to.have.property("name", collectionName);
            chai_1.expect(info).to.have.property("revision");
        });
    });
});
//# sourceMappingURL=09-collection-metadata.js.map