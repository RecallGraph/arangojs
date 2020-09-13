"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const database_1 = require("../database");
const route_1 = require("../route");
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400);
describe("Arbitrary HTTP routes", () => {
    const db = new database_1.Database({
        url: ARANGO_URL,
        arangoVersion: ARANGO_VERSION,
    });
    describe("database.route", () => {
        it("returns a Route instance", () => {
            const route = db.route();
            chai_1.expect(route).to.be.an.instanceof(route_1.Route);
        });
        it("creates a route for the given path", () => {
            const path = "/hi";
            const route = db.route(path);
            chai_1.expect(route._path).to.equal(path);
        });
        it("passes the given headers to the new route", () => {
            const route = db.route("/hello", { "x-magic": "awesome" });
            chai_1.expect(route._headers).to.have.property("x-magic", "awesome");
        });
    });
});
describe("Route API", function () {
    const name = `testdb_${Date.now()}`;
    let db;
    let collection;
    before(async () => {
        db = new database_1.Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
        await db.createDatabase(name);
        db.useDatabase(name);
        collection = await db.createCollection(`c_${Date.now()}`);
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
        await collection.truncate();
    });
    describe("route.route", () => {
        it("should concat path", () => {
            const route = db.route("/_api").route("/version");
            chai_1.expect(route).to.have.property("_path", "/_api/version");
        });
    });
    describe("route.get", () => {
        it("should be executed using the route path", async () => {
            const res = await db.route("/_api/version").get();
            chai_1.expect(res).to.have.property("body");
            const body = res.body;
            chai_1.expect(body).to.have.property("version");
            chai_1.expect(body).to.have.property("server");
        });
        it("should concat path to route path", async () => {
            const res = await db.route("/_api").get("/version");
            chai_1.expect(res).to.have.property("body");
            const body = res.body;
            chai_1.expect(body).to.have.property("version");
            chai_1.expect(body).to.have.property("server");
        });
        it("should passes query parameters", async () => {
            const res = await db.route("/_api").get("/version", { details: true });
            chai_1.expect(res).to.have.property("body");
            const body = res.body;
            chai_1.expect(body).to.have.property("version");
            chai_1.expect(body).to.have.property("server");
            chai_1.expect(body).to.have.property("details");
        });
    });
    describe("route.post", () => {
        it("should passes body", async () => {
            const res = await db
                .route(`/_api/document/${collection.name}`)
                .post({ foo: "bar" });
            chai_1.expect(res).to.have.property("body");
            chai_1.expect(res.body).to.have.property("_id");
            chai_1.expect(res.body).to.have.property("_key");
            chai_1.expect(res.body).to.have.property("_rev");
        });
    });
    describe("route.put", () => {
        let documentHandle;
        beforeEach(async () => {
            const doc = await collection.save({ foo: "bar" });
            documentHandle = doc._id;
        });
        it("should pass body", async () => {
            const res = await db
                .route(`/_api/document/${documentHandle}`)
                .put({ hello: "world" });
            chai_1.expect(res).to.have.property("body");
            chai_1.expect(res.body).to.have.property("_id");
            chai_1.expect(res.body).to.have.property("_key");
            chai_1.expect(res.body).to.have.property("_rev");
        });
    });
    describe("route.patch", () => {
        let documentHandle;
        beforeEach(async () => {
            const doc = await collection.save({ foo: "bar" });
            documentHandle = doc._id;
        });
        it("should passes body", async () => {
            const res = await db
                .route(`/_api/document/${documentHandle}`)
                .patch({ hello: "world" });
            chai_1.expect(res).to.have.property("body");
            chai_1.expect(res.body).to.have.property("_id");
            chai_1.expect(res.body).to.have.property("_key");
            chai_1.expect(res.body).to.have.property("_rev");
        });
    });
    describe("route.delete", () => {
        let documentHandle;
        beforeEach(async () => {
            const doc = await collection.save({ foo: "bar" });
            documentHandle = doc._id;
        });
        it("should be executed using the route path", async () => {
            const res = await db.route(`/_api/document/${documentHandle}`).delete();
            chai_1.expect(res).to.have.property("body");
            chai_1.expect(res.body).to.have.property("_id");
            chai_1.expect(res.body).to.have.property("_key");
            chai_1.expect(res.body).to.have.property("_rev");
        });
    });
    describe("route.head", () => {
        let documentHandle;
        beforeEach(async () => {
            const doc = await collection.save({ foo: "bar" });
            documentHandle = doc._id;
        });
        it("should be executed using the route path", async () => {
            const res = await db.route(`/_api/document/${documentHandle}`).head();
            chai_1.expect(res).to.have.property("statusCode", 200);
        });
    });
    describe("route.request", () => {
        it("should be executed using the route path", async () => {
            const res = await db.route("/_api/version").request({ method: "GET" });
            chai_1.expect(res).to.have.property("body");
            const body = res.body;
            chai_1.expect(body).to.have.property("version");
            chai_1.expect(body).to.have.property("server");
        });
    });
});
//# sourceMappingURL=07-routes.js.map