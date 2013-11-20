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
    context(grammar.declarationSequence, "TYPE T = RECORD END; A = ARRAY 1 OF INTEGER;"),
    pass("PROCEDURE T.p(), NEW; END T.p;"),
    fail(["PROCEDURE TUnk.p(), NEW; END TUnk.p;", "undeclared identifier: 'TUnk'"],
         ["PROCEDURE A.p(), NEW; END A.p;",
          "RECORD type expected in method declaration, got 'ARRAY 1 OF INTEGER'"],
         ["PROCEDURE T.p(), NEW; END;", "not parsed"],
         ["PROCEDURE T.p(), NEW; END p;",
          "mismatched procedure names: 'T.p' at the begining and 'p.' at the end"],
         ["PROCEDURE T.p(), NEW; END T2.p;",
          "mismatched procedure names: 'T.p' at the begining and 'T2.p' at the end"],
         ["PROCEDURE T.p(), NEW; END T.p2;",
          "mismatched procedure names: 'T.p' at the begining and 'T.p2' at the end"]
         )
    )
};