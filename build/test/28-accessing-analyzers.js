"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const analyzer_1 = require("../analyzer");
const database_1 = require("../database");
const range = (n) => Array.from(Array(n).keys());
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
const describe35 = ARANGO_VERSION >= 30500 ? describe : describe.skip;
describe35("Accessing analyzers", function () {
    const builtins = [];
    const name = `testdb_${Date.now()}`;
    let db;
    before(async () => {
        db = new database_1.Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
        await db.createDatabase(name);
        db.useDatabase(name);
        builtins.push(...(await db.listAnalyzers()).map((a) => a.name));
        chai_1.expect(builtins).not.to.have.length(0);
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
    describe("database.analyzer", () => {
        it("returns a Analyzer instance for the analyzer", () => {
            let name = "potato";
            let analyzer = db.analyzer(name);
            chai_1.expect(analyzer).to.be.an.instanceof(analyzer_1.Analyzer);
            chai_1.expect(analyzer).to.have.property("name").that.equals(name);
        });
    });
    describe("database.listAnalyzers", () => {
        const analyzerNames = range(4).map((i) => `${name}::a_${Date.now()}_${i}`);
        let allNames;
        before(async () => {
            allNames = [...builtins, ...analyzerNames].sort();
            await Promise.all(analyzerNames.map((name) => db.analyzer(name.replace(/^[^:]+::/, "")).create({ type: "identity" })));
        });
        after(async () => {
            await Promise.all(analyzerNames.map((name) => db.analyzer(name.replace(/^[^:]+::/, "")).drop()));
        });
        it("fetches information about all analyzers", async () => {
            const analyzers = await db.listAnalyzers();
            chai_1.expect(analyzers.map((a) => a.name).sort()).to.eql(allNames);
        });
    });
    describe("database.analyzers", () => {
        const analyzerNames = range(4).map((i) => `${name}::a_${Date.now()}_${i}`);
        let allNames;
        before(async () => {
            allNames = [...builtins, ...analyzerNames].sort();
            await Promise.all(analyzerNames.map((name) => db.analyzer(name.replace(/^[^:]+::/, "")).create({ type: "identity" })));
        });
        after(async () => {
            await Promise.all(analyzerNames.map((name) => db.analyzer(name.replace(/^[^:]+::/, "")).drop()));
        });
        it("creates Analyzer instances", async () => {
            const analyzers = await db.analyzers();
            for (const analyzer of analyzers) {
                chai_1.expect(analyzer).to.be.instanceOf(analyzer_1.Analyzer);
            }
            chai_1.expect(analyzers.map((a) => a.name).sort()).to.eql(allNames);
        });
    });
});
//# sourceMappingURL=28-accessing-analyzers.js.map