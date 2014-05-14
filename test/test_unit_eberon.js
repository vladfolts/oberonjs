"use strict";

var language = require("eberon/eberon_grammar.js").language;
var TestUnitCommon = require("test_unit_common.js");

var pass = TestUnitCommon.pass;
var fail = TestUnitCommon.fail;
var context = TestUnitCommon.context;

var grammar = language.grammar;

function testWithContext(context, pass, fail){
    return TestUnitCommon.testWithContext(context, grammar.declarationSequence, language, pass, fail);
}

function testWithModule(src, pass, fail){
    return TestUnitCommon.testWithModule(src, language, pass, fail);
}

function testWithGrammar(parser, pass, faile){
    return TestUnitCommon.testWithGrammar(parser, language, pass, fail);
}

exports.suite = {
"arithmetic operators": testWithContext(
    context(grammar.statement, "VAR b1: BOOLEAN;"),
    pass(),
    fail(["b1 := b1 + b1", "operator '+' type mismatch: numeric type or SET or STRING expected, got 'BOOLEAN'"])
    ),
"key words": testWithGrammar(
    grammar.variableDeclaration,
    pass(),
    fail(["SELF: INTEGER", "not parsed"],
         ["SUPER: INTEGER", "not parsed"],
         ["STRING: INTEGER", "not parsed"]
         )
    ),
"abstract method declaration": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD PROCEDURE p() END;"
            + "D = RECORD(T) END;"
            + "T2 = RECORD PROCEDURE p1(); PROCEDURE p2(i: INTEGER): BOOLEAN END;"
            ),
    pass(),
    fail(["VAR r: T;",
          "cannot instantiate 'T' because it has abstract method(s): p"],
         ["VAR r: T2;",
          "cannot instantiate 'T2' because it has abstract method(s): p1, p2"],
         ["PROCEDURE p(); VAR p: POINTER TO T; BEGIN NEW(p); END p;",
          "cannot instantiate 'T' because it has abstract method(s): p"],
         ["PROCEDURE p(); TYPE LocalT = RECORD(T) END; VAR r: LocalT; END p;",
          "cannot instantiate 'LocalT' because it has abstract method(s): p"],
         ["PROCEDURE p(); TYPE LocalT = RECORD(T) END; VAR p: POINTER TO LocalT; BEGIN NEW(p) END p;",
          "cannot instantiate 'LocalT' because it has abstract method(s): p"],
         ["VAR r: D;",
          "cannot instantiate 'D' because it has abstract method(s): p"],
         ["PROCEDURE p(); VAR p: POINTER TO D; BEGIN NEW(p); END p;",
          "cannot instantiate 'D' because it has abstract method(s): p"]
        )
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
              "TYPE T = RECORD PROCEDURE p(); i: INTEGER END;"
            + "PROCEDURE proc(i: INTEGER); END proc;"),
    pass("PROCEDURE T.p(); BEGIN SELF.i := 0; END T.p;",
         "PROCEDURE T.p(); BEGIN proc(SELF.i); END T.p;"
         ),
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
"cannot assign to method": testWithContext(
    context(grammar.statement,
              "TYPE T = RECORD PROCEDURE p() END;"
            + "VAR o: T;"
            + "PROCEDURE T.p(); END T.p;"
            ),
    pass(),
    fail(["o.p := o.p", "cannot assign to method"],
         ["o.p := NIL", "cannot assign to method"])
    ),
"method cannot be referenced": testWithContext(
    context(grammar.statement,
              "TYPE T = RECORD PROCEDURE p() END;"
            + "Proc = PROCEDURE();"
            + "VAR o: T;"
            + "PROCEDURE T.p(); END T.p;"
            + "PROCEDURE proc(p: Proc); END proc;"
            ),
    pass(),
    fail(["proc(o.p)", "type mismatch for argument 1: 'method p' cannot be converted to 'Proc'"])
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
    ),
