"use strict";

var grammar = require("eberon/eberon_grammar.js").grammar;
var TestUnitCommon = require("test_unit_common.js");

var pass = TestUnitCommon.pass;
var fail = TestUnitCommon.fail;
var context = TestUnitCommon.context;

function testWithContext(context, pass, fail){
    return TestUnitCommon.testWithContext(context, grammar.declarationSequence, pass, fail);
}

exports.suite = {
"new method declaration": testWithContext(
    context(grammar.declarationSequence, "TYPE T = RECORD END;"),
    pass("PROCEDURE T.p(), NEW; END T.p;"),
    fail()
    )
};