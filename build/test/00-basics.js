"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const http = require("http");
const https = require("https");
const __1 = require("..");
describe("Creating a Database", () => {
    describe("using the factory", () => {
        const db = __1.default({ arangoVersion: 54321 });
        it("returns a Database instance", () => {
            chai_1.expect(db).to.be.an.instanceof(__1.Database);
        });
        it("passes any configs to the connection", () => {
            chai_1.expect(db._connection).to.have.property("_arangoVersion", 54321);
        });
    });
    describe("using the constructor", () => {
        const db = new __1.Database({ arangoVersion: 43210 });
        it("returns a Database instance", () => {
            chai_1.expect(db).to.be.an.instanceof(__1.Database);
        });
        it("passes any configs to the connection", () => {
            chai_1.expect(db._connection).to.have.property("_arangoVersion", 43210);
        });
    });
});
describe("Configuring the driver", () => {
    describe.skip("with a string", () => {
        it("sets the url", () => {
            const url = "https://example.com:9000";
            const db = new __1.Database(url);
            chai_1.expect(db._connection._url).to.eql([url]);
        });
    });
    describe("with headers", () => {
        it("applies the headers", (done) => {
            const db = new __1.Database({
                headers: {
                    "x-one": "1",
                    "x-two": "2",
                },
            });
            db._connection._hosts = [
                ({ headers }) => {
                    chai_1.expect(headers).to.have.property("x-one", "1");
                    chai_1.expect(headers).to.have.property("x-two", "2");
                    done();
                },
            ];
            db.request({ headers: {} }, () => { });
        });
    });
    describe("with an arangoVersion", () => {
        it("sets the x-arango-version header", (done) => {
            const db = new __1.Database({ arangoVersion: 99999 });
            db._connection._hosts = [
                ({ headers }) => {
                    chai_1.expect(headers).to.have.property("x-arango-version", "99999");
                    done();
                },
            ];
            db.request({ headers: {} }, () => { });
        });
    });
    describe("with agentOptions", () => {
        const _httpAgent = http.Agent;
        const _httpsAgent = https.Agent;
        let protocol;
        let options;
        beforeEach(() => {
            protocol = undefined;
            options = undefined;
        });
        before(() => {
            let Agent = (proto) => function (opts) {
                protocol = proto;
                options = opts;
                return () => null;
            };
            http.Agent = Agent("http");
            https.Agent = Agent("https");
        });
        after(() => {
            http.Agent = _httpAgent;
            https.Agent = _httpsAgent;
        });
        it("passes the agentOptions to the agent", () => {
            new __1.Database({ agentOptions: { maxSockets: 23 } }); // eslint-disable-line no-new
            chai_1.expect(options).to.have.property("maxSockets", 23);
        });
        it("uses the built-in agent for the protocol", () => {
            // default: http
            new __1.Database(); // eslint-disable-line no-new
            chai_1.expect(protocol).to.equal("http");
            new __1.Database("https://localhost:8529"); // eslint-disable-line no-new
            chai_1.expect(protocol).to.equal("https");
            new __1.Database("http://localhost:8529"); // eslint-disable-line no-new
            chai_1.expect(protocol).to.equal("http");
        });
    });
    describe("with agent", () => {
        const _httpRequest = http.request;
        const _httpsRequest = https.request;
        let protocol;
        let options;
        beforeEach(() => {
            protocol = undefined;
            options = undefined;
        });
        before(() => {
            let Request = (proto) => (opts) => {
                protocol = proto;
                options = opts;
                return {
                    on() {
                        return this;
                    },
                    end() {
                        return this;
                    },
                };
            };
            http.request = Request("http");
            https.request = Request("https");
        });
        after(() => {
            http.request = _httpRequest;
            https.request = _httpsRequest;
        });
        it("passes the agent to the request function", () => {
            let agent = Symbol("agent");
            let db;
            db = new __1.Database({ agent }); // default: http
            db.request({ headers: {} }, () => { });
            chai_1.expect(options).to.have.property("agent", agent);
            agent = Symbol("agent");
            db = new __1.Database({ agent, url: "https://localhost:8529" });
            db.request({ headers: {} }, () => { });
            chai_1.expect(options).to.have.property("agent", agent);
            agent = Symbol("agent");
            db = new __1.Database({ agent, url: "http://localhost:8529" });
            db.request({ headers: {} }, () => { });
            chai_1.expect(options).to.have.property("agent", agent);
        });
        it("uses the request function for the protocol", () => {
            const agent = Symbol("agent");
            let db;
            db = new __1.Database({ agent }); // default: http
            db.request({ headers: {} }, () => { });
            chai_1.expect(protocol).to.equal("http");
            db = new __1.Database({ agent, url: "https://localhost:8529" });
            db.request({ headers: {} }, () => { });
            chai_1.expect(protocol).to.equal("https");
            db = new __1.Database({ agent, url: "http://localhost:8529" });
            db.request({ headers: {} }, () => { });
            chai_1.expect(protocol).to.equal("http");
        });
        it("calls Agent#destroy when the connection is closed", () => {
            const agent = {
                _destroyed: false,
                destroy() {
                    this._destroyed = true;
                },
            };
            const db = new __1.Database({ agent });
            chai_1.expect(agent._destroyed).to.equal(false);
            db.close();
            chai_1.expect(agent._destroyed).to.equal(true);
        });
    });
});
//# sourceMappingURL=00-basics.js.map