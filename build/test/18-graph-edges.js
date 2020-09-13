"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const database_1 = require("../database");
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
describe("Manipulating graph edges", function () {
    const dbName = `testdb_${Date.now()}`;
    const graphName = `testgraph_${Date.now()}`;
    let db;
    let graph;
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
    beforeEach(async () => {
        graph = db.graph(graphName);
        await graph.create([
            {
                collection: "knows",
                from: ["person"],
                to: ["person"],
            },
        ]);
    });
    afterEach(async () => {
        await graph.drop();
    });
    describe("graph.get", () => {
        it("should return information about the graph", async () => {
            const info = await graph.get();
            chai_1.expect(info).to.have.property("name", graphName);
            chai_1.expect(info).to.have.property("edgeDefinitions");
            chai_1.expect(info.edgeDefinitions).to.be.instanceOf(Array);
            chai_1.expect(info.edgeDefinitions.map((e) => e.collection)).to.contain("knows");
            chai_1.expect(info.edgeDefinitions.length).to.equal(1);
            const edgeDefinition = info.edgeDefinitions.filter((e) => e.collection === "knows");
            chai_1.expect([].concat.apply([], edgeDefinition.map((e) => e.from))).to.contain("person");
            chai_1.expect([].concat.apply([], edgeDefinition.map((e) => e.to))).to.contain("person");
        });
    });
    describe("graph.edgeCollections", () => {
        it("should contain edge collection", async () => {
            const info = await graph.edgeCollections();
            chai_1.expect(info).to.be.instanceOf(Array);
            chai_1.expect(info.map((c) => c.name)).to.contain("knows");
            chai_1.expect(info.length).to.equal(1);
        });
    });
    describe("graph.listEdgeCollections", () => {
        it("should return all edge collection names", async () => {
            const info = await graph.listEdgeCollections();
            chai_1.expect(info).to.be.instanceOf(Array);
            chai_1.expect(info).to.contain("knows");
            chai_1.expect(info.length).to.equal(1);
        });
    });
    describe("graph.listVertexCollections", () => {
        it("should return all vertex collection names", async () => {
            const info = await graph.listVertexCollections();
            chai_1.expect(info).to.be.instanceOf(Array);
            chai_1.expect(info).to.contain("person");
            chai_1.expect(info.length).to.equal(1);
        });
    });
    describe("graph.addEdgeDefinition", () => {
        it("should add an edgeDefinition to the graph", async () => {
            const info = await graph.addEdgeDefinition({
                collection: "works_in",
                from: ["person"],
                to: ["city"],
            });
            chai_1.expect(info).to.have.property("name", graphName);
            chai_1.expect(info).to.have.property("edgeDefinitions");
            chai_1.expect(info.edgeDefinitions).to.be.instanceOf(Array);
            chai_1.expect(info.edgeDefinitions.map((e) => e.collection)).to.contain("works_in");
            chai_1.expect(info.edgeDefinitions.length).to.equal(2);
            const edgeDefinition = info.edgeDefinitions.filter((e) => e.collection === "works_in");
            chai_1.expect([].concat.apply([], edgeDefinition.map((e) => e.from))).to.contain("person");
            chai_1.expect([].concat.apply([], edgeDefinition.map((e) => e.to))).to.contain("city");
        });
    });
    describe("graph.replaceEdgeDefinition", () => {
        it("should replace an existing edgeDefinition in the graph", async () => {
            const info = await graph.replaceEdgeDefinition("knows", {
                collection: "knows",
                from: ["person"],
                to: ["city"],
            });
            chai_1.expect(info).to.have.property("name", graphName);
            chai_1.expect(info).to.have.property("edgeDefinitions");
            chai_1.expect(info.edgeDefinitions).to.be.instanceOf(Array);
            chai_1.expect(info.edgeDefinitions.map((e) => e.collection)).to.contain("knows");
            chai_1.expect(info.edgeDefinitions.length).to.equal(1);
            const edgeDefinition = info.edgeDefinitions.filter((e) => e.collection === "knows");
            chai_1.expect([].concat.apply([], edgeDefinition.map((e) => e.from))).to.contain("person");
            chai_1.expect([].concat.apply([], edgeDefinition.map((e) => e.to))).to.contain("city");
        });
    });
    describe("graph.removeEdgeDefinition", () => {
        it("should remove an edgeDefinition from the graph", async () => {
            const info = await graph.removeEdgeDefinition("knows");
            chai_1.expect(info).to.have.property("name", graphName);
            chai_1.expect(info).to.have.property("edgeDefinitions");
            chai_1.expect(info.edgeDefinitions).to.be.instanceOf(Array);
            chai_1.expect(info.edgeDefinitions.length).to.equal(0);
        });
    });
    describe("graph.traversal", () => {
        beforeEach(async () => {
            const knows = graph.edgeCollection("knows");
            const person = graph.vertexCollection("person");
            await Promise.all([
                person.collection.import([
                    { _key: "Alice" },
                    { _key: "Bob" },
                    { _key: "Charlie" },
                    { _key: "Dave" },
                    { _key: "Eve" },
                ]),
                knows.collection.import([
                    { _from: "person/Alice", _to: "person/Bob" },
                    { _from: "person/Bob", _to: "person/Charlie" },
                    { _from: "person/Bob", _to: "person/Dave" },
                    { _from: "person/Eve", _to: "person/Alice" },
                    { _from: "person/Eve", _to: "person/Bob" },
                ]),
            ]);
        });
        it("executes traversal", async () => {
            const result = await graph.traversal("person/Alice", {
                direction: "outbound",
            });
            chai_1.expect(result).to.have.property("visited");
            const visited = result.visited;
            chai_1.expect(visited).to.have.property("vertices");
            const vertices = visited.vertices;
            chai_1.expect(vertices).to.be.instanceOf(Array);
            const names = vertices.map((d) => d._key);
            for (const name of ["Alice", "Bob", "Charlie", "Dave"]) {
                chai_1.expect(names).to.contain(name);
            }
            chai_1.expect(vertices.length).to.equal(4);
            chai_1.expect(visited).to.have.property("paths");
            const paths = visited.paths;
            chai_1.expect(paths).to.be.instanceOf(Array);
            chai_1.expect(paths.length).to.equal(4);
        });
    });
});
//# sourceMappingURL=18-graph-edges.js.map