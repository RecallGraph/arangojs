"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const database_1 = require("../database");
const error_1 = require("../error");
const graph_1 = require("../graph");
const range = (n) => Array.from(Array(n).keys());
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
async function createCollections(db) {
    const vertexCollectionNames = range(2).map((i) => `vc_${Date.now()}_${i}`);
    const edgeCollectionNames = range(2).map((i) => `ec_${Date.now()}_${i}`);
    await Promise.all([
        ...vertexCollectionNames.map((name) => db.createCollection(name)),
        ...edgeCollectionNames.map((name) => db.createEdgeCollection(name)),
    ]);
    return [vertexCollectionNames, edgeCollectionNames];
}
async function createGraph(graph, vertexCollectionNames, edgeCollectionNames) {
    return await graph.create(edgeCollectionNames.map((name) => ({
        collection: name,
        from: vertexCollectionNames,
        to: vertexCollectionNames,
    })));
}
describe("Manipulating graph vertices", function () {
    const name = `testdb_${Date.now()}`;
    let db;
    let graph;
    let collectionNames;
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
        graph = db.graph(`g_${Date.now()}`);
        const names = await createCollections(db);
        collectionNames = names.reduce((a, b) => a.concat(b));
        await createGraph(graph, names[0], names[1]);
    });
    afterEach(async () => {
        await graph.drop();
        await Promise.all(collectionNames.map((name) => db.collection(name).drop()));
    });
    describe("graph.vertexCollection", () => {
        it("returns a GraphVertexCollection instance for the collection", () => {
            const name = "potato";
            const collection = graph.vertexCollection(name);
            chai_1.expect(collection).to.be.an.instanceof(graph_1.GraphVertexCollection);
            chai_1.expect(collection).to.have.property("name").that.equals(name);
        });
    });
    describe("graph.addVertexCollection", () => {
        let vertexCollection;
        beforeEach(async () => {
            vertexCollection = await db.createCollection(`xc_${Date.now()}`);
        });
        afterEach(async () => {
            await vertexCollection.drop();
        });
        it("adds the given vertex collection to the graph", async () => {
            const data = await graph.addVertexCollection(vertexCollection.name);
            chai_1.expect(data.orphanCollections).to.contain(vertexCollection.name);
        });
    });
    describe("graph.removeVertexCollection", () => {
        let vertexCollection;
        beforeEach(async () => {
            vertexCollection = await db.createCollection(`xc_${Date.now()}`);
            await graph.addVertexCollection(vertexCollection.name);
        });
        it("removes the given vertex collection from the graph", async () => {
            const data = await graph.removeVertexCollection(vertexCollection.name);
            chai_1.expect(data.orphanCollections).not.to.contain(vertexCollection.name);
            await vertexCollection.get();
        });
        it("destroys the collection if explicitly passed true", async () => {
            const data = await graph.removeVertexCollection(vertexCollection.name, true);
            chai_1.expect(data.orphanCollections).not.to.contain(vertexCollection.name);
            try {
                await vertexCollection.get();
            }
            catch (err) {
                chai_1.expect(err).to.be.an.instanceof(error_1.ArangoError);
                return;
            }
            chai_1.expect.fail();
        });
    });
});
//# sourceMappingURL=17-graph-vertices.js.map