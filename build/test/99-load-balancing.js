"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InstanceManager_1 = require("arangodb-instance-manager/lib/InstanceManager");
const chai_1 = require("chai");
const database_1 = require("../database");
const sleep = (timeout) => new Promise((resolve) => setTimeout(resolve, timeout));
let ARANGO_PATH;
let ARANGO_RUNNER;
if (process.env.RESILIENCE_ARANGO_BASEPATH) {
    ARANGO_PATH = process.env.RESILIENCE_ARANGO_BASEPATH;
    ARANGO_RUNNER = "local";
}
else if (process.env.RESILIENCE_DOCKER_IMAGE) {
    ARANGO_PATH = process.env.RESILIENCE_DOCKER_IMAGE;
    ARANGO_RUNNER = "docker";
}
const describeIm = ARANGO_PATH ? describe.only : describe.skip;
describeIm("Single-server active failover", function () {
    this.timeout(Infinity);
    let im;
    let uuid;
    let leader;
    let db;
    let conn;
    beforeEach(async () => {
        im = new InstanceManager_1.default(ARANGO_PATH, ARANGO_RUNNER, "rocksdb");
        await im.startAgency();
        await im.startSingleServer("arangojs", 2);
        await im.waitForAllInstances();
        uuid = await im.asyncReplicationLeaderSelected();
        leader = (await im.resolveUUID(uuid));
        db = new database_1.Database({ url: leader.endpoint });
        conn = db._connection;
        await db.acquireHostList();
    });
    afterEach(async function () {
        im.moveServerLogs(this.currentTest);
        const logs = await im.cleanup(this.currentTest.isFailed());
        if (logs)
            console.error(`IM Logs:\n${logs}`);
    });
    async function getServerId() {
        const res = await db.route("_api/replication/server-id").get();
        return res.body.serverId;
    }
    async function responseHeaders() {
        const res = await db.route("_api/version").get();
        return res.headers;
    }
    it("failover to follower if leader is down", async () => {
        chai_1.expect(conn._urls).to.have.lengthOf(2);
        conn._activeHost = 0;
        const leaderId = await getServerId();
        chai_1.expect(leaderId).not.to.be.empty;
        const headers = await responseHeaders();
        chai_1.expect(headers).not.to.include.keys("x-arango-endpoint");
        await im.kill(leader);
        await im.asyncReplicationLeaderSelected(uuid);
        await sleep(3000);
        await db.version(); // cycle
        const newLeaderId = await getServerId();
        chai_1.expect(newLeaderId).not.to.be.empty;
        chai_1.expect(newLeaderId).not.to.equal(leaderId);
        const newHeaders = await responseHeaders();
        chai_1.expect(newHeaders).not.to.include.keys("x-arango-endpoint");
    });
    it("redirect to leader if server is not leader", async () => {
        chai_1.expect(conn._urls).to.have.lengthOf(2);
        conn._activeHost = 1;
        const followerId = await getServerId();
        chai_1.expect(followerId).not.to.be.empty;
        const headers = await responseHeaders();
        chai_1.expect(headers).to.include.keys("x-arango-endpoint");
        await im.kill(leader);
        await im.asyncReplicationLeaderSelected(uuid);
        await sleep(3000);
        const newLeaderId = await getServerId();
        chai_1.expect(newLeaderId).not.to.be.empty;
        chai_1.expect(newLeaderId).to.equal(followerId);
        const newHeaders = await responseHeaders();
        chai_1.expect(newHeaders).not.to.include.keys("x-arango-endpoint");
    });
});
describeIm("Single-server with follower", function () {
    this.timeout(Infinity);
    let im;
    let leader;
    let db;
    let conn;
    let collection;
    beforeEach(async () => {
        im = new InstanceManager_1.default(ARANGO_PATH, ARANGO_RUNNER);
        await im.startAgency();
        await im.startSingleServer("arangojs", 2);
        await im.waitForAllInstances();
        leader = await im.asyncReplicationLeaderInstance();
        db = new database_1.Database({ url: leader.endpoint });
        conn = db._connection;
        await db.acquireHostList();
        collection = await db.createCollection("test");
        await collection.save({ _key: "abc" });
        await sleep(3000);
    });
    afterEach(async () => {
        await collection.drop();
        await sleep(3000);
        await im.cleanup();
    });
    async function getResponse(dirty) {
        return await conn.request({
            method: "GET",
            path: "/_api/document/test/abc",
            allowDirtyRead: dirty,
        });
    }
    it("supports dirty reads", async () => {
        chai_1.expect(conn._urls).to.have.lengthOf(2);
        const res1 = await getResponse(true);
        chai_1.expect(res1.arangojsHostId).to.be.a("number");
        const headers1 = res1.request.getHeaders();
        chai_1.expect(headers1).to.include.keys("x-arango-allow-dirty-read");
        const res2 = await getResponse(true);
        chai_1.expect(res2.arangojsHostId).to.be.a("number");
        chai_1.expect(res2.arangojsHostId).not.to.equal(res1.arangojsHostId);
        const headers2 = res2.request.getHeaders();
        chai_1.expect(headers2).to.include.keys("x-arango-allow-dirty-read");
    });
    it("supports non-dirty reads", async () => {
        chai_1.expect(conn._urls).to.have.lengthOf(2);
        const res1 = await getResponse();
        chai_1.expect(res1.arangojsHostId).to.be.a("number");
        const headers1 = res1.request.getHeaders();
        chai_1.expect(headers1).not.to.include.keys("x-arango-allow-dirty-read");
        const res2 = await getResponse();
        chai_1.expect(res2.arangojsHostId).to.be.a("number");
        chai_1.expect(res2.arangojsHostId).to.equal(res1.arangojsHostId);
        const headers2 = res2.request.getHeaders();
        chai_1.expect(headers2).not.to.include.keys("x-arango-allow-dirty-read");
    });
    it("supports dirty read over multiple cursor batches", async () => {
        const cursor = await db.query("FOR i IN 1..2 RETURN i", {}, {
            allowDirtyRead: true,
            batchSize: 1,
        });
        chai_1.expect(cursor.hasNext).to.equal(true);
        chai_1.expect(await cursor.next()).to.equal(1);
        chai_1.expect(cursor.hasNext).to.equal(true);
        chai_1.expect(await cursor.next()).to.equal(2);
    });
});
describeIm("Cluster round robin", function () {
    this.timeout(Infinity);
    const NUM_COORDINATORS = 3;
    let im;
    let db;
    let conn;
    beforeEach(async () => {
        im = new InstanceManager_1.default(ARANGO_PATH, ARANGO_RUNNER);
        const endpoint = await im.startCluster(1, NUM_COORDINATORS, 2);
        db = new database_1.Database({
            url: endpoint,
            loadBalancingStrategy: "ROUND_ROBIN",
        });
        conn = db._connection;
        await db.acquireHostList();
    });
    afterEach(async () => {
        await im.cleanup();
    });
    async function getServerId() {
        const res = await db.route("_admin/status").get();
        return res.body.serverInfo && res.body.serverInfo.serverId;
    }
    it("cycles servers", async () => {
        chai_1.expect(conn._urls).to.have.lengthOf(NUM_COORDINATORS);
        const serverIds = new Set();
        for (let i = 0; i < NUM_COORDINATORS; i++) {
            const serverId = await getServerId();
            chai_1.expect(serverId).not.to.be.empty;
            chai_1.expect(serverIds).not.to.include(serverId);
            serverIds.add(serverId);
        }
        chai_1.expect(serverIds.size).to.equal(NUM_COORDINATORS);
        for (const serverId of serverIds) {
            const secondId = await getServerId();
            chai_1.expect(secondId).to.equal(serverId);
        }
    });
    it("skips downed servers", async () => {
        chai_1.expect(conn._urls).to.have.lengthOf(NUM_COORDINATORS);
        const firstRun = new Set();
        for (let i = 0; i < NUM_COORDINATORS; i++) {
            const serverId = await getServerId();
            chai_1.expect(serverId).not.to.be.empty;
            firstRun.add(serverId);
        }
        const instance = im.coordinators()[0];
        chai_1.expect(instance.status).to.equal("RUNNING");
        await im.shutdown(instance);
        chai_1.expect(instance.status).not.to.equal("RUNNING");
        const secondRun = new Set();
        for (let i = 0; i < NUM_COORDINATORS; i++) {
            const serverId = await getServerId();
            chai_1.expect(serverId).not.to.be.empty;
            secondRun.add(serverId);
        }
        chai_1.expect(firstRun.size - secondRun.size).to.equal(1);
    });
    it("it picks up restarted servers", async () => {
        chai_1.expect(conn._urls).to.have.lengthOf(NUM_COORDINATORS);
        const firstRun = new Set();
        for (let i = 0; i < NUM_COORDINATORS; i++) {
            const serverId = await getServerId();
            chai_1.expect(serverId).not.to.be.empty;
            firstRun.add(serverId);
        }
        const instance = im.coordinators()[0];
        chai_1.expect(instance.status).to.equal("RUNNING");
        await im.shutdown(instance);
        chai_1.expect(instance.status).not.to.equal("RUNNING");
        for (let i = 0; i < NUM_COORDINATORS; i++) {
            await getServerId();
        }
        await im.restart(instance);
        chai_1.expect(instance.status).to.equal("RUNNING");
        const secondRun = new Set();
        for (let i = 0; i < NUM_COORDINATORS; i++) {
            const serverId = await getServerId();
            chai_1.expect(serverId).not.to.be.empty;
            secondRun.add(serverId);
        }
        chai_1.expect(firstRun.size).to.equal(secondRun.size);
    });
    it("treats cursors as sticky", async () => {
        chai_1.expect(conn._urls).to.have.lengthOf(NUM_COORDINATORS);
        const LENGTH = 2;
        const cursor = await db.query(`FOR i IN 1..${LENGTH} RETURN i`, {}, { batchSize: 1 });
        const result = [];
        while (cursor.hasNext) {
            result.push(await cursor.next());
        }
        chai_1.expect(result).to.have.lengthOf(LENGTH);
    });
});
//# sourceMappingURL=99-load-balancing.js.map