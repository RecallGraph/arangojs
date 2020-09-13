"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const collection_1 = require("../collection");
const database_1 = require("../database");
const range = (n) => Array.from(Array(n).keys());
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
describe("Accessing collections", function () {
    const name = `testdb_${Date.now()}`;
    let db;
    let builtinSystemCollections;
    before(async () => {
        db = new database_1.Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
        await db.createDatabase(name);
        db.useDatabase(name);
        const collections = await db.listCollections(false);
        builtinSystemCollections = collections.map((c) => c.name);
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
    describe("database.collection", () => {
        it("returns a DocumentCollection instance for the collection", () => {
            const name = "potato";
            const collection = db.collection(name);
            chai_1.expect(collection_1.isArangoCollection(collection)).to.equal(true);
            chai_1.expect(collection).to.have.property("name").that.equals(name);
        });
    });
    describe("database.listCollections", () => {
        const nonSystemCollectionNames = range(4).map((i) => `c_${Date.now()}_${i}`);
        const systemCollectionNames = range(4).map((i) => `_c_${Date.now()}_${i}`);
        before(async () => {
            await Promise.all([
                ...nonSystemCollectionNames.map((name) => db.createCollection(name)),
                ...systemCollectionNames.map((name) => db.collection(name).create({ isSystem: true })),
            ]);
        });
        after(async () => {
            await Promise.all([
                ...nonSystemCollectionNames.map((name) => db.collection(name).drop()),
                ...systemCollectionNames.map((name) => db.collection(name).drop({ isSystem: true })),
            ]);
        });
        it("fetches information about all non-system collections", async () => {
            const collections = await db.listCollections();
            chai_1.expect(collections.length).to.equal(nonSystemCollectionNames.length);
            chai_1.expect(collections.map((c) => c.name).sort()).to.eql(nonSystemCollectionNames);
        });
        it("includes system collections if explicitly passed false", async () => {
            const collections = await db.listCollections(false);
            const allCollectionNames = nonSystemCollectionNames
                .concat(systemCollectionNames)
                .concat(builtinSystemCollections)
                .sort();
            chai_1.expect(collections.length).to.be.at.least(allCollectionNames.length);
            chai_1.expect(collections.map((c) => c.name).sort()).to.eql(allCollectionNames);
        });
    });
    describe("database.collections", () => {
        const documentCollectionNames = range(4).map((i) => `dc_${Date.now()}_${i}`);
        const edgeCollectionNames = range(4).map((i) => `ec_${Date.now()}_${i}`);
        const systemCollectionNames = range(4).map((i) => `_c_${Date.now()}_${i}`);
        before(async () => {
            await Promise.all([
                ...documentCollectionNames.map((name) => db.createCollection(name)),
                ...edgeCollectionNames.map((name) => db.createEdgeCollection(name)),
                ...systemCollectionNames.map((name) => db.collection(name).create({ isSystem: true })),
            ]);
        });
        after(async () => {
            await Promise.all([
                ...documentCollectionNames.map((name) => db.collection(name).drop()),
                ...edgeCollectionNames.map((name) => db.collection(name).drop()),
                ...systemCollectionNames.map((name) => db.collection(name).drop({ isSystem: true })),
            ]);
        });
        it("creates Collection instances", async () => {
            const collections = await db.collections();
            chai_1.expect(collections.length).to.equal(documentCollectionNames.length + edgeCollectionNames.length);
            chai_1.expect(collections.map((c) => c.name).sort()).to.eql([...documentCollectionNames, ...edgeCollectionNames].sort());
        });
        it("includes system collections if explicitly passed false", async () => {
            const collections = await db.collections(false);
            const allCollectionNames = [
                ...documentCollectionNames,
                ...edgeCollectionNames,
                ...systemCollectionNames,
                ...builtinSystemCollections,
            ].sort();
            chai_1.expect(collections.map((c) => c.name).sort()).to.eql(allCollectionNames);
        });
    });
});
//# sourceMappingURL=02-accessing-collections.js.map