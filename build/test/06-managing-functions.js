"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const database_1 = require("../database");
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
const it34 = ARANGO_VERSION >= 30400 ? it : it.skip;
describe("Managing functions", function () {
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
    describe("database.listFunctions", () => {
        it34("should be empty per default", async () => {
            const result = await db.listFunctions();
            chai_1.expect(result).to.be.instanceof(Array);
            chai_1.expect(result).to.be.empty;
        });
        it34("should include before created function", async () => {
            const name = "myfunctions::temperature::celsiustofahrenheit";
            const code = "function (celsius) { return celsius * 1.8 + 32; }";
            await db.createFunction(name, code);
            const result = await db.listFunctions();
            chai_1.expect(result).to.be.instanceof(Array);
            chai_1.expect(result.length).to.equal(1);
            chai_1.expect(result[0]).to.eql({
                name,
                code,
                isDeterministic: false,
            });
        });
        describe("database.createFunction", () => {
            it("should create a function", async () => {
                const info = await db.createFunction("myfunctions::temperature::celsiustofahrenheit2", "function (celsius) { return celsius * 1.8 + 32; }");
                chai_1.expect(info).to.have.property("code", 201);
                chai_1.expect(info).to.have.property("error", false);
            });
        });
        describe("database.dropFunction", () => {
            it("should drop a existing function", async () => {
                const name = "myfunctions::temperature::celsiustofahrenheit";
                await db.createFunction(name, "function (celsius) { return celsius * 1.8 + 32; }");
                const info = await db.dropFunction(name);
                if (ARANGO_VERSION >= 30400)
                    chai_1.expect(info).to.have.property("deletedCount", 1);
            });
        });
    });
});
//# sourceMappingURL=06-managing-functions.js.map