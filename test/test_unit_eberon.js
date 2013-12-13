"use strict";

var grammar = require("eberon/eberon_grammar.js").grammar;
var TestUnitCommon = require("test_unit_common.js");

var pass = TestUnitCommon.pass;
var fail = TestUnitCommon.fail;
var context = TestUnitCommon.context;

function testWithContext(context, pass, fail){
    return TestUnitCommon.testWithContext(context, grammar.declarationSequence, pass, fail);
}

function testWithModule(src, pass, fail){
    return TestUnitCommon.testWithModule(src, grammar, pass, fail);
}

exports.suite = {
"abstract method declaration": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD PROCEDURE p() END;"
            + "T2 = RECORD PROCEDURE p1(); PROCEDURE p2(i: INTEGER): BOOLEAN END;"
            ),
    pass(),
    fail(["VAR r: T;",
          "cannot instantiate 'T' because it has abstract method(s): p"],
         ["VAR r: T2;",
          "cannot instantiate 'T2' because it has abstract method(s): p1, p2"],
         ["PROCEDURE p(); VAR p: POINTER TO T; BEGIN NEW(p); END p;",
          "cannot instantiate 'T' because it has abstract method(s): p"])
    ),
"new method declaration": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD PROCEDURE p(); intField: INTEGER END; A = ARRAY 1 OF INTEGER;"),
    pass("PROCEDURE T.p(); END T.p;"
         ),
        fail(["PROCEDURE TUnk.p(), NEW; END TUnk.p;", "undeclared identifier: 'TUnk'"],
         ["PROCEDURE A.p(), NEW; END A.p;",
          "RECORD type expected in method declaration, got 'ARRAY 1 OF INTEGER'"],
         ["PROCEDURE T.p(), NEW; END;", "not parsed"],
         ["PROCEDURE T.p(); END p;",
          "mismatched procedure names: 'T.p' at the begining and 'p.' at the end"],
         ["PROCEDURE T.p(); END T2.p;",
          "mismatched procedure names: 'T.p' at the begining and 'T2.p' at the end"],
         ["PROCEDURE T.p(); END T.p2;",
          "mismatched procedure names: 'T.p' at the begining and 'T.p2' at the end"],
         ["PROCEDURE T.intField(); END T.intField;",
          "'T' has no declaration for method 'intField'"],
         ["PROCEDURE T.p(); END T.p; PROCEDURE T.p(), NEW; END T.p;",
          "'T.p' already declared"],
         ["PROCEDURE p(); TYPE T = RECORD PROCEDURE m(); PROCEDURE m() END; END p;",
          "cannot declare a new method 'm': method already was declared"],
         ["PROCEDURE p(); TYPE T = RECORD m: INTEGER; PROCEDURE m() END; END p;",
          "cannot declare method, record already has field 'm'"],
         ["PROCEDURE p(); TYPE T = RECORD PROCEDURE m(); m: INTEGER END; END p;",
          "cannot declare field, record already has method 'm'"]
         )
    ),
"overridden method declaration": testWithContext(
    context(grammar.declarationSequence,
              "TYPE Base = RECORD PROCEDURE p() END; T = RECORD (Base) END;"
            + "PROCEDURE Base.p(); END Base.p;"),
    pass("PROCEDURE T.p(); END T.p;"),
    fail(["PROCEDURE T.pUnk(); END T.pUnk;",
          "'T' has no declaration for method 'pUnk'"],
         ["PROCEDURE proc(); TYPE T = RECORD (Base) PROCEDURE p() END; END proc;",
          "cannot declare a new method 'p': method already was declared"],
         ["PROCEDURE T.p(); END T.p; PROCEDURE T.p(); END T.p;",
          "'T.p' already declared"],
         ["PROCEDURE T.p(a: INTEGER); END T.p;",
          "overridden method 'p' signature mismatch: should be 'PROCEDURE', got 'PROCEDURE(INTEGER)'"],
         ["PROCEDURE p(); PROCEDURE T.p(); END T.p; END p;",
          "method should be defined in the same scope as its bound type 'T'"]
        )
    ),
"SELF": testWithContext(
    context(grammar.declarationSequence,
            "TYPE T = RECORD PROCEDURE p(); i: INTEGER END;"),
    pass("PROCEDURE T.p(); BEGIN SELF.i := 0; END T.p;"),
    fail(["PROCEDURE p(); BEGIN SELF.i := 0; END p;",
          "SELF can be used only in methods"])
    ),
"method call": testWithContext(
    context(grammar.expression,
              "TYPE T = RECORD PROCEDURE p(); PROCEDURE f(): INTEGER END;"
            + "VAR o: T;"
            + "PROCEDURE T.p(); END T.p;"
            + "PROCEDURE T.f(): INTEGER; RETURN 0 END T.f;"
            ),
    pass("o.f()"),
    fail(["o.p()", "procedure returning no result cannot be used in an expression"])
    ),
"method super call": testWithContext(
    context(grammar.declarationSequence,
              "TYPE T = RECORD PROCEDURE p(); PROCEDURE pAbstract(); PROCEDURE pAbstract2() END;"
            + "D = RECORD(T) PROCEDURE pNoSuper() END;"
            + "PROCEDURE T.p(); END T.p;"
           ),
    pass("PROCEDURE D.p(); BEGIN SUPER() END D.p;"),
    fail(["PROCEDURE D.pNoSuper(); BEGIN SUPER() END D.pNoSuper;",
          "there is no method 'pNoSuper' in base type(s)"],
         ["PROCEDURE p(); BEGIN SUPER() END p;",
          "SUPER can be used only in methods"],
         ["PROCEDURE T.pNoBase(); BEGIN SUPER() END T.pNoBase;",
          "'T' has no base type - SUPER cannot be used"],
         ["PROCEDURE D.pAbstract(); BEGIN SUPER() END D.pAbstract;",
          "cannot use abstract method(s) in SUPER calls: pAbstract"],
         ["PROCEDURE D.pAbstract(); BEGIN SUPER() END D.pAbstract; PROCEDURE D.pAbstract2(); BEGIN SUPER() END D.pAbstract2;",
          "cannot use abstract method(s) in SUPER calls: pAbstract, pAbstract2"]
          )
    ),
"export method": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD PROCEDURE p() END;"
            ),
    pass(),
    fail(["PROCEDURE T.p*(); END T.p;",
          "method implementation cannot be exported: p"])
    ),
"import method": testWithModule(
      "MODULE test;"
    + "TYPE T* = RECORD PROCEDURE m*(); PROCEDURE mNotExported() END;"
    + "PROCEDURE T.m(); END T.m; PROCEDURE T.mNotExported(); END T.mNotExported;"
    + "END test.",
    pass("MODULE m; IMPORT test; VAR r: test.T; BEGIN r.m(); END m.",
         "MODULE m; IMPORT test; TYPE T = RECORD(test.T) END; PROCEDURE T.m(); END T.m; END m."
        ),
    fail(["MODULE m; IMPORT test; VAR r: test.T; BEGIN r.mNotExported(); END m.",
          "type 'T' has no 'mNotExported' field"],
         ["MODULE m; IMPORT test; TYPE T = RECORD(test.T) END; PROCEDURE T.mNotExported(); END T.mNotExported; END m.",
          "'T' has no declaration for method 'mNotExported'"])
    )
};