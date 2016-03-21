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
"array does not have indexOf() method": testWithContext(
    context(grammar.expression,
            "VAR a: ARRAY 3 OF INTEGER;"),
    pass(),
    fail(["a.indexOf(123)", "selector '.indexOf' cannot be applied to 'ARRAY 3 OF INTEGER'"])
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
    ),
"procedure arguments can be modified": testWithContext(
    context(grammar.procedureDeclaration, ""),
    pass("PROCEDURE p(a: INTEGER); BEGIN a := a + 1 END p")
    ),
"Non-VAR ARRAY parameter cannot be passed as VAR": testWithContext(
    context(grammar.procedureDeclaration,
            "PROCEDURE pArrayRef(VAR a: ARRAY OF INTEGER); END pArrayRef;"
            ),
    pass(),
    fail(["PROCEDURE p(a: ARRAY OF INTEGER); BEGIN pArrayRef(a) END p",
          "non-VAR formal parameter cannot be passed as VAR actual parameter"]
         )
    ),
"Non-VAR RECORD parameter cannot be passed as VAR": testWithContext(
    context(grammar.procedureDeclaration,
            "TYPE T = RECORD i: INTEGER END;"
            + "PROCEDURE recordVar(VAR r: T); END recordVar;"
            ),
    pass(),
    fail(["PROCEDURE p(r: T); BEGIN recordVar(r); END p",
          "non-VAR formal parameter cannot be passed as VAR actual parameter"]
         )
    ),
"Non-VAR open array assignment fails": testWithGrammar(
    grammar.procedureDeclaration,
    pass(),
    fail(["PROCEDURE p(s1, s2: ARRAY OF CHAR); BEGIN s1 := s2 END p",
          "cannot assign to non-VAR formal parameter"])
    ),
"string assignment to non-VAR open array fails": testWithGrammar(
    grammar.procedureDeclaration,
    pass(),
    fail(["PROCEDURE p(s: ARRAY OF CHAR); BEGIN s := \"abc\" END p", "cannot assign to non-VAR formal parameter"])
    ),
"procedure": testWithGrammar(
    grammar.procedureDeclaration,
    pass(),
    fail(["PROCEDURE p; END", "not parsed"])
    ),
"syntax strictness": testWithGrammar(
    grammar.procedureDeclaration,
    pass(),
    fail(["TYPE T = RECORD field: INTEGER; END;", "not parsed"],
         ["PROCEDURE p(): INTEGER; RETURN 0; END;", "END expected (PROCEDURE)"])
    )
};
