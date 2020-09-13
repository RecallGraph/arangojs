"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const database_1 = require("../database");
const graph_1 = require("../graph");
const range = (n) => Array.from(Array(n).keys());
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
describe("Accessing graphs", function () {
    const name = `testdb_${Date.now()}`;
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
    describe("database.graph", () => {
        it("returns a Graph instance", () => {
            const name = "potato";
            const graph = db.graph(name);
            chai_1.expect(graph).to.be.an.instanceof(graph_1.Graph);
            chai_1.expect(graph).to.have.property("name").that.equals(name);
        });
    });
    describe("database.listGraphs", () => {
        const vertexCollectionNames = range(2).map((i) => `vc_${Date.now()}_${i}`);
        const edgeCollectionNames = range(2).map((i) => `ec_${Date.now()}_${i}`);
        const graphNames = range(4).map((i) => `g_${Date.now()}_${i}`);
        before(async () => {
            await Promise.all([
                ...vertexCollectionNames.map((name) => db.createCollection(name)),
                ...edgeCollectionNames.map((name) => db.createEdgeCollection(name)),
            ]);
            await Promise.all([
                ...graphNames.map((name) => db.graph(name).create(edgeCollectionNames.map((name) => ({
                    collection: name,
                    from: vertexCollectionNames,
                    to: vertexCollectionNames,
                })))),
            ]);
        });
        after(async () => {
            await Promise.all(graphNames.map((name) => db.graph(name).drop()));
            await Promise.all(vertexCollectionNames
                .concat(edgeCollectionNames)
                .map((name) => db.collection(name).drop()));
        });
        it("fetches information about all graphs", async () => {
            const graphs = await db.listGraphs();
            chai_1.expect(graphs.length).to.equal(graphNames.length);
            chai_1.expect(graphs.map((g) => g._key).sort()).to.eql(graphNames);
        });
    });
    describe("database.graphs", () => {
        const vertexCollectionNames = range(2).map((i) => `vc_${Date.now()}_${i}`);
        const edgeCollectionNames = range(2).map((i) => `ec_${Date.now()}_${i}`);
        const graphNames = range(4).map((i) => `g_${Date.now()}_${i}`);
        before(async () => {
            await Promise.all([
                ...vertexCollectionNames.map((name) => db.createCollection(name)),
                ...edgeCollectionNames.map((name) => db.createEdgeCollection(name)),
            ]);
            await Promise.all([
                ...graphNames.map((name) => db.graph(name).create(edgeCollectionNames.map((name) => ({
                    collection: name,
                    from: vertexCollectionNames,
                    to: vertexCollectionNames,
                })))),
            ]);
        });
        after(async () => {
            await Promise.all(graphNames.map((name) => db.graph(name).drop()));
            await Promise.all(vertexCollectionNames
                .concat(edgeCollectionNames)
                .map((name) => db.collection(name).drop()));
        });
        it("creates Graph instances", async () => {
            const graphs = await db.graphs();
            chai_1.expect(graphs.length).to.equal(graphNames.length);
            chai_1.expect(graphs.map((g) => g.name).sort()).to.eql(graphNames);
            graphs.forEach((graph) => chai_1.expect(graph).to.be.an.instanceof(graph_1.Graph));
        });
    });
});
//# sourceMappingURL=03-accessing-graphs.js.map