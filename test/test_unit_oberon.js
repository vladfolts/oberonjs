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
    )
};