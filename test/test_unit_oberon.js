"use strict";

var grammar = require("oberon/oberon_grammar.js").grammar;
var TestUnitCommon = require("test_unit_common.js");

var pass = TestUnitCommon.pass;
var fail = TestUnitCommon.fail;
var testWithGrammar = TestUnitCommon.testWithGrammar;

exports.suite = {
"scalar variables cannot be exported": testWithGrammar(
    grammar.declarationSequence,
    pass(),
    fail(["VAR r*: RECORD END;",
          "variable 'r' cannot be exported: only scalar variables can be exported"],
         ["VAR a*: ARRAY 5 OF INTEGER;",
          "variable 'a' cannot be exported: only scalar variables can be exported"]
        )
    )
};