"non-scalar variables can be exported": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD END; A = ARRAY 3 OF INTEGER;"
            ),
    pass("VAR r*: T;",
         "VAR a*: A;"),
    fail()
    ),
"export as read-only": testWithContext(
    context(grammar.declarationSequence, ""),
    pass("TYPE T* = RECORD i-: INTEGER END;"),
    fail(["TYPE T- = RECORD END;", 
          "type cannot be exported as read-only using '-' mark (did you mean '*'?)"],
         ["PROCEDURE p-(); END p;", 
          "procedure cannot be exported as read-only using '-' mark (did you mean '*'?)"],
         ["CONST c- = 123;", 
          "constant cannot be exported as read-only using '-' mark (did you mean '*'?)"],
         ["VAR i-: INTEGER;", 
          "variable cannot be exported as read-only using '-' mark (did you mean '*'?)"],
         ["TYPE T* = RECORD PROCEDURE p-() END;", 
          "method cannot be exported as read-only using '-' mark (did you mean '*'?)"]
         )
    ),
"field exported as read-only is writable in current module": testWithContext(
    context(grammar.statement,
              "TYPE T* = RECORD i-: INTEGER END;"
            + "VAR r: T;"
            ),
    pass("r.i := 123"),
    fail()
    ),
"import as read-only": testWithModule(
    "MODULE test; TYPE T* = RECORD f-: INTEGER END; END test.",
    pass(),
    fail(["MODULE m; IMPORT test; VAR r: test.T; BEGIN r.f := 123; END m.",
          "cannot assign to read-only variable"],
         ["MODULE m; IMPORT test; TYPE D = RECORD(test.T) END; VAR r: D; BEGIN r.f := 123; END m.",
          "cannot assign to read-only variable"]
        )),
"STRING variable": testWithGrammar(
    grammar.variableDeclaration,
    pass("s: STRING")
    ),
"STRING expression": testWithContext(
    context(grammar.expression,
            "VAR s1, s2: STRING; a: ARRAY 10 OF CHAR;"),
    pass("s1 + s2",
         "s1 + \"abc\"",
         "\"abc\" + s1",
         "s1 = s2",
         "s1 # s2",
         "s1 < s2",
         "s1 > s2",
         "s1 <= s2",
         "s1 >= s2"
         ),
    fail(["s1 = NIL", "type mismatch: expected 'STRING', got 'NIL'"],
         ["s1 = a", "type mismatch: expected 'STRING', got 'ARRAY 10 OF CHAR'"],
         ["a = s1", "type mismatch: expected 'ARRAY 10 OF CHAR', got 'STRING'"]
        )
    ),
"STRING literal expression": testWithContext(
    context(grammar.expression,
            "CONST cs = \"abc\";"
            + "PROCEDURE pString(s: STRING): STRING; RETURN s END pString;"
            + "PROCEDURE pStringByRef(VAR s: STRING): STRING; RETURN s END pStringByRef;"
            ),
    pass("\"abc\" + \"cde\"",
         "cs + cs",
         "cs + \"abc\"",
         "cs = \"abc\"",
         "cs # \"abc\"",
         "cs < \"abc\"",
         "cs > \"abc\"",
         "cs <= \"abc\"",
         "cs >= \"abc\"",
         "pString(cs)",
         "pString(\"abc\")"
         ),
    fail(["pStringByRef(cs)", "type mismatch for argument 1: cannot pass 'multi-character string' as VAR parameter of type 'STRING'"],
         ["pStringByRef(\"abc\")", "type mismatch for argument 1: cannot pass 'multi-character string' as VAR parameter of type 'STRING'"]
         )
    ),
"STRING assignment": testWithContext(
    context(grammar.statement,
            "VAR s1, s2: STRING; a: ARRAY 10 OF CHAR;"),
    pass("s1 := s2",
         "s1 := \"abc\"",
         "s1 := 22X"
         ),
    fail(["a := s1", "type mismatch: 'a' is 'ARRAY 10 OF CHAR' and cannot be assigned to 'STRING' expression"],
         ["s1 := a", "type mismatch: 's1' is 'STRING' and cannot be assigned to 'ARRAY 10 OF CHAR' expression"]
        )
    ),
