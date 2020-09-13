"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const database_1 = require("../database");
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
const describe34 = ARANGO_VERSION >= 30400 ? describe : describe.skip;
describe34("View metadata", function () {
    const dbName = `testdb_${Date.now()}`;
    const viewName = `view-${Date.now()}`;
    let db;
    let view;
    before(async () => {
        db = new database_1.Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
        await db.createDatabase(dbName);
        db.useDatabase(dbName);
        view = db.view(viewName);
        await view.create();
    });
    after(async () => {
        db.useDatabase("_system");
        await db.dropDatabase(dbName);
    });
    describe("view.get", () => {
        it("should return information about a view", async () => {
            const info = await view.get();
            chai_1.expect(info).to.have.property("name", viewName);
            chai_1.expect(info).to.have.property("id");
            chai_1.expect(info).to.have.property("type", "arangosearch");
        });
        it("should throw if view does not exists", async () => {
            try {
                await db.view("no").get();
            }
            catch (err) {
                chai_1.expect(err).to.have.property("errorNum", 1203);
                return;
            }
            chai_1.expect.fail("should throw");
        });
    });
    describe("view.properties", () => {
        it("should return properties of a view", async () => {
            const properties = await view.properties();
            chai_1.expect(properties).to.have.property("name", viewName);
            chai_1.expect(properties).to.have.property("id");
            chai_1.expect(properties).to.have.property("type", "arangosearch");
            chai_1.expect(properties).to.have.property("links");
            chai_1.expect(properties).to.have.property("cleanupIntervalStep");
            chai_1.expect(properties).to.have.property("consolidationPolicy");
            chai_1.expect(properties).to.have.property("consolidationIntervalMsec");
            chai_1.expect(properties.consolidationPolicy).to.have.property("type");
        });
    });
});
//# sourceMappingURL=25-view-metadata.js.map