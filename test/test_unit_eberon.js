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
    context(grammar.declarationSequence, 
            "TYPE T = RECORD intField: INTEGER END; A = ARRAY 1 OF INTEGER;"),
    pass("PROCEDURE T.p(), NEW; END T.p;",
         "PROCEDURE T.p*(), NEW; END T.p;"
         ),
    fail(["PROCEDURE TUnk.p(), NEW; END TUnk.p;", "undeclared identifier: 'TUnk'"],
         ["PROCEDURE A.p(), NEW; END A.p;",
          "RECORD type expected in method declaration, got 'ARRAY 1 OF INTEGER'"],
         ["PROCEDURE T.p(), NEW; END;", "not parsed"],
         ["PROCEDURE T.p(), NEW; END p;",
          "mismatched procedure names: 'T.p' at the begining and 'p.' at the end"],
         ["PROCEDURE T.p(), NEW; END T2.p;",
          "mismatched procedure names: 'T.p' at the begining and 'T2.p' at the end"],
         ["PROCEDURE T.p(), NEW; END T.p2;",
          "mismatched procedure names: 'T.p' at the begining and 'T.p2' at the end"],
         ["PROCEDURE T.intField(), NEW; END T.intField;",
          "cannot declare method, record already has field 'intField'"],
         ["PROCEDURE T.p(), NEW; END T.p; PROCEDURE T.p(), NEW; END T.p;",
          "'T.p' already declared"]
         )
    ),
"overridden method declaration": testWithContext(
    context(grammar.declarationSequence,
              "TYPE Base = RECORD END; T = RECORD (Base) END;"
            + "PROCEDURE Base.p(), NEW; END Base.p;"),
    pass("PROCEDURE T.p(); END T.p;"),
    fail(["PROCEDURE T.pUnk(); END T.pUnk;",
          "there is no method 'pUnk' to override in base type(s) of 'T' (NEW attribute is missed?)"],
         ["PROCEDURE T.p(), NEW; END T.p;",
          "base record already has method 'p' (unwanted NEW attribute?)"],
         ["PROCEDURE T.p(); END T.p; PROCEDURE T.p(); END T.p;",
          "'T.p' already declared"],
         ["PROCEDURE T.p(a: INTEGER); END T.p;",
          "overridden method 'p' signature mismatch: should be 'PROCEDURE', got 'PROCEDURE(INTEGER)'"]
        )
    ),
"SELF": testWithContext(
    context(grammar.declarationSequence,
            "TYPE T = RECORD i: INTEGER END;"),
    pass("PROCEDURE T.p(), NEW; BEGIN SELF.i := 0; END T.p;"),
    fail()
    )
};