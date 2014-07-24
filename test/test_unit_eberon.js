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

var temporaryValues = {
    context: context(
        grammar.declarationSequence,
        "TYPE Base = RECORD END;"
        + "Derived = RECORD (Base) flag: BOOLEAN END;"
        + "Derived2 = RECORD (Derived) flag2: BOOLEAN END;"
        + "PBase = POINTER TO Base;"
        + "PDerived = POINTER TO Derived;"
        + "PDerived2 = POINTER TO Derived2;"
        + "VAR pBase: POINTER TO Base; bVar: BOOLEAN;"
        + "PROCEDURE proc(b: BOOLEAN): BOOLEAN; RETURN b END proc;"),
    __expression: function(e){
        return "PROCEDURE p(); BEGIN b <- pBase; b2 <- pBase; ASSERT(" + e + "); END p;";
    },
    __statement: function(e){
        return "PROCEDURE p(); BEGIN b <- pBase; b2 <- pBase; " + e + " END p;";
    },
    passExpressions: function(){
        return this.__pass(this.__expression.bind(this), arguments);
    },
    passStatements: function(){
        return this.__pass(this.__statement.bind(this), arguments);
    },
    failExpressions: function(){
        return this.__fail(this.__expression.bind(this), arguments);
    },
    failStatements: function(){
        return this.__fail(this.__statement.bind(this), arguments);
    },
    __pass: function(make, cases){
        var result = [];
        for(var i = 0; i < cases.length; ++i)
            result.push(make(cases[i]));
        return pass.apply(this, result);
    },
    __fail: function(make, cases){
        var result = [];
        for(var i = 0; i < cases.length; ++i)
            result.push([make(cases[i]), "type 'Base' has no 'flag' field"]);
        return fail.apply(this, result);
    }
};

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
"SELF as pointer": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD PROCEDURE method() END;"
            + "PT = POINTER TO T;"
            + "VAR pVar: PT;"
            + "PROCEDURE refProc(VAR p: PT); END refProc;"
            ),
    pass("PROCEDURE T.method(); BEGIN pVar := SELF(POINTER) END T.method;",
         "PROCEDURE p();"
          + "TYPE Derived = RECORD(T) END; VAR pd: POINTER TO Derived;"
          + "PROCEDURE Derived.method(); VAR pVar: PT; BEGIN NEW(pd); pVar := SELF(POINTER); END Derived.method;"
          + "END p;"),
    fail(["PROCEDURE T.method(); BEGIN refProc(SELF(POINTER)) END T.method;", 
          "read-only variable cannot be used as VAR parameter"],
         ["PROCEDURE T.method(); BEGIN SELF(POINTER) := pVar; END T.method;", 
          "cannot assign to read-only variable"],
         ["PROCEDURE p();"
          + "TYPE Derived = RECORD(T) END; VAR d: Derived;"
          + "PROCEDURE Derived.method(); VAR pVar: PT; BEGIN pVar := SELF(POINTER); END Derived.method;"
          + "END p;",
          "cannot declare a variable of type 'Derived' (and derived types) because SELF(POINTER) was used in its method(s)"],
         ["PROCEDURE p();"
          + "TYPE Derived = RECORD(T) END; Derived2 = RECORD(Derived) END;"
          + "VAR d: Derived2;"
          + "PROCEDURE Derived.method(); VAR pVar: PT; BEGIN pVar := SELF(POINTER); END Derived.method;"
          + "END p;",
          "cannot declare a variable of type 'Derived' (and derived types) because SELF(POINTER) was used in its method(s)"]
         )
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
         "s1 = \"abc\"",
         "s1 = 22X",
         "\"abc\" = s1",
         "22X = s1",
         "s1 # s2",
         "s1 # \"abc\"",
         "s1 # 22X",
         "\"abc\" # s1",
         "22X # s1",
         "s1 < s2",
         "s1 < \"abc\"",
         "s1 < 22X",
         "\"abc\" < s1",
         "22X < s1",
         "s1 > s2",
         "s1 > \"abc\"",
         "s1 > 22X",
         "\"abc\" > s1",
         "22X > s1",
         "s1 <= s2",
         "s1 <= \"abc\"",
         "\"abc\" <=s1",
         "22X <= s1",
         "s1 >= \"abc\"",
         "s1 >= 22X",
         "s1 >= s2",
         "\"abc\" >= s1",
         "22X >= s1"
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
"in place variables": {
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
             ["v <- void()", "procedure returning no result cannot be used in an expression"],
             ["v <- NIL", "cannot use NIL to initialize variable"])
        ),
    "read-only if initialized with string literal": testWithContext(
        context(grammar.declarationSequence, ""),
        pass(),
        fail(["PROCEDURE p(); BEGIN s <- \"abc\"; s := \"def\"; END p;", "cannot assign to string literal"],
             ["PROCEDURE p(); BEGIN s <- \"abc\"; s[0] := \"d\"; END p;", "cannot assign to read-only variable"])
        ),
    "scope": testWithContext(
        temporaryValues.context,
        temporaryValues.passStatements(
             "v1 <- 0; v2 <-0;",
             "i <- 0; ASSERT(i = 0);",
             "WHILE FALSE DO v <- 0; ASSERT(v = 0); END; WHILE FALSE DO v <- 0; END;",
             "WHILE FALSE DO i1 <- 0; WHILE FALSE DO i2 <- 0; ASSERT(i1 = 0); ASSERT(i2 = 0); END; END;",
             "WHILE bVar DO v <- 0; ELSIF ~bVar DO v <- 0 END;",
             "IF FALSE THEN v <- 0; ASSERT(v = 0); END; IF FALSE THEN v <- 0; END;",
             "IF FALSE THEN v <- 0; END; IF FALSE THEN v <- 0; END;",
             "IF FALSE THEN v <- 0; ELSIF FALSE THEN v <- 0; ELSE v <- 0; END;",
             "i <- 0; CASE i OF 0: v <- 0 | 1: v <- 1; ; ASSERT(v = 1); END;",
             "REPEAT v <- 0; UNTIL FALSE; REPEAT v <- 0; UNTIL FALSE;",
             "REPEAT v <- 0; ASSERT(v = 0); UNTIL v # 0;",
             "i <- 0; FOR i := 0 TO 10 DO v <- 0; END; FOR i := 0 TO 10 DO v <- 0; END;"
             ),
        fail(["PROCEDURE p(); BEGIN v <- 0; v <-0; END p;", "'v' already declared"],
             ["PROCEDURE p(); VAR v: INTEGER; BEGIN v <- 0; END p;", "'v' already declared"],
             ["PROCEDURE p(); BEGIN v <- 0; WHILE FALSE DO v <- 0; END; END p;", 
              "'v' already declared in procedure scope"],
             ["PROCEDURE p(); BEGIN i <- 0; IF FALSE THEN i <- 0; END; END p;",
              "'i' already declared in procedure scope"],
             ["PROCEDURE p(); BEGIN WHILE FALSE DO i <- 0; WHILE FALSE DO i <- 0; END; END; END p;",
              "'i' already declared in operator scope"]
            )
        ),
    "type promotion in expression": testWithContext(
        temporaryValues.context,
        temporaryValues.passExpressions(
             "b IS PDerived",
             "(b IS PDerived) & b.flag",
             "(b IS PDerived) & bVar & b.flag",
             "(b IS PDerived) & (bVar OR b.flag)",
             "(b IS PDerived) & (b2 IS PDerived) & b.flag & b2.flag",
             "(b IS PDerived) & proc(TRUE) & b.flag",
             "(b IS PDerived) & ~proc(TRUE) & b.flag",
             "~(~(b IS PDerived)) & b.flag",
             "~~(b IS PDerived) & b.flag",
             "(b IS PDerived) & ((b IS PDerived2) OR bVar) & b.flag"
             //TODO: "((b IS PDerived) = TRUE) & b.flag); END p;",
             ),
        temporaryValues.failExpressions(
            "(b IS PDerived) OR b.flag",
            "(bVar OR (b IS PDerived)) & b.flag",
             "(b IS PDerived) OR bVar & b.flag",
             "~(b IS PDerived) & b.flag",
             "((b IS PDerived) & (b2 IS PDerived) OR bVar) & b.flag",
             "proc(b IS PDerived) & proc(b.flag)",
             "ORD(b IS PDerived) * ORD(b.flag) = 0",
             "((b IS PDerived) = FALSE) & b.flag",
             "b IS PDerived); ASSERT(b.flag",
             "((b IS PDerived) OR (b IS PDerived)) & b.flag",
             "(b IS PDerived) OR (b IS PDerived) OR b.flag",
             "(bVar OR (b IS PDerived)) & b.flag"
             )
        ),
    "invert type promotion in expression": testWithContext(
        temporaryValues.context,
        temporaryValues.passExpressions(
             "~(b IS PDerived) OR b.flag",
             "~(b IS PDerived) OR b.flag OR bVar",
             "~(b IS PDerived) OR b.flag & bVar",
             "~(b IS PDerived) OR bVar & b.flag",
             "~(b IS PDerived) OR (bVar & b.flag)",
             "~(b IS PDerived) OR bVar OR b.flag",
             "~(b IS PDerived) OR (bVar = b.flag)",
             "~(~(b IS PDerived) OR bVar) & b.flag",
             "~(~(b IS PDerived) OR b.flag) & b.flag",
             "~(b IS PDerived) OR ~(b2 IS PDerived) OR b2.flag",
             "~(b IS PDerived) OR b.flag OR ~(b2 IS PDerived) OR b2.flag",
             "~((b IS PDerived) & b.flag) OR b.flag OR ~(b2 IS PDerived) OR b2.flag",
             "~((b IS PDerived) & b.flag) OR b.flag OR ~((b2 IS PDerived) & b.flag & b2.flag) OR b2.flag"
             ),
        temporaryValues.failExpressions(
             "(~(b IS PDerived) OR bVar) & b.flag",
             "(ORD(~(b IS PDerived)) + ORD(b.flag)",
             "~(~(b IS PDerived) OR bVar) OR b.flag",
             "~(~(b IS PDerived) & bVar) & b.flag",
             "~(b IS PDerived) OR b.flag = b.flag"
            )
        ),
    "type promotion in separate statements": testWithContext(
        temporaryValues.context,
        pass(),
        temporaryValues.failStatements("bVar := b IS PDerived; ASSERT(b.flag)")
        ),
    "type promotion in IF": testWithContext(
        temporaryValues.context,
        temporaryValues.passStatements(
            "IF b IS PDerived THEN b.flag := FALSE; END;",
            "IF (b IS PDerived) & bVar THEN b.flag := FALSE; END;",
            "IF bVar & (b IS PDerived) THEN b.flag := FALSE; END;",
            "IF FALSE THEN ELSIF b IS PDerived THEN b.flag := FALSE; END;",
            "IF b IS PDerived THEN bVar := (b IS PDerived2) & b.flag2; b.flag := FALSE; END;",
            "IF bVar THEN ELSIF b IS PDerived2 THEN ELSIF b IS PDerived THEN END;",
            "IF bVar THEN ELSIF b IS PDerived THEN ELSIF b IS PDerived THEN ELSIF b IS PDerived THEN END;"
            ),
        temporaryValues.failStatements(
            "IF (b IS PDerived) OR bVar THEN b.flag := FALSE; END",
            "IF bVar OR (b IS PDerived) THEN b.flag := FALSE; END",
            "IF (b2 IS PDerived) OR (b IS PDerived) THEN b.flag := FALSE; END",
            "IF (b IS PDerived) OR (b IS PDerived) THEN b.flag := FALSE; END",
            "IF (b IS PDerived) OR (b IS PDerived) OR b.flag THEN END",
            "IF (b IS PDerived) OR (b IS PDerived) OR (b IS PDerived) THEN b.flag := FALSE; END",
            "IF ((b IS PDerived) OR (b IS PDerived)) THEN b.flag := FALSE; END",
            "IF (b IS PDerived) OR (b IS PDerived2) THEN b.flag := FALSE; END",
            "IF (b IS PDerived2) OR (b IS PDerived) THEN b.flag := FALSE; END",
            "IF b IS PDerived THEN END; b.flag := FALSE",
            "IF ~(b IS PDerived) THEN END; b.flag := FALSE",
            "IF ~(b IS PDerived) THEN ELSIF bVar THEN END; b.flag := FALSE",
            "IF ~(b IS PDerived) THEN ELSIF bVar THEN ELSE END; b.flag := FALSE",
            "IF bVar THEN ELSIF b IS PDerived THEN ELSE END; b.flag := FALSE",
            "IF b IS PDerived THEN ELSE b.flag := FALSE; END",
            "IF bVar OR (b IS PDerived) THEN b.flag := FALSE; END;",
            "IF bVar OR (b IS PDerived) THEN ELSE b.flag := FALSE; END;",
            "IF bVar OR ~(b IS PDerived) THEN b.flag := FALSE; END;",
            "IF b IS PDerived THEN ELSIF TRUE THEN b.flag := FALSE; END"
             )
        ),
    "invert type promotion in IF": testWithContext(
        temporaryValues.context,
        temporaryValues.passStatements(
            "IF ~(b IS PDerived) THEN ELSE b.flag := FALSE; END;",
            "IF ~(b IS PDerived) THEN ELSIF bVar THEN b.flag := FALSE; ELSE b.flag := FALSE; END;",
            "IF ~(b IS PDerived) THEN ELSIF ~(b2 IS PDerived) THEN b.flag := FALSE; ELSE b.flag := FALSE; b2.flag := FALSE; END;",
            "IF ~(b IS PDerived) OR bVar THEN ELSE b.flag := FALSE; END;",
            "IF ~(b IS PDerived) OR b.flag THEN ELSE b.flag := FALSE; END;",
            "IF ~(b IS PDerived) OR (b2 IS PDerived) THEN ELSE b.flag := FALSE; END;",
            "IF ~(b IS PDerived) OR ~(b2 IS PDerived) THEN ELSE b2.flag := FALSE; END;",
            "IF ~(b IS PDerived) THEN bVar := b IS PDerived; ELSE b.flag := FALSE; END;",
            "IF ~(b IS PDerived) THEN ASSERT((b IS PDerived) & b.flag); ELSE b.flag := FALSE; END;",
            "IF bVar OR ~(b IS PDerived) THEN ELSE b.flag := FALSE; END;"
            ),
        temporaryValues.failStatements(
            "IF ~(b IS PDerived) & bVar THEN ELSE b.flag := FALSE; END; END p;",
            "IF ~(b IS PDerived) THEN ELSIF ~(b2 IS PDerived) THEN b2.flag := FALSE; END;",
            "IF bVar OR (b IS PDerived) THEN ELSE b.flag := FALSE; END;"
            )
        ),
    "type promotion in WHILE": testWithContext(
        temporaryValues.context,
        temporaryValues.passStatements(
            "WHILE (b IS PDerived) & b.flag DO END;",
            "WHILE ~(b IS PDerived) OR b.flag DO END;",
            "WHILE b IS PDerived DO b.flag := FALSE; END;",
            "WHILE ~(b IS PDerived) DO ELSIF b.flag DO END;",
            "WHILE ~(b IS PDerived) DO ELSIF bVar DO b.flag := FALSE; END;"
            ),
        temporaryValues.failStatements(
            "WHILE b IS PDerived DO END; b.flag := FALSE;"
            )
        ),
    "type promotion cannot be reset by assignment": testWithContext(
        temporaryValues.context,
        pass(),
        fail(["PROCEDURE p(); BEGIN b <- pBase; IF b IS PDerived THEN b := pBase; b.flag := FALSE; END; END p;",
              "type mismatch: 'b' is 'PDerived' and cannot be assigned to 'POINTER TO Base' expression"]
            )
        ),
    "type promotion cannot be reset by passing as VAR argument": testWithContext(
        temporaryValues.context,
        pass(),
        fail(["PROCEDURE p(); PROCEDURE procBaseAsVar(VAR p: PBase); END procBaseAsVar;  BEGIN b <- pBase; IF b IS PDerived THEN procBaseAsVar(b); b.flag := FALSE; END; END p;",
              "type mismatch for argument 1: cannot pass 'PDerived' as VAR parameter of type 'PBase'"]
            )
        ),
    "IS expression after type promotion": testWithContext(
        temporaryValues.context,
        pass(),
        fail(["PROCEDURE p(); BEGIN b <- pBase; IF b IS PDerived THEN bVar := b IS PDerived; b.flag := FALSE; END; END p;",
              "invalid type test: 'Derived' is not an extension of 'Derived'"]
            )
        ),
    "record types as values": testWithContext(
          context(grammar.declarationSequence,
                "TYPE Base = RECORD pBase: POINTER TO Base END;"
                + "Derived = RECORD (Base) END;"
                + "VAR base: Base;"
                + "PROCEDURE procBaseVar(VAR b: Base); END procBaseVar;"
               ),
          pass("PROCEDURE p(b: Base); BEGIN base <- b; procBaseVar(base); base := b; END p;"),
          fail(["PROCEDURE p(); BEGIN baseVar <- base.pBase^; ASSERT(base IS Derived); END p;",
                "invalid type test: a value variable cannot be used"],
               ["PROCEDURE p(VAR b: Base); BEGIN base <- b; ASSERT(base IS Derived); END p;",
                "invalid type test: a value variable cannot be used"],
               ["PROCEDURE p(b: Base); BEGIN base <- b; ASSERT(base IS Derived); END p;",
                "invalid type test: a value variable cannot be used"],
               ["PROCEDURE p(); TYPE Abstract = RECORD PROCEDURE method() END; PROCEDURE test(a: Abstract); BEGIN v <- a; END test; END p;",
                "cannot instantiate 'Abstract' because it has abstract method(s): method"],
               ["PROCEDURE p(); TYPE T = RECORD PROCEDURE method() END; PROCEDURE T.method(); BEGIN ASSERT(SELF(POINTER) # NIL); END T.method; PROCEDURE test(r: T); BEGIN v <- r; END test; END p;",
                "cannot declare a variable of type 'T' (and derived types) because SELF(POINTER) was used in its method(s)"]
              )
      ),
    "arrays as values": testWithContext(
          context(grammar.declarationSequence,
                "TYPE A = ARRAY 3 OF INTEGER; T = RECORD a: A END;"
                + "VAR r: T;"
                + "PROCEDURE procArrayVar(VAR a: A); END procArrayVar;"
               ),
          pass("PROCEDURE p(r: T); BEGIN a <- r.a; a[0] := 123; procArrayVar(a); END p;",
               "PROCEDURE p(a: A); BEGIN tmp <- a; END p;",
               "PROCEDURE p(); VAR a: A; BEGIN tmp <- a; END p;",
               "PROCEDURE p(); VAR a: ARRAY 3 OF BOOLEAN; BEGIN tmp <- a; END p;"
               ),
          fail(["PROCEDURE p(a: ARRAY OF INTEGER); BEGIN v <- a; END p;",
                "cannot initialize variable 'v' with open array"]
              )
    ),
    "FOR variable": testWithContext(
          context(grammar.statement, ""),
          pass("FOR i <- 0 TO 10 DO END",
               "FOR i <- 0 TO 10 DO FOR j <- 0 TO 10 BY 1 DO END END",
               "IF TRUE THEN FOR i <- 0 TO 10 DO END; FOR i <- 0 TO 10 BY 1 DO END; END"
               ),
          fail(["FOR i <- 0.0 TO 10 DO END", "'INTEGER' expression expected to assign 'i', got 'REAL'"],
               ["IF TRUE THEN FOR i <- 0 TO 10 DO END; i := 1; END", "undeclared identifier: 'i'"]
               )
          )
    },
    "type promotion for VAR arguments": testWithContext(
        context(grammar.declarationSequence, 
                "TYPE Base = RECORD END; PBase = POINTER TO Base;"
                + "Derived = RECORD (Base) flag: BOOLEAN END; PDerived = POINTER TO Derived;"),
        pass("PROCEDURE p(VAR b: Base); BEGIN ASSERT((b IS Derived) & b.flag); END p;"),
        fail(["PROCEDURE p(VAR b: PBase); BEGIN ASSERT((b IS PDerived) & b.flag); END p;",
              "type 'Base' has no 'flag' field"])
    ),
    "type promotion for non-VAR arguments": testWithContext(
        context(grammar.declarationSequence, 
                "TYPE Base = RECORD END; PBase = POINTER TO Base;"
                + "Derived = RECORD (Base) flag: BOOLEAN END; PDerived = POINTER TO Derived;"),
        pass("PROCEDURE p(b: PBase); BEGIN ASSERT((b IS PDerived) & b.flag); END p;")
    ),
    "Non-VAR arguments cannot be modified": testWithContext(
        context(grammar.declarationSequence, 
                "TYPE PBase = POINTER TO RECORD END; T = RECORD i: INTEGER END;"
                + "PROCEDURE pArrayRef(VAR a: ARRAY OF INTEGER); END pArrayRef;"
                + "PROCEDURE recordVar(VAR r: T); END recordVar;"),
        pass("PROCEDURE p(VAR i: INTEGER); BEGIN i := 0; END p;",
             "PROCEDURE p(VAR b: PBase); BEGIN b := NIL; END p;"),
        fail(["PROCEDURE p(i: INTEGER); BEGIN i := 0; END p;", 
              "cannot assign to non-VAR formal parameter"],
             ["PROCEDURE p(b: PBase); BEGIN b := NIL; END p;", 
              "cannot assign to non-VAR formal parameter"],
             ["PROCEDURE p(a: ARRAY OF INTEGER); BEGIN pArrayRef(a) END p",
              "non-VAR formal parameter cannot be used as VAR parameter"],
             ["PROCEDURE p(r: T); BEGIN recordVar(r); END p",
              "non-VAR formal parameter cannot be used as VAR parameter"],
             ["PROCEDURE p(s1, s2: ARRAY OF CHAR); BEGIN s1 := s2 END p",
              "cannot assign to non-VAR formal parameter"],
             ["PROCEDURE p(s: ARRAY OF CHAR); BEGIN s := \"abc\" END p", 
              "cannot assign to non-VAR formal parameter"]
            )
    ),
    "dynamic ARRAY": {
        "declaration": testWithContext(
            context(grammar.declarationSequence, ""),
            pass("TYPE A = ARRAY * OF INTEGER;",
                 "TYPE A = ARRAY * OF ARRAY * OF INTEGER;",
                 "TYPE A = ARRAY *, * OF INTEGER;",
                 "TYPE A = ARRAY 3, * OF INTEGER;",
                 "TYPE A = ARRAY *, 3 OF INTEGER;",
                 "TYPE A = ARRAY * OF INTEGER; P = PROCEDURE(): A;",
                 "VAR a: ARRAY * OF INTEGER;",
                 "PROCEDURE p(VAR a: ARRAY * OF INTEGER);END p;",
                 "PROCEDURE p(VAR a: ARRAY * OF ARRAY * OF INTEGER);END p;",
                 "PROCEDURE p(VAR a: ARRAY OF ARRAY * OF INTEGER);END p;"
                 ),
            fail(["TYPE A = ARRAY OF INTEGER;", "not parsed"],
                 ["TYPE P = PROCEDURE(): ARRAY OF INTEGER;", "';' expected"])
        ),
        "return": testWithContext(
            context(grammar.declarationSequence, 
                    "TYPE A = ARRAY * OF INTEGER; B = ARRAY * OF BOOLEAN;"
                    + "VAR a: A; b: B;"),
            pass("PROCEDURE p(): A; RETURN a END p;",
                 "PROCEDURE p(): A; VAR static: ARRAY 3 OF INTEGER; RETURN static END p;"),
            fail(["PROCEDURE p(): ARRAY OF INTEGER; RETURN a; END p;", "not parsed"],
                 ["PROCEDURE p(): A; RETURN b; END p;", "RETURN 'ARRAY * OF INTEGER' expected, got 'ARRAY * OF BOOLEAN'"])
        ),
        "pass as non-VAR argument": testWithContext(
            context(grammar.statement, 
                    "TYPE A = ARRAY * OF INTEGER; B = ARRAY * OF BOOLEAN;"
                    + "VAR a: A; b: B; aStatic: ARRAY 3 OF INTEGER;"
                    + "PROCEDURE pa(a: A); END pa;"
                    + "PROCEDURE pOpenA(a: ARRAY OF INTEGER); END pOpenA;"),
            pass("pa(a)",
                 "pa(aStatic)",
                 "pOpenA(a)"),
            fail(["pa(b)", "type mismatch for argument 1: 'ARRAY * OF BOOLEAN' cannot be converted to 'ARRAY * OF INTEGER'"])
        ),
        "pass as VAR argument": testWithContext(
            context(grammar.statement, 
                    "TYPE A = ARRAY * OF INTEGER; B = ARRAY * OF BOOLEAN;"
                    + "VAR a: A; b: B; aStatic: ARRAY 3 OF INTEGER;"
                    + "PROCEDURE paVar(VAR a: A); END paVar;"
                    + "PROCEDURE paVarOpen(VAR a: ARRAY OF INTEGER); END paVarOpen;"),
            pass("paVar(a)",
                 "paVarOpen(a)"),
            fail(["paVar(aStatic)", "type mismatch for argument 1: cannot pass 'ARRAY 3 OF INTEGER' as VAR parameter of type 'ARRAY * OF INTEGER'"])
        )
    }
};