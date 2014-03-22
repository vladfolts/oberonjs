"use strict";

var language = require("oberon/oberon_grammar.js").language;
var TestUnitCommon = require("test_unit_common.js");

var pass = TestUnitCommon.pass;
var fail = TestUnitCommon.fail;
var context = TestUnitCommon.context;

function testWithContext(context, pass, fail){
    return TestUnitCommon.testWithContext(context, grammar.declarationSequence, language, pass, fail);
}

function testWithGrammar(parser, pass, fail){
    return TestUnitCommon.testWithGrammar(parser, language, pass, fail);
}

var grammar = language.grammar;

exports.suite = {
"arithmetic operators": testWithContext(
    context(grammar.statement, "VAR b1: BOOLEAN;"),
    pass(),
    fail(["b1 := b1 + b1", "operator '+' type mismatch: numeric type or SET expected, got 'BOOLEAN'"])
    ),
"scalar variables cannot be exported": testWithGrammar(
    grammar.declarationSequence,
    pass(),
    fail(["VAR r*: RECORD END;",
          "variable 'r' cannot be exported: only scalar variables can be exported"],
         ["VAR a*: ARRAY 5 OF INTEGER;",
          "variable 'a' cannot be exported: only scalar variables can be exported"]
        )
    ),
"eberon key words can be identifiers": testWithGrammar(
    grammar.variableDeclaration,
    pass("SELF: INTEGER",
         "SUPER: INTEGER"
         )
    ),
"eberon types are missing": testWithGrammar(
    grammar.variableDeclaration,
    pass(),
    fail(["s: STRING", "undeclared identifier: 'STRING'"])
    ),
"cannot designate call result in expression": testWithContext(
    context(grammar.expression,
            "TYPE PT = POINTER TO RECORD field: INTEGER END;"
            + "ProcType = PROCEDURE(): INTEGER;"
            + "VAR p: PT;"
            + "PROCEDURE proc(): PT; RETURN p END proc;"
            + "PROCEDURE p1(): INTEGER; RETURN 1 END p1;"
            + "PROCEDURE p2(): ProcType; RETURN p1 END p2;"),
    pass(),
    fail(["proc().field", "not parsed"],
         ["p2()()", "not parsed"])
    ),
"cannot designate call result in statement": testWithContext(
    context(grammar.statement,
            "PROCEDURE p; END p;"),
    pass(),
    fail(["p()()", "not parsed"])
    )
};