"STRING and ARRAY OF CHAR": testWithContext(
    context(grammar.expression,
            "VAR s: STRING; a: ARRAY 10 OF CHAR;"
            + "PROCEDURE pArray(a: ARRAY OF CHAR): BOOLEAN; RETURN FALSE END pArray;"
            + "PROCEDURE pString(s: STRING): BOOLEAN; RETURN FALSE END pString;"
            + "PROCEDURE pVar(VAR a: ARRAY OF CHAR): BOOLEAN; RETURN FALSE END pVar;"
            + "PROCEDURE pIntArray(a: ARRAY OF INTEGER): BOOLEAN; RETURN FALSE END pIntArray;"
            ),
    pass("pArray(s)"),
    fail(["pVar(s)", "type mismatch for argument 1: cannot pass 'STRING' as VAR parameter of type 'ARRAY OF CHAR'"],
         ["pString(a)", "type mismatch for argument 1: 'ARRAY 10 OF CHAR' cannot be converted to 'STRING'"],
         ["pIntArray(s)", "type mismatch for argument 1: 'STRING' cannot be converted to 'ARRAY OF INTEGER'"]
        )
    ),
"STRING LEN": testWithContext(
    context(grammar.expression,
            "VAR s: STRING;"),
    pass("LEN(s)"),
    fail()
    ),
"STRING indexing": testWithContext(
    context(grammar.expression,
            "VAR s: STRING;"
            + "PROCEDURE pCharByVar(VAR c: CHAR): CHAR; RETURN c END pCharByVar;"),
    pass("s[0]"),
    fail(["s[-1]", "index is negative: -1"],
         ["pCharByVar(s[0])", "string element cannot be used as VAR parameter"]
         )
    ),
"designate call result in expression": testWithContext(
    context(grammar.expression,
            "TYPE PT = POINTER TO RECORD field: INTEGER END;"
            + "VAR p: PT;"
            + "PROCEDURE proc(): PT; RETURN p END proc;"
            + "PROCEDURE int(): INTEGER; RETURN 0 END int;"
            + "PROCEDURE intVar(VAR i: INTEGER): INTEGER; RETURN i END intVar;"),
    pass("proc().field",
         "intVar(proc().field)"),
    fail(["intVar(int())", "expression cannot be used as VAR parameter"])
    ),
"designate call result in statement": testWithContext(
    context(grammar.statement,
            "TYPE PT = POINTER TO RECORD field: INTEGER; proc: PROCEDURE END;"
            + "ProcType = PROCEDURE;"
            + "VAR p: PT;"
            + "PROCEDURE procVoid(); END procVoid;"
            + "PROCEDURE proc(): PT; RETURN p END proc;"
            + "PROCEDURE int(): INTEGER; RETURN 0 END int;"
            + "PROCEDURE intVar(VAR i: INTEGER); END intVar;"
            + "PROCEDURE returnProc(): ProcType; RETURN procVoid END returnProc;"
           ),
    pass("proc().field := 0",
         "proc().proc()",
         "proc().proc"
        ),
    fail(["int() := 0", "cannot assign to procedure call result"],
         ["intVar(int())", "expression cannot be used as VAR parameter"],
         ["procVoid()()", "PROCEDURE expected, got 'procedure call statement'"],
         ["int()()", "PROCEDURE expected, got 'INTEGER'"],
         ["returnProc()", "procedure returning a result cannot be used as a statement"] // call is not applied implicitly to result
        )
    ),
"temporary values": {
    "initialization": testWithContext(
        context(grammar.statement,
                "VAR i: INTEGER;"
                + "PROCEDURE p(): BOOLEAN; RETURN FALSE END p;"
                + "PROCEDURE void(); END void;"
               ),
        pass("v <- 0",
             "v <- 1.23",
             "v <- \"abc\"",
             "v <- TRUE",
             "v <- i",
             "v <- i + i",
             "v <- p()",
             "v <- void" // procedure type
            ),
        fail(["v <-", "initialization expression expected"],
             ["v <- void()", "procedure returning no result cannot be used in an expression"])
        ),
    "scope": testWithContext(
        context(grammar.declarationSequence,
                "VAR i: INTEGER;"),
        pass("PROCEDURE p(); BEGIN v1 <- 0; v2 <-0; END p;",
             "PROCEDURE p(); BEGIN i <- 0; ASSERT(i = 0); END p;",
             "PROCEDURE p(); BEGIN WHILE FALSE DO v <- 0; ASSERT(v = 0); END; WHILE FALSE DO v <- 0; END; END p;",
             "PROCEDURE p(); BEGIN WHILE FALSE DO i1 <- 0; WHILE FALSE DO i2 <- 0; ASSERT(i1 = 0); ASSERT(i2 = 0); END; END; END p;",
             "PROCEDURE p(); BEGIN IF FALSE THEN v <- 0; ASSERT(v = 0); END; IF FALSE THEN v <- 0; END; END p;",
             "PROCEDURE p(); BEGIN IF FALSE THEN v <- 0; END; IF FALSE THEN v <- 0; END; END p;",
             "PROCEDURE p(); BEGIN IF FALSE THEN v <- 0; ELSIF FALSE THEN v <- 0; ELSE v <- 0; END; END p;",
             "PROCEDURE p(); BEGIN CASE i OF 0: v <- 0 | 1: v <- 1; ; ASSERT(v = 1); END; END p;",
             "PROCEDURE p(); BEGIN REPEAT v <- 0; UNTIL FALSE; REPEAT v <- 0; UNTIL FALSE; END p;",
             "PROCEDURE p(); BEGIN REPEAT v <- 0; ASSERT(v = 0); UNTIL v # 0; END p;",
             "PROCEDURE p(); BEGIN FOR i := 0 TO 10 DO v <- 0; END; FOR i := 0 TO 10 DO v <- 0; END; END p;"
             ),
        fail(["PROCEDURE p(); BEGIN v <- 0; v <-0; END p;", "'v' already declared"],
             ["PROCEDURE p(); VAR v: INTEGER; BEGIN v <- 0; END p;", "'v' already declared"],
             ["PROCEDURE p(); BEGIN v <- 0; WHILE FALSE DO v <- 0; END; END p;", 
              "'v' already declared in procedure scope"],
             ["PROCEDURE p(); BEGIN i <- 0; IF FALSE THEN i <- 0; END; END p;",
              "'i' already declared in procedure scope"],
             ["PROCEDURE p(); BEGIN WHILE FALSE DO i <- 0; WHILE FALSE DO i <- 0; END; END; END p;",
              "'i' already declared in procedure scope"]
            )
        ),
    "read-only": testWithContext(
        context(grammar.declarationSequence,
                ""),
        pass(),
        fail(["PROCEDURE p(); BEGIN v <- 0; v := 0; END p;", 
              "cannot assign to temporary variable"]
            )
        ),
    "type promotion": testWithContext(
        context(grammar.declarationSequence,
                "TYPE Base = RECORD END;"
                + "Derived = RECORD (Base) flag: BOOLEAN END;"
                + "PDerived = POINTER TO Derived;"
                + "VAR pBase: POINTER TO Base;"
               ),
        pass("PROCEDURE p(); BEGIN b <- pBase; ASSERT((b IS PDerived) & b.flag); END p;"),
        fail(["PROCEDURE p(); BEGIN b <- pBase; ASSERT((b IS PDerived) OR b.flag); END p;",
              "type 'Base' has no 'flag' field"])
        )
    }
};