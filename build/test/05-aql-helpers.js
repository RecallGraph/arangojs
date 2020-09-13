"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const aql_1 = require("../aql");
const database_1 = require("../database");
describe("AQL helpers", function () {
    describe("aql", () => {
        const db = new database_1.Database();
        it("supports simple parameters", () => {
            const values = [
                0,
                42,
                -1,
                null,
                true,
                false,
                "",
                "string",
                [1, 2, 3],
                { a: "b" },
            ];
            const query = aql_1.aql `A ${values[0]} B ${values[1]} C ${values[2]} D ${values[3]} E ${values[4]} F ${values[5]} G ${values[6]} H ${values[7]} I ${values[8]} J ${values[9]} K EOF`;
            chai_1.expect(query.query).to.equal(`A @value0 B @value1 C @value2 D @value3 E @value4 F @value5 G @value6 H @value7 I @value8 J @value9 K EOF`);
            const bindVarNames = Object.keys(query.bindVars).sort((a, b) => +a.substr(5) > +b.substr(5) ? 1 : -1);
            chai_1.expect(bindVarNames).to.eql([
                "value0",
                "value1",
                "value2",
                "value3",
                "value4",
                "value5",
                "value6",
                "value7",
                "value8",
                "value9",
            ]);
            chai_1.expect(bindVarNames.map((k) => query.bindVars[k])).to.eql(values);
        });
        it("omits undefined bindvars and empty queries", () => {
            const query = aql_1.aql `A ${undefined} B ${aql_1.aql ``} C ${aql_1.aql.join([])} D ${aql_1.aql.literal("")} E`;
            chai_1.expect(query.query).to.equal("A  B  C  D  E");
            chai_1.expect(query.bindVars).to.eql({});
        });
        it("supports arangojs collection parameters", () => {
            const collection = db.collection("potato");
            const query = aql_1.aql `${collection}`;
            chai_1.expect(query.query).to.equal("@@value0");
            chai_1.expect(Object.keys(query.bindVars)).to.eql(["@value0"]);
            chai_1.expect(query.bindVars["@value0"]).to.equal("potato");
        });
        it("supports arangojs view parameters", () => {
            const view = db.view("banana");
            const query = aql_1.aql `${view}`;
            chai_1.expect(query.query).to.equal("@@value0");
            chai_1.expect(Object.keys(query.bindVars)).to.eql(["@value0"]);
            chai_1.expect(query.bindVars["@value0"]).to.equal("banana");
        });
        it("supports ArangoDB collection parameters", () => {
            class ArangoCollection {
                constructor() {
                    this.isArangoCollection = true;
                    this.name = "tomato";
                }
            }
            const collection = new ArangoCollection();
            const query = aql_1.aql `${collection}`;
            chai_1.expect(query.query).to.equal("@@value0");
            chai_1.expect(Object.keys(query.bindVars)).to.eql(["@value0"]);
            chai_1.expect(query.bindVars["@value0"]).to.equal("tomato");
        });
        it("supports arbitrary types", () => {
            const whatever = [
                { color: "green", more: { x: 2 } },
                { color: "yellow", more: { x: 3 } },
            ];
            const query = aql_1.aql `${whatever}`;
            chai_1.expect(query.query).to.equal("@value0");
            chai_1.expect(Object.keys(query.bindVars)).to.eql(["value0"]);
            chai_1.expect(query.bindVars.value0).to.equal(whatever);
        });
        it("supports arbitrary classes", () => {
            class Whatever {
                constructor(color) {
                    this.color = color;
                }
            }
            const whatever = [
                new Whatever("green"),
                new Whatever("yellow"),
            ];
            const query = aql_1.aql `${whatever}`;
            chai_1.expect(query.query).to.equal("@value0");
            chai_1.expect(Object.keys(query.bindVars)).to.eql(["value0"]);
            chai_1.expect(query.bindVars.value0).to.equal(whatever);
        });
        it("supports AQL literals", () => {
            const query = aql_1.aql `FOR x IN whatever ${aql_1.aql.literal("FILTER x.blah")} RETURN x`;
            chai_1.expect(query.query).to.equal("FOR x IN whatever FILTER x.blah RETURN x");
            chai_1.expect(query.bindVars).to.eql({});
        });
        it("supports nesting simple queries", () => {
            const query = aql_1.aql `FOR x IN (${aql_1.aql `FOR a IN 1..3 RETURN a`}) RETURN x`;
            chai_1.expect(query.query).to.equal("FOR x IN (FOR a IN 1..3 RETURN a) RETURN x");
        });
        it("supports deeply nesting simple queries", () => {
            const query = aql_1.aql `FOR x IN (${aql_1.aql `FOR a IN (${aql_1.aql `FOR b IN 1..3 RETURN b`}) RETURN a`}) RETURN x`;
            chai_1.expect(query.query).to.equal("FOR x IN (FOR a IN (FOR b IN 1..3 RETURN b) RETURN a) RETURN x");
        });
        it("supports nesting with bindVars", () => {
            const collection = db.collection("paprika");
            const query = aql_1.aql `A ${collection} B ${aql_1.aql `X ${collection} Y ${aql_1.aql `J ${collection} K ${9} L`} Z`} C ${4}`;
            chai_1.expect(query.query).to.equal("A @@value0 B X @@value0 Y J @@value0 K @value1 L Z C @value2");
            chai_1.expect(query.bindVars).to.eql({
                "@value0": "paprika",
                value1: 9,
                value2: 4,
            });
        });
        it("supports arbitrary nesting", () => {
            const users = db.collection("users");
            const role = "admin";
            const filter = aql_1.aql `FILTER u.role == ${role}`;
            const query = aql_1.aql `FOR u IN ${users} ${filter} RETURN u`;
            chai_1.expect(query.query).to.equal("FOR u IN @@value0 FILTER u.role == @value1 RETURN u");
            chai_1.expect(query.bindVars).to.eql({
                "@value0": users.name,
                value1: role,
            });
        });
        it("supports basic nesting", () => {
            const query = aql_1.aql `A ${aql_1.aql `a ${1} b`} B`;
            chai_1.expect(query.query).to.equal("A a @value0 b B");
            chai_1.expect(query.bindVars).to.eql({ value0: 1 });
        });
        it("supports deep nesting", () => {
            const query = aql_1.aql `A ${1} ${aql_1.aql `a ${2} ${aql_1.aql `X ${3} ${aql_1.aql `x ${4} y`} ${5} Y`} ${6} b`} ${7} B`;
            chai_1.expect(query.query).to.equal("A @value0 a @value1 X @value2 x @value3 y @value4 Y @value5 b @value6 B");
            chai_1.expect(query.bindVars).to.eql({
                value0: 1,
                value1: 2,
                value2: 3,
                value3: 4,
                value4: 5,
                value5: 6,
                value6: 7,
            });
        });
        it("supports nesting without bindvars", () => {
            const query = aql_1.aql `A ${aql_1.aql `B`} C`;
            chai_1.expect(query.query).to.equal("A B C");
            chai_1.expect(query.bindVars).to.eql({});
        });
    });
    describe("aql.literal", () => {
        const pairs = [
            [0, "0"],
            [42, "42"],
            [-1, "-1"],
            [undefined, ""],
            [null, "null"],
            [true, "true"],
            [false, "false"],
            ["", ""],
            ["string", "string"],
        ];
        for (const [value, result] of pairs) {
            it(`returns an AQL literal of "${result}" for ${String(JSON.stringify(value))}`, () => {
                chai_1.expect(aql_1.aql.literal(value).toAQL()).to.equal(result);
            });
        }
        it('returns an AQL literal of "aql" for { toAQL: () => "aql" }', () => {
            chai_1.expect(aql_1.aql.literal({ toAQL: () => "aql" }).toAQL()).to.equal("aql");
        });
    });
    describe("aql.join", () => {
        const fragments = [aql_1.aql `x ${1}`, aql_1.aql `y ${2}`, aql_1.aql `z ${3}`];
        it("merges fragments with a space by default", () => {
            const query = aql_1.aql.join(fragments);
            chai_1.expect(query.query).to.equal("x @value0 y @value1 z @value2");
            chai_1.expect(query.bindVars).to.eql({ value0: 1, value1: 2, value2: 3 });
        });
        it("merges fragments with an empty string", () => {
            const query = aql_1.aql.join(fragments, "");
            chai_1.expect(query.query).to.equal("x @value0y @value1z @value2");
            chai_1.expect(query.bindVars).to.eql({ value0: 1, value1: 2, value2: 3 });
        });
        it("merges fragments with an arbitrary string", () => {
            const query = aql_1.aql.join(fragments, "abc");
            chai_1.expect(query.query).to.equal("x @value0abcy @value1abcz @value2");
            chai_1.expect(query.bindVars).to.eql({ value0: 1, value1: 2, value2: 3 });
        });
        it("merges anything", () => {
            const query = aql_1.aql.join([1, true, "yes", aql_1.aql.literal("test")]);
            chai_1.expect(query.query).to.equal("@value0 @value1 @value2 test");
            chai_1.expect(query.bindVars).to.eql({ value0: 1, value1: true, value2: "yes" });
        });
    });
});
//# sourceMappingURL=05-aql-helpers.js.map