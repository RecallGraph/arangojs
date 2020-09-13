"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const database_1 = require("../database");
const error_1 = require("../error");
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
describe("Manipulating databases", function () {
    let db;
    beforeEach(() => {
        db = new database_1.Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
    });
    afterEach(() => {
        db.close();
    });
    describe("database.useDatabase", () => {
        it("updates the database name", () => {
            const name = "example";
            chai_1.expect(db.name).to.equal("_system"); // default
            db.useDatabase(name);
            chai_1.expect(db.name).to.equal(name);
        });
        it("returns itself", () => {
            const db2 = db.useDatabase("nope");
            chai_1.expect(db).to.equal(db2);
        });
    });
    describe("database.createDatabase", () => {
        let name = `testdb_${Date.now()}`;
        afterEach(async () => {
            db.useDatabase("_system");
            await db.dropDatabase(name);
        });
        it("creates a database with the given name", async () => {
            await db.createDatabase(name);
            db.useDatabase(name);
            const info = await db.get();
            chai_1.expect(info.name).to.equal(name);
        });
        it("adds the given users to the database");
    });
    describe("database.get", () => {
        it("fetches the database description if the database exists", async () => {
            const info = await db.get();
            chai_1.expect(info.name).to.equal(db.name);
            chai_1.expect(db.name).to.equal("_system");
        });
        it("fails if the database does not exist", async () => {
            db.useDatabase("__does_not_exist__");
            try {
                await db.get();
            }
            catch (e) {
                chai_1.expect(e).to.be.an.instanceof(error_1.ArangoError);
                return;
            }
            chai_1.expect.fail("should not succeed");
        });
    });
    describe("database.listDatabases", () => {
        it("returns a list of all databases", async () => {
            const databases = await db.listDatabases();
            chai_1.expect(databases).to.be.an.instanceof(Array);
            chai_1.expect(databases.indexOf("_system")).to.be.greaterThan(-1);
        });
    });
    describe("database.listUserDatabases", () => {
        it("returns a list of databases accessible to the active user");
    });
    describe("database.dropDatabase", () => {
        let name = `testdb_${Date.now()}`;
        beforeEach(async () => {
            await db.createDatabase(name);
        });
        it("deletes the given database from the server", async () => {
            await db.dropDatabase(name);
            let temp = new database_1.Database().useDatabase(name);
            try {
                await temp.get();
            }
            catch (e) {
                return;
            }
            finally {
                temp.close();
            }
            chai_1.expect.fail("should not succeed");
        });
    });
});
//# sourceMappingURL=01-manipulating-databases.js.map