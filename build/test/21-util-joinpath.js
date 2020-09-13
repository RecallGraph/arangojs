"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const joinPath_1 = require("../lib/joinPath");
describe("Join Path", () => {
    it("joinPath 1", () => {
        var baseUrl = "../../u1/u2";
        var path = "/security/authenticate";
        chai_1.expect(joinPath_1.joinPath(baseUrl, path)).to.equal("../../u1/u2/security/authenticate");
    });
    it("joinPath 2", () => {
        var baseUrl = "/u1/u2";
        var path = "../security/authenticate";
        chai_1.expect(joinPath_1.joinPath(baseUrl, path)).to.equal("/u1/security/authenticate");
    });
    it("joinPath 3", () => {
        var baseUrl = "/u1/u2";
        var path = "../../security/authenticate";
        chai_1.expect(joinPath_1.joinPath(baseUrl, path)).to.equal("/security/authenticate");
    });
});
//# sourceMappingURL=21-util-joinpath.js.map