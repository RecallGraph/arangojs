"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const database_1 = require("../database");
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
const describe34 = ARANGO_VERSION >= 30400 ? describe : describe.skip;
describe34("Manipulating views", function () {
    const name = `testdb_${Date.now()}`;
    let db;
    let view;
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
        view = db.view(`v-${Date.now()}`);
        await view.create();
    });
    afterEach(async () => {
        try {
            await view.get();
        }
        catch (e) {
            return;
        }
        await view.drop();
    });
    describe("view.create", () => {
        it("creates a new arangosearch view", async () => {
            const view = db.view(`asv-${Date.now()}`);
            await view.create();
            const info = await view.get();
            chai_1.expect(info).to.have.property("name", view.name);
            chai_1.expect(info).to.have.property("type", "arangosearch");
        });
    });
    describe("view.updateProperties", () => {
        it("should change properties", async () => {
            const oldProps = await view.updateProperties({
                consolidationIntervalMsec: 45000,
                consolidationPolicy: { type: "tier" },
            });
            chai_1.expect(oldProps.consolidationIntervalMsec).to.equal(45000);
            chai_1.expect(oldProps.consolidationPolicy).to.have.property("type", "tier");
            const properties = await view.updateProperties({
                consolidationPolicy: { type: "bytes_accum" },
            });
            chai_1.expect(properties.consolidationIntervalMsec).to.equal(45000);
            chai_1.expect(properties.consolidationPolicy).to.have.property("type", "bytes_accum");
        });
    });
    describe("view.replaceProperties", () => {
        it("should change properties", async () => {
            const initial = await view.properties();
            chai_1.expect(initial.consolidationIntervalMsec).not.to.equal(45000);
            const oldProps = await view.replaceProperties({
                consolidationIntervalMsec: 45000,
                consolidationPolicy: { type: "tier" },
            });
            chai_1.expect(oldProps.consolidationIntervalMsec).to.equal(45000);
            chai_1.expect(oldProps.consolidationPolicy).to.have.property("type", "tier");
            const properties = await view.replaceProperties({
                consolidationPolicy: { type: "bytes_accum" },
            });
            chai_1.expect(properties.consolidationIntervalMsec).to.equal(initial.consolidationIntervalMsec);
            chai_1.expect(properties.consolidationPolicy).to.have.property("type", "bytes_accum");
        });
    });
    describe("view.rename", () => {
        it("should rename a view", async () => {
            const res = await db.route("/_admin/server/role").get();
            if (res.body.role !== "SINGLE") {
                console.warn("Skipping rename view test in cluster");
                return;
            }
            const name = `v2-${Date.now()}`;
            const info = await view.rename(name);
            chai_1.expect(info).to.have.property("name", name);
        });
    });
    describe("view.drop", () => {
        it("should drop a view", async () => {
            await view.drop();
            try {
                await view.get();
            }
            catch (e) {
                chai_1.expect(e).to.have.property("errorNum", 1203);
                return;
            }
            chai_1.expect.fail("should throw");
        });
    });
});
//# sourceMappingURL=26-manipulating-views.js.map