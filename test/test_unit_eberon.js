"use strict";

var Class = require("rtl.js").Class;
//var EberonCodeGenerator = require("js/EberonCodeGenerator.js");
var language = require("eberon/eberon_grammar.js").language;
var TestUnitCommon = require("test_unit_common.js");
var TypePromotion = require("js/EberonTypePromotion.js");

var assert = TestUnitCommon.assert;
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

function testWithGrammar(parser, pass, fail){
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
        + "PROCEDURE proc(b: BOOLEAN): BOOLEAN; RETURN b END proc;"
        + "PROCEDURE passPDerived(p: PDerived): BOOLEAN; RETURN TRUE END;"
        ),
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

var TestVar = Class.extend({
    init: function(){
        this.__type = "type";
    },
    type: function(){return this.__type;},
    setType: function(type){this.__type = type;}
});

exports.suite = {
//"code": makeCodeSuite(),
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
         ["STRING: INTEGER", "'STRING' already declared"]
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
          "cannot instantiate 'D' because it has abstract method(s): p"],
         ["PROCEDURE p(); TYPE HasAbstractField = RECORD f: T; END; END;",
          "cannot instantiate 'T' because it has abstract method(s): p"]
        )
    ),
"new method declaration": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD PROCEDURE p(); intField: INTEGER END; A = ARRAY 1 OF INTEGER;"),
    pass("PROCEDURE T.p(); END T.p;",
         "PROCEDURE T.p(); END;"
         ),
    fail(["PROCEDURE TUnk.p(); END TUnk.p;", "undeclared identifier: 'TUnk'"],
         ["PROCEDURE A.p(); END A.p;",
          "RECORD type expected in method declaration, got 'ARRAY 1 OF INTEGER'"],
         ["PROCEDURE T.p(); END p;",
          "mismatched method names: expected 'T.p' at the end (or nothing), got 'p'"],
         ["PROCEDURE T.p(); END T2.p;",
          "mismatched method names: expected 'T.p' at the end (or nothing), got 'T2.p'"],
         ["PROCEDURE T.p(); END T.p2;",
          "mismatched method names: expected 'T.p' at the end (or nothing), got 'T.p2'"],
         ["PROCEDURE T.intField(); END T.intField;",
          "'T' has no declaration for method 'intField'"],
         ["PROCEDURE T.p(); END T.p; PROCEDURE T.p(); END T.p;",
          "method 'T.p' already defined"],
         ["PROCEDURE p(); TYPE T = RECORD PROCEDURE m(); PROCEDURE m() END; END p;",
          "cannot declare a new method 'm': method already was declared"],
         ["PROCEDURE p(); TYPE T = RECORD m: INTEGER; PROCEDURE m() END; END p;",
          "cannot declare method, record already has field 'm'"],
         ["PROCEDURE p(); TYPE T = RECORD PROCEDURE m(); m: INTEGER END; END p;",
          "cannot declare field, record already has method 'm'"]
         )
    ),
"method is not exported in base record": testWithModule(
      "MODULE test;"    
    + "TYPE Base* = RECORD PROCEDURE method(); END;"
    + "END test.",
    pass(),
    fail(["MODULE m; IMPORT test; TYPE D = RECORD(test.Base) PROCEDURE method(); END; END m.", 
          "cannot declare a new method 'method': method already was declared in the base record (but was not exported)"],
         ["MODULE m; IMPORT test; TYPE D = RECORD(test.Base) method: INTEGER; END; END m.", 
          "cannot declare field, record already has method 'method' in the base record (was not exported)"],
         ["MODULE m; IMPORT test; TYPE D = RECORD(test.Base) END; PROCEDURE D.method(); END; END m.", 
          "'D' has no declaration for method 'method'"])
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
          "method 'T.p' already defined"],
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
"SELF as VAR parameter": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD PROCEDURE method() END;"
            + "PROCEDURE refProc(VAR r: T); END;"
            ),
    pass("PROCEDURE T.method(); BEGIN refProc(SELF); END;")
    ),
"SELF as pointer": testWithContext(
    context(grammar.declarationSequence, 
            "TYPE T = RECORD PROCEDURE method() END;"
            + "PT = POINTER TO T;"
            + "VAR pVar: PT;"
            + "PROCEDURE refProc(VAR r: T); END;"
            + "PROCEDURE refPointerProc(VAR p: PT); END;"
            ),
    pass("PROCEDURE T.method(); BEGIN pVar := SELF(POINTER) END T.method;",
         "PROCEDURE p();"
          + "TYPE Derived = RECORD(T) END; VAR pd: POINTER TO Derived;"
          + "PROCEDURE Derived.method(); VAR pVar: PT; BEGIN NEW(pd); pVar := SELF(POINTER); END Derived.method;"
          + "END p;",
          "PROCEDURE T.method(); BEGIN refProc(SELF(POINTER)^) END;"
          ),
    fail(["PROCEDURE T.method(); BEGIN refPointerProc(SELF(POINTER)) END T.method;", 
          "SELF(POINTER) cannot be passed as VAR actual parameter"],
         ["PROCEDURE T.method(); BEGIN SELF(POINTER) := pVar; END T.method;", 
          "cannot assign to SELF(POINTER)"],
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
"method call as statement": testWithContext(
    context(grammar.statement,
              "TYPE T = RECORD PROCEDURE p(); PROCEDURE f(): INTEGER END;"
            + "VAR o: T;"
            + "PROCEDURE T.p(); END T.p;"
            + "PROCEDURE T.f(): INTEGER; RETURN 0 END T.f;"
            ),
    pass("o.p"),
    fail(["o.f", "procedure returning a result cannot be used as a statement"])
    ),
"cannot assign to method": testWithContext(
    context(grammar.statement,
              "TYPE T = RECORD PROCEDURE p() END;"
            + "VAR o: T;"
            + "PROCEDURE T.p(); END T.p;"
            ),
    pass(),
    fail(["o.p := o.p", "method 'p' cannot be referenced"],
         ["o.p := NIL", "cannot assign to method 'p'"])
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
    fail(["proc(o.p)", "method 'p' cannot be referenced"],
         ["v <- o.p", "method 'p' cannot be referenced"])
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
          "method implementation cannot be exported: p"],
         ["TYPE R = RECORD PROCEDURE m*(); END;",
          "method 'm' cannot be exported because record itslef is not exported"] )
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
"import abstract record": testWithModule(
      "MODULE test;"
    + "TYPE T* = RECORD PROCEDURE m*(); END;"
    +      "Derived* = RECORD(T) END;"
    + "END test.",
    pass("MODULE m; IMPORT test; TYPE T = RECORD f: POINTER TO test.T; END; END m."
        ),
    fail(["MODULE m; IMPORT test; TYPE T = RECORD f: test.T; END; END m.",
          "cannot instantiate 'T' because it has abstract method(s): m"],
         ["MODULE m; IMPORT test; TYPE T = RECORD(test.T) END; VAR r: T; END m.",
          "cannot instantiate 'T' because it has abstract method(s): m"],
         ["MODULE m; IMPORT test; TYPE T = RECORD(test.Derived) END; VAR r: T; END m.",
          "cannot instantiate 'T' because it has abstract method(s): m"]
        )
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
          "cannot assign to read-only record's field"],
         ["MODULE m; IMPORT test; TYPE D = RECORD(test.T) END; VAR r: D; BEGIN r.f := 123; END m.",
          "cannot assign to read-only record's field"]
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
    fail(["a := s1", "type mismatch: 'ARRAY 10 OF CHAR' cannot be assigned to 'STRING' expression"],
         ["s1 := a", "type mismatch: 'STRING' cannot be assigned to 'ARRAY 10 OF CHAR' expression"]
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
         ["pCharByVar(s[0])", "string element cannot be passed as VAR actual parameter"]
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
"type promotion": {
    "or" : pass(
        function(){
            var or = new TypePromotion.Or();
            var a = new TestVar();
            var p = or.next();
            assert(a.type() == "type");
            p.invert();
            p.promote(a, "type1");
            assert(a.type() == "type");
            or.next();
            assert(a.type() == "type1");
            or.reset();
            assert(a.type() == "type");
        },
        function(){
            var or = new TypePromotion.Or();
            var a = new TestVar();
            var p = or.next(p);
            p.promote(a, "type1");
            or.next();
            assert(a.type() == "type");
        },
        function(){
            var or = new TypePromotion.Or();
            var a = new TestVar();
            var p1 = or.next();
            p1.promote(a, "type1");
            var p2 = or.next();
            p2.invert();
            p2.promote(a, "type2");
            assert(a.type() == "type");
            assert(a.type() == "type");
            or.next();
            assert(a.type() == "type2");
            or.reset();
            assert(a.type() == "type");
        }
    ),
    "and": pass(
        function(){
            var and = new TypePromotion.And();
            var a = new TestVar();
            var p = and.next();
            p.promote(a, "type1");
            and.next();
            assert(a.type() == "type1");
            and.reset();
            assert(a.type() == "type");
        },
        function(){ // (a IS type1) & (v OR (a IS type2)) & v
            var and = new TypePromotion.And();
            var a = new TestVar();
            var p = and.next();
            p.promote(a, "type1");
            var subOr = and.next().makeOr();
            subOr.next();
            subOr.next().promote(a, "type2");
            and.next();
            assert(a.type() == "type1");
            and.reset();
            assert(a.type() == "type");
        },
        function(){ // (a IS type1) & ~(v OR ~(a IS type2)) & v
            var and = new TypePromotion.And();
            var a = new TestVar();
            and.next().promote(a, "type1");
            var subOr = and.next();
            subOr.invert();
            subOr = subOr.makeOr();
            subOr.next();
            var p = subOr.next();
            p.invert();
            p.promote(a, "type2");
            and.next();
            assert(a.type() == "type2");
            and.reset();
            assert(a.type() == "type");
        },
        function(){ // (a IS type1) & (v & (a IS type2))
            var and = new TypePromotion.And();
            var a = new TestVar();
            and.next().promote(a, "type1");
            var sub = and.next().makeAnd();
            sub.next();
            assert(a.type() == "type1");
            sub.next().promote(a, "type2");
            assert(a.type() == "type1");
            and.and();
            assert(a.type() == "type2");
            and.or();
            assert(a.type() == "type");
        },
        function(){ // (~(~(a IS type1)) & v) OR v
            var a = new TestVar();
            var or = new TypePromotion.Or();
            var and = or.next().makeAnd();
            var p1 = and.next();
            p1.invert();
            var p2 = p1.makeOr().next().makeAnd().next();
            p2.invert();
            p2.promote(a, "type1");
            and.next();
            assert(a.type() == "type1");
            or.next();
            assert(a.type() == "type");
        },
        function(){ // (v OR (a IS type1)) & v)
            var a = new TestVar();
            var and = new TypePromotion.And();
            var or = and.next().makeOr();
            or.next();
            or.next().makeAnd().next().promote(a, "type1");
            and.next();
            assert(a.type() == "type");
        }
    )
},
"in place variables": {
    "initialization": testWithContext(
        context(grammar.statement,
                "VAR i: INTEGER; s: STRING;"
                + "PROCEDURE p(): BOOLEAN; RETURN FALSE END p;"
                + "PROCEDURE void(); END void;"
               ),
        pass("v <- 0",
             "v <- 1.23",
             "v <- TRUE",
             "v <- i",
             "v <- i + i",
             "v <- \"abc\" + s",
             "v <- s + \"abc\"",
             "v <- \"abc\"",
             "v <- \"abc\" + \"def\"",
             "v <- p()",
             "v <- void" // procedure type
            ),
        fail(["v <-", "initialization expression expected"],
             ["v <- void()", "procedure returning no result cannot be used in an expression"],
             ["v <- NIL", "cannot use NIL to initialize variable 'v'"]
             )
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
             ["PROCEDURE p(); BEGIN i <- 0; IF TRUE THEN IF TRUE THEN i <- 0; END; END; END p;",
              "'i' already declared in procedure scope"],
             ["PROCEDURE p(); BEGIN WHILE FALSE DO i <- 0; WHILE FALSE DO i <- 0; END; END; END p;",
              "'i' already declared in operator scope"]
            )
        ),
    "type promotion in expression": testWithContext(
        temporaryValues.context,
        temporaryValues.passExpressions(
            "(b IS PDerived) & b.flag",
            "(b IS PDerived) & bVar & b.flag",
            "(b IS PDerived) & (bVar OR b.flag)",
            "(b IS PDerived) & (b2 IS PDerived) & b.flag & b2.flag",
            "(b IS PDerived) & proc(TRUE) & b.flag",
            "(b IS PDerived) & ~proc(TRUE) & b.flag",
            "~(~(b IS PDerived)) & b.flag",
            "~~(b IS PDerived) & b.flag",
            "(b IS PDerived) & ((b IS PDerived2) OR bVar) & b.flag",
            "(b IS PDerived) & (bVar OR (b IS PDerived2)) & b.flag",
            "(b IS PDerived) & ~(bVar OR ~(b IS PDerived2)) & b.flag2",
            "~(bVar & (b IS PDerived)) OR b.flag"
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
             "((b IS PDerived) & bVar) = b.flag",
             "b IS PDerived); ASSERT(b.flag",
             "((b IS PDerived) OR (b IS PDerived)) & b.flag",
             "(b IS PDerived) OR (b IS PDerived) OR b.flag",
             "(bVar OR (b IS PDerived)) & b.flag",
             "~(bVar & ~(b IS PDerived)) & b.flag"
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
        temporaryValues.failStatements(
            "bVar := b IS PDerived; ASSERT(b.flag)",
            "bVar := (b IS PDerived) & bVar; ASSERT(b.flag)"
            )
        ),
    "type promotion in ternary operator": testWithContext(
        temporaryValues.context,
        temporaryValues.passExpressions(
            "b IS PDerived ? b.flag : FALSE",
            "~(b IS PDerived) ? FALSE : b.flag",
            "(b IS PDerived) & bVar ? b.flag : FALSE",
            "~~(b IS PDerived) ? b.flag : FALSE"
            ),
        temporaryValues.failExpressions(
            "b IS PDerived ? FALSE : b.flag",
            "(b IS PDerived ? FALSE : TRUE) & b.flag"
            )
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
            "IF bVar THEN ELSIF b IS PDerived THEN ELSIF b IS PDerived THEN ELSIF b IS PDerived THEN END;",
            "IF b IS PDerived THEN IF bVar OR (b IS PDerived2) THEN b.flag := FALSE; END; END"
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
            "IF b IS PDerived THEN ELSIF TRUE THEN b.flag := FALSE; END",
            "IF bVar THEN bVar := (b IS PDerived) & bVar; ASSERT(b.flag); END",
            "IF b IS PDerived ? FALSE : TRUE THEN ASSERT(b.flag); END"
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
              "type mismatch: 'PDerived' cannot be assigned to 'POINTER TO Base' expression"]
            )
        ),
    "type promotion cannot be reset by passing as VAR argument": testWithContext(
        temporaryValues.context,
        pass(),
        fail(["PROCEDURE p(); PROCEDURE procBaseAsVar(VAR p: PBase); END procBaseAsVar;  BEGIN b <- pBase; IF b IS PDerived THEN procBaseAsVar(b); b.flag := FALSE; END; END p;",
              "type mismatch for argument 1: cannot pass 'PDerived' as VAR parameter of type 'PBase'"]
            )
        ),
    "type promotion after dereferencing": testWithContext(
        temporaryValues.context,
        temporaryValues.passExpressions(
            "(b^ IS Derived) & b.flag",
            "(b^ IS Derived) & passPDerived(b)"
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
             ["PROCEDURE p(a: ARRAY OF INTEGER); BEGIN pArrayRef(a) END;",
              "non-VAR formal parameter cannot be passed as VAR actual parameter"],
             ["PROCEDURE p(r: T); BEGIN recordVar(r); END p",
              "non-VAR formal parameter cannot be passed as VAR actual parameter"],
             ["PROCEDURE p(s1, s2: ARRAY OF CHAR); BEGIN s1 := s2 END p",
              "cannot assign to non-VAR formal parameter"],
             ["PROCEDURE p(s: ARRAY OF CHAR); BEGIN s := \"abc\" END p", 
              "cannot assign to non-VAR formal parameter"]
            )
    ),
    "array": {
            "static array indexOf": testWithContext(
                context(grammar.expression, 
                        "TYPE "
                        + "T = RECORD END;"
                        + "VAR "
                        + "r: T;"
                        + "intArray: ARRAY 3 OF INTEGER;"
                        + "boolDynArray: ARRAY * OF BOOLEAN;"
                        + "recordArray: ARRAY 3 OF T;"
                        + "arrayOfArray: ARRAY 3, 4 OF INTEGER;"
                        ),
                pass("intArray.indexOf(0)",
                     "boolDynArray.indexOf(FALSE) = -1"
                    ),
                fail(["intArray.indexOf(TRUE)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"],
                     ["recordArray.indexOf(r)", "'indexOf' is not defined for array of 'T'"],
                     ["arrayOfArray.indexOf(intArray)", "'indexOf' is not defined for array of 'ARRAY 4 OF INTEGER'"],
                     ["intArray.indexOf", "array's method 'indexOf' cannot be referenced"]                
                    )
            ),
            "open array indexOf": testWithGrammar(
                grammar.declarationSequence,
                pass("PROCEDURE p(a: ARRAY OF INTEGER): INTEGER; RETURN a.indexOf(123) END p;"
                    )
            ),
        "dynamic": {
            "declaration": testWithContext(
                context(grammar.declarationSequence, 
                        "TYPE DA = ARRAY * OF INTEGER;"),
                pass("TYPE A = ARRAY * OF INTEGER;",
                     "TYPE A = ARRAY * OF ARRAY * OF INTEGER;",
                     "TYPE A = ARRAY *, * OF INTEGER;",
                     "TYPE A = ARRAY 3, * OF INTEGER;",
                     "TYPE A = ARRAY *, 3 OF INTEGER;",
                     "TYPE P = PROCEDURE(): DA;",
                     "TYPE P = PROCEDURE(VAR a: DA): DA;",
                     "TYPE P = PROCEDURE(VAR a: ARRAY * OF INTEGER): DA;",
                     "TYPE T = RECORD a: ARRAY * OF T END;",
                     "VAR a: ARRAY * OF INTEGER;",
                     "PROCEDURE p(VAR a: ARRAY * OF INTEGER);END p;",
                     "PROCEDURE p(VAR a: ARRAY * OF ARRAY * OF INTEGER);END p;",
                     "PROCEDURE p(VAR a: ARRAY OF ARRAY * OF INTEGER);END p;"
                     ),
                fail(["TYPE A = ARRAY OF INTEGER;", "not parsed"],
                     ["TYPE P = PROCEDURE(): ARRAY OF INTEGER;", "';' expected"],
                     ["TYPE P = PROCEDURE(a: DA);", "dynamic array has no use as non-VAR argument 'a'"],
                     ["TYPE P = PROCEDURE(a: ARRAY * OF INTEGER);", "dynamic array has no use as non-VAR argument 'a'"],
                     ["PROCEDURE p(a: DA);END p;", "dynamic array has no use as non-VAR argument 'a'"],
                     ["PROCEDURE p(a: ARRAY * OF INTEGER);END p;", "dynamic array has no use as non-VAR argument 'a'"],
                     ["PROCEDURE p(a: ARRAY OF ARRAY * OF INTEGER);END p;", "dynamic array has no use as non-VAR argument 'a'"],
                     ["PROCEDURE p(a: ARRAY * OF ARRAY OF INTEGER);END p;", "dynamic array has no use as non-VAR argument 'a'"]
                     )
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
                        "TYPE Int3 = ARRAY 3 OF INTEGER;"
                        + "VAR dInt: ARRAY * OF INTEGER;"
                        + "dIntInt: ARRAY *,* OF INTEGER;"
                        + "PROCEDURE pOpenInt(a: ARRAY OF INTEGER); END pOpenInt;"
                        + "PROCEDURE pOpenIntOfInt(a: ARRAY OF ARRAY OF INTEGER); END pOpenIntOfInt;"
                        + "PROCEDURE pInt3(a: Int3); END pInt3;"),
                pass("pOpenInt(dInt)",
                     "pOpenIntOfInt(dIntInt)"),
                fail(["pInt3(dInt)", "type mismatch for argument 1: 'ARRAY * OF INTEGER' cannot be converted to 'ARRAY 3 OF INTEGER'"])
            ),
            "pass as VAR argument": testWithContext(
                context(grammar.statement, 
                        "TYPE A = ARRAY * OF INTEGER; B = ARRAY * OF BOOLEAN;"
                        + "VAR a: A; b: B; aStatic: ARRAY 3 OF INTEGER;"
                        + "aIntInt: ARRAY * OF ARRAY * OF INTEGER;"
                        + "aInt3Int: ARRAY * OF ARRAY 3 OF INTEGER;"
                        + "PROCEDURE paVar(VAR a: A); END paVar;"
                        + "PROCEDURE paVarOpen(VAR a: ARRAY OF INTEGER); END paVarOpen;"
                        + "PROCEDURE pDynamicIntOfInt(VAR a: ARRAY * OF ARRAY * OF INTEGER); END pDynamicIntOfInt;"
                        + "PROCEDURE pDynamicIntOfOpenInt(VAR a: ARRAY * OF ARRAY OF INTEGER); END pDynamicIntOfOpenInt;"
                        ),
                pass("paVar(a)",
                     "paVarOpen(a)",
                     "pDynamicIntOfInt(aIntInt)",
                     "pDynamicIntOfOpenInt(aIntInt)",
                     "pDynamicIntOfOpenInt(aInt3Int)"
                     ),
                fail(["paVar(aStatic)", "type mismatch for argument 1: cannot pass 'ARRAY 3 OF INTEGER' as VAR parameter of type 'ARRAY * OF INTEGER'"],
                     ["pDynamicIntOfInt(aInt3Int)", "type mismatch for argument 1: 'ARRAY *, 3 OF INTEGER' cannot be converted to 'ARRAY *, * OF INTEGER'"]
                     )
            ),
            "assign": testWithContext(
                context(grammar.statement, 
                        "VAR stat: ARRAY 3 OF INTEGER; dynamic: ARRAY * OF INTEGER;"),
                pass("dynamic := stat"),
                fail(["stat := dynamic", "type mismatch: 'ARRAY 3 OF INTEGER' cannot be assigned to 'ARRAY * OF INTEGER' expression"],
                     ["dynamic := NIL", "type mismatch: 'ARRAY * OF INTEGER' cannot be assigned to 'NIL' expression"])
            ),
            "indexing": testWithContext(
                context(grammar.expression, 
                        "VAR a: ARRAY * OF INTEGER;"),
                pass("a[0]", "a[1]"),
                fail(["a[-1]", "index is negative: -1"], 
                     ["a[-2]", "index is negative: -2"])
            ),
            "indexOf": testWithContext(
                context(grammar.expression, 
                        "VAR intArray: ARRAY * OF INTEGER;"
                        ),
                pass("intArray.indexOf(0)"),
                fail()
            ),
            "add": testWithContext(
                context(grammar.statement, 
                        "VAR a: ARRAY * OF INTEGER;"
                         + "a2: ARRAY * OF ARRAY * OF INTEGER;"
                         + "aStatic: ARRAY 3 OF INTEGER;"
                         + "byte: BYTE;"),
                pass("a.add(123)",
                     "a.add(byte)",
                     "a2.add(a)",
                     "a2.add(aStatic)"
                     ),
                fail(["a.add := NIL", "cannot assign to dynamic array's method 'add'"],
                     ["v <- a.add", "dynamic array's method 'add' cannot be referenced"],                
                     ["a.add()", "method 'add' expects one argument, got nothing"],
                     ["a.add(1, 2)", "method 'add' expects one argument, got many"],                
                     ["a.add(TRUE)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"]                
                    )
            ),
            "add open array to dynamic array of static arrays": testWithContext(
                context(grammar.declarationSequence, 
                        "VAR a: ARRAY * OF ARRAY 3 OF INTEGER;"),
                pass(),
                fail(["PROCEDURE p(paramA: ARRAY OF INTEGER); BEGIN a.add(paramA); END p", 
                      "type mismatch for argument 1: 'ARRAY OF INTEGER' cannot be converted to 'ARRAY 3 OF INTEGER'"]                
                    )
            ),
            "remove": testWithContext(
                context(grammar.statement, 
                        "VAR a: ARRAY * OF INTEGER;"),
                pass("a.remove(0)"),
                fail(["a.remove(-1)", "index is negative: -1"],
                     ["a.remove()", "1 argument(s) expected, got 0"],
                     ["a.remove(0, 1)", "1 argument(s) expected, got 2"],
                     ["a.remove(TRUE)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"],
                     ["a.Remove(0)", "selector '.Remove' cannot be applied to 'ARRAY * OF INTEGER'"]
                    )
            ),
            "clear": testWithContext(
                context(grammar.statement, 
                        "VAR a: ARRAY * OF INTEGER;"),
                pass("a.clear()"),
                fail(["a.clear(0)", "0 argument(s) expected, got 1"])
            ),
            "add, remove and clear cannot be called for read-only array": testWithContext(
                context(grammar.declarationSequence, 
                        "TYPE T = RECORD a: ARRAY * OF INTEGER; END;"),
                pass("PROCEDURE p(VAR r: T); BEGIN r.a.add(1); END;",
                     "PROCEDURE p(VAR r: T); BEGIN r.a.remove(1); END;",
                     "PROCEDURE p(VAR r: T); BEGIN r.a.clear(); END;"
                     ),
                fail(["PROCEDURE p(r: T); BEGIN r.a.add(1); END;", "method 'add' cannot be applied to non-VAR dynamic array"],
                     ["PROCEDURE p(r: T); BEGIN r.a.remove(1); END;", "method 'remove' cannot be applied to non-VAR dynamic array"],
                     ["PROCEDURE p(r: T); BEGIN r.a.clear(); END;", "method 'clear' cannot be applied to non-VAR dynamic array"]
                    )
            )
        }
    },
"syntax relaxation": testWithGrammar(
    grammar.declarationSequence, 
    pass("PROCEDURE p; END;",
         "TYPE T = RECORD field: INTEGER; END;",
         "TYPE T = RECORD PROCEDURE method(); END;",
         "TYPE T = RECORD PROCEDURE method(); END; PROCEDURE T.method(); END;",
         "PROCEDURE p(): INTEGER; RETURN 0; END;"
         )
    ),
"constructor": {
    "declaration": testWithGrammar(
        grammar.declarationSequence, 
        pass("TYPE T = RECORD PROCEDURE T(); END; PROCEDURE T.T(); END;",
             "TYPE T = RECORD PROCEDURE T(); i: INTEGER; END; PROCEDURE T.T(); BEGIN SELF.i := 0; END;",
             "TYPE T = RECORD PROCEDURE T(); END; PROCEDURE T.T(); END T.T;",
             "TYPE T = RECORD PROCEDURE T(a: INTEGER); END; PROCEDURE T.T(a: INTEGER); END;"
        ),
        fail(["TYPE T = RECORD END; PROCEDURE T(); END;", "'T' already declared"],
             ["TYPE T = RECORD END; PROCEDURE T.T(); END;", "constructor was not declared for 'T'"],
             ["TYPE T = RECORD PROCEDURE T(); END; PROCEDURE T.T(a: INTEGER); END;", "constructor 'T' signature mismatch: declared as 'PROCEDURE' but defined as 'PROCEDURE(INTEGER)'"],
             ["TYPE T = RECORD PROCEDURE T(); PROCEDURE T(); END;", "constructor 'T' already declared"],
             ["TYPE T = RECORD PROCEDURE T(); END; PROCEDURE T.T(); END T;", "mismatched method names: expected 'T.T' at the end (or nothing), got 'T'"],
             ["TYPE T = RECORD PROCEDURE T(); END; PROCEDURE p(); PROCEDURE T.T(); END; END;", "method should be defined in the same scope as its bound type 'T'"],
             ["PROCEDURE p(); TYPE T = RECORD PROCEDURE T(); END; END;", "constructor was declared for 'T' but was not defined"],
             ["TYPE T = RECORD PROCEDURE T(); END; PROCEDURE T.T(); END; PROCEDURE T.T(); END;", "constructor already defined for 'T'"],   
             ["TYPE T = RECORD PROCEDURE T(): INTEGER; END;", "constructor 'T' cannot have result type specified"],
             ["TYPE T = ARRAY 3 OF INTEGER; PROCEDURE T(); END;", "'T' already declared"]
             )
        ),
    "as expression": testWithContext(
        context(grammar.expression,
                "TYPE T = RECORD i: INTEGER; END; PT = POINTER TO T; ProcType = PROCEDURE(): INTEGER;"
                + "ConsWithArguments = RECORD PROCEDURE ConsWithArguments(a: INTEGER); END;"
                + "PROCEDURE ConsWithArguments.ConsWithArguments(a: INTEGER); END;"
                + "PROCEDURE byVar(VAR a: T): INTEGER; RETURN 0; END;"
                + "PROCEDURE byNonVar(a: T): INTEGER; RETURN 0; END;"
                ),
        pass("T()",
             "byNonVar(T())",
             "T().i",
             "ConsWithArguments(123)"
             ),
        fail(["ProcType()", "PROCEDURE expected, got 'ProcType'"],
             ["PT()", "PROCEDURE expected, got 'PT'"],
             ["byVar(T())", "expression cannot be used as VAR parameter"],
             ["T(0)", "0 argument(s) expected, got 1"],
             ["ConsWithArguments()", "1 argument(s) expected, got 0"],
             ["ConsWithArguments(FALSE)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"]
            )
        ),
    "initialize in place variable": testWithContext(
        context(grammar.statement,
                "TYPE T = RECORD END;"),
        pass("r <- T()"),
        fail()
        ),
    "call base - correct": testWithContext(
        context(grammar.declarationSequence,
                "TYPE T = RECORD PROCEDURE T(a: INTEGER); END;"
                + "Derived = RECORD(T) PROCEDURE Derived(); END;"
                + "PROCEDURE T.T(a: INTEGER); END;"
               ),
        pass("PROCEDURE Derived.Derived() | SUPER(0); END;")
        ),
    "call base - incorrect": testWithContext(
        context(grammar.declarationSequence,
                "TYPE T = RECORD PROCEDURE T(a: INTEGER); END;"
                + "RecordWthoutBase = RECORD END;"
                + "Derived = RECORD(T) PROCEDURE Derived(); END;"
                + "DerivedWthoutConstructor = RECORD(RecordWthoutBase) PROCEDURE DerivedWthoutConstructor(); END;"
                + "RecordWthConstructorNoParameters = RECORD PROCEDURE RecordWthConstructorNoParameters(); END;"
                + "DerivedWthConstructorNoParameters = RECORD(RecordWthConstructorNoParameters) PROCEDURE DerivedWthConstructorNoParameters(); END;"
                + "PROCEDURE T.T(a: INTEGER); END;"
                + "PROCEDURE RecordWthConstructorNoParameters.RecordWthConstructorNoParameters(); END;"
               ),
        pass(),
        fail(["PROCEDURE Derived.Derived(); END;", "base record constructor has parameters but was not called (use '| SUPER' to pass parameters to base constructor)"],
             ["PROCEDURE Derived.Derived() | SUPER(1, 2); END;", "1 argument(s) expected, got 2"],
             ["PROCEDURE Derived.Derived() | SUPER(FALSE); END;", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"],
             ["PROCEDURE Derived.Derived() | SUPER(); END;", "1 argument(s) expected, got 0"],
             ["PROCEDURE Derived.Derived(); BEGIN SUPER(0); END;", "cannot call base constructor from procedure body (use '| SUPER' to pass parameters to base constructor)"],
             ["PROCEDURE RecordWthoutBase.RecordWthConstructorNoParametersthoutBase() | SUPER(0); END;", "'RecordWthoutBase' has no base type - SUPER cannot be used"],
             ["PROCEDURE DerivedWthoutConstructor.DerivedWthoutConstructor() | SUPER(); END;", "base record constructor has no parameters and will be called automatically (do not use '| SUPER' to call base constructor)"],
             ["PROCEDURE DerivedWthConstructorNoParameters.DerivedWthConstructorNoParameters() | SUPER(); END;", "base record constructor has no parameters and will be called automatically (do not use '| SUPER' to call base constructor)"]
            )
        ),
    "initialize fields (of non record type)": testWithContext(
        context(grammar.declarationSequence,
                "TYPE T = RECORD PROCEDURE T(); i: INTEGER; END;"),
        pass("PROCEDURE T.T() | i(123); END;"),
        fail(["PROCEDURE T.T() | i(); END;", "single argument expected to initialize field 'i'"],
             ["PROCEDURE T.T() | i(123, 456); END;", "single argument expected to initialize field 'i'"],
             ["PROCEDURE T.T() | i(TRUE); END;", 
              "type mismatch: field 'i' is 'INTEGER' and cannot be initialized using 'BOOLEAN' expression"]
            )
        ),
    "initialize array fields": testWithContext(
        context(grammar.declarationSequence,
                "TYPE RecordWithArray = RECORD PROCEDURE RecordWithArray(a: ARRAY OF INTEGER); aStatic: ARRAY 3 OF INTEGER; aDynamic: ARRAY * OF INTEGER; END;"
                ),
        pass("PROCEDURE RecordWithArray.RecordWithArray(a: ARRAY OF INTEGER) | aDynamic(a); END;"),
        fail(["PROCEDURE RecordWithArray.RecordWithArray(a: ARRAY OF INTEGER) | aStatic(a); END;", 
              "type mismatch: field 'aStatic' is 'ARRAY 3 OF INTEGER' and cannot be initialized using 'ARRAY OF INTEGER' expression"]
            )
        ),
    "initialize fields (of record type)": testWithContext(
        context(grammar.declarationSequence,
                "TYPE Field = RECORD PROCEDURE Field(a: INTEGER); END;"
              + "PROCEDURE Field.Field(a: INTEGER); END;"),
        pass("TYPE T = RECORD PROCEDURE T(); f: Field; END; PROCEDURE T.T() | f(123); END;"),
        fail(["TYPE T = RECORD PROCEDURE T(); f: Field; END; PROCEDURE T.T(); END;", 
              "constructor 'T' must initialize fields: f"],
             ["TYPE T = RECORD PROCEDURE T(); END; PROCEDURE T.T() | unknownField(123); END;", 
              "'unknownField' is not record 'T' own field"],
             ["TYPE T = RECORD f: Field; END; Derived = RECORD(T) PROCEDURE Derived(); END; PROCEDURE Derived.Derived() | f(123); END;", 
              "'f' is not record 'Derived' own field"],
             ["TYPE T = RECORD PROCEDURE T(); f: Field; END; PROCEDURE T.T() | f(123), f(123); END;", 
              "field 'f' is already initialized"]
             )
        ),
    "initialize fields using SELF": testWithContext(
        context(grammar.declarationSequence,
                "TYPE T = RECORD PROCEDURE T(); i1, i2: INTEGER; END;"
                ),
        pass("PROCEDURE T.T() | i2(SELF.i1); END;"),
        fail()
        ),
    "call base and initialize fields": testWithContext(
        context(grammar.declarationSequence,
                "TYPE Field = RECORD PROCEDURE Field(a: INTEGER); END;"
              + "T = RECORD PROCEDURE T(a: INTEGER); END;"
              + "Derived = RECORD(T) PROCEDURE Derived(); f: Field; END;"
              + "PROCEDURE Field.Field(a: INTEGER); END;"
              + "PROCEDURE T.T(a: INTEGER); END;"
              ),
        pass("PROCEDURE Derived.Derived() | SUPER(123), f(456); END;"),
        fail(["PROCEDURE Derived.Derived() | f(456), SUPER(123); END;", "not parsed"])
        ),
    "fields initialization order": testWithContext(
        context(grammar.declarationSequence,
                "TYPE Field = RECORD PROCEDURE Field(a: INTEGER); END;"
              + "T = RECORD PROCEDURE T(); f1: Field; f2, f3: Field; END;"
              + "PROCEDURE Field.Field(a: INTEGER); END;"
              ),
        pass("PROCEDURE T.T() | f1(1), f2(2), f3(3); END;"),
        fail(["PROCEDURE T.T() | f2(2), f1(1), f3(3); END;", "field 'f1' must be initialized before 'f2'"],
             ["PROCEDURE T.T() | f1(1), f3(3), f2(2); END;", "field 'f2' must be initialized before 'f3'"]
            )
        ),
    "fields with constructor but record without constructor": testWithContext(
        context(grammar.declarationSequence,
                "TYPE Field = RECORD PROCEDURE Field(a: INTEGER); END;"
              + "PROCEDURE Field.Field(a: INTEGER); END;"
              ),
        pass(),
        fail(["TYPE T = RECORD f: Field; END;", "constructor 'T' must initialize fields: f"])
        ),
    "inherit constructor parameters": testWithContext(
        context(grammar.expression,
                "TYPE Base = RECORD PROCEDURE Base(i: INTEGER); END;"
              + "Derived = RECORD(Base) END;"
              + "PROCEDURE Base.Base(a: INTEGER); END;"
              ),
        pass("Derived(123)"),
        fail(["Derived()", "1 argument(s) expected, got 0"])
        ),
    "ARRAY OF record with constructor": testWithContext(
        context(grammar.declarationSequence,
                "TYPE NoParams = RECORD PROCEDURE NoParams(); END;"
              + "WithParams = RECORD PROCEDURE WithParams(i: INTEGER); END;"
              + "PROCEDURE NoParams.NoParams(); END;"
              + "PROCEDURE WithParams.WithParams(i: INTEGER); END;"
              ),
        pass("TYPE T = ARRAY * OF NoParams;",
             "TYPE T = ARRAY 3 OF NoParams;",
             "TYPE T = ARRAY * OF WithParams;",
             "VAR a: ARRAY 3 OF NoParams;",
             "VAR a: ARRAY * OF WithParams;",
             "PROCEDURE p(); VAR a: ARRAY * OF WithParams; BEGIN a.add(WithParams(123)); END;"
            ),
        fail(["TYPE T = ARRAY 3 OF WithParams;", "cannot use 'WithParams' as an element of static array because it has constructor with parameters"],
             ["VAR a: ARRAY 3 OF WithParams;", "cannot use 'WithParams' as an element of static array because it has constructor with parameters"]
            )
        ),
    "NEW": testWithContext(
        context(grammar.statement,
                "TYPE WithParams = RECORD PROCEDURE WithParams(i: INTEGER); END;"
              + "DerivedWithParams = RECORD(WithParams) END;"
              + "VAR p: POINTER TO WithParams; pd: POINTER TO DerivedWithParams;"
              + "PROCEDURE WithParams.WithParams(i: INTEGER); END;"
              ),
        pass(),
        fail(["NEW(p)", "cannot use procedure NEW for 'WithParams' because it has constructor with parameters, use operator NEW instead"],
             ["NEW(pd)", "cannot use procedure NEW for 'DerivedWithParams' because it has constructor with parameters, use operator NEW instead"]
            )
        ),
    "export": testWithModule(
          "MODULE test;"
        + "TYPE Exported* = RECORD PROCEDURE Exported*(); END;"
        + "NotExported* = RECORD PROCEDURE NotExported(); END;"
        + "DerivedNotExportedWithoutConstructor* = RECORD (NotExported) END;"
        + "NoConstructor* = RECORD END;"
        + "PROCEDURE Exported.Exported(); END;"
        + "PROCEDURE NotExported.NotExported(); END;"
        + "END test.",
        pass("MODULE m; IMPORT test; VAR r: test.Exported; p: POINTER TO test.Exported; BEGIN p := NEW test.Exported(); NEW(p); END m.",
             "MODULE m; IMPORT test; TYPE T = RECORD(test.Exported) END; END m.",
             "MODULE m; IMPORT test; TYPE T = RECORD(test.NoConstructor) END; END m.",
             "MODULE m; IMPORT test; TYPE T = RECORD(test.DerivedNotExportedWithoutConstructor) END; END m.",
             "MODULE m; IMPORT test; PROCEDURE p(r: test.NotExported); BEGIN copy <- r; END; END m."
            ),
        fail(["MODULE m; TYPE T = RECORD PROCEDURE T*(); END; END m.",
              "constructor 'T' cannot be exported because record itslef is not exported"],
             ["MODULE m; IMPORT test; TYPE T = RECORD(test.NotExported) END; END m.",
              "cannot extend 'NotExported' - its constructor was not exported"],
             ["MODULE m; IMPORT test; VAR r: test.NotExported; END m.",
              "cannot instantiate 'NotExported' - its constructor was not exported"],
             ["MODULE m; IMPORT test; VAR p: POINTER TO test.NotExported; BEGIN NEW(p); END m.",
              "cannot instantiate 'NotExported' - its constructor was not exported"],
             ["MODULE m; IMPORT test; VAR p: POINTER TO test.NotExported; BEGIN p := NEW test.NotExported(); END m.",
              "cannot instantiate 'NotExported' - its constructor was not exported"],
             ["MODULE m; IMPORT test; VAR a: ARRAY 3 OF test.NotExported; END m.",
              "cannot instantiate 'NotExported' - its constructor was not exported"]
            )
        )
    },
"operator NEW": testWithContext(
    context(grammar.expression,
            "TYPE T = RECORD field: INTEGER; END; Proc = PROCEDURE();"
            + "ParamCons = RECORD PROCEDURE ParamCons(i: INTEGER); END;"
            + "Abstract = RECORD PROCEDURE abstract(); END;"
            + "PROCEDURE ParamCons.ParamCons(i: INTEGER); END;"
            + "PROCEDURE proc(); END;"
          ),
    pass("NEW T()",
         "NEW ParamCons(123)",
         "NEW T().field",
         "NEW T()^"
         ),
    fail(["NEW INTEGER()", "record type is expected in operator NEW, got 'INTEGER'"],
         ["NEW proc()", "record type is expected in operator NEW, got 'procedure 'proc''"],
         ["NEW Proc()", "record type is expected in operator NEW, got 'Proc'"],
         ["NEW T().unknownField", "type 'T' has no 'unknownField' field"],
         ["NEW T(123)", "0 argument(s) expected, got 1"],
         ["NEW Abstract()", "cannot instantiate 'Abstract' because it has abstract method(s): abstract"],
         ["NEW undeclared()", "undeclared identifier: 'undeclared'"]
         )
    ),
"FOR IN": {
    "array": testWithContext(
        context(grammar.statement, 
                "VAR a: ARRAY 3 OF BOOLEAN;"),
        pass("FOR i, v IN a DO END",
             "FOR i, v IN a DO ASSERT(a[i] = v); END",
             "FOR v IN a DO END",
             "FOR v IN a DO ASSERT(~v) END"),
        fail()
    ),
    "string": testWithContext(
        context(grammar.statement,
                "CONST cc = 22X; cs = \"abc\";"
              + "VAR s: STRING; as: ARRAY 3 OF CHAR;"),
        pass("FOR c IN s DO END",
             "FOR c IN cc DO END",
             "FOR c IN cs DO END",
             "FOR c IN as DO END",
             "FOR c IN \"abc\" DO END",
             "FOR c IN 22X DO END"
            ),
        fail(["FOR c IN as DO c := 22X; END", "cannot assign to FOR variable"])
    ),
    "map": testWithContext(
        context(grammar.statement,
                "TYPE T = RECORD END;"
              + "VAR m: MAP OF INTEGER; r: T;"),
        pass("FOR k, v IN m DO END",
             "FOR k, v IN m DO ASSERT(k # \"abc\"); END",
             "FOR k, v IN m DO ASSERT(v # 123); END"
            ),
        fail(["FOR k, k IN m DO END", "'k' already declared"],
             ["FOR m, v IN m DO END", "'m' already declared in module scope"],
             ["FOR k, m IN m DO END", "'m' already declared in module scope"],
             ["FOR k, v IN m DO k := \"\"; END", "cannot assign to FOR variable"],
             ["FOR k, v IN m DO v := 0; END", "cannot assign to FOR variable"],
             ["FOR k, v IN r DO END", "expression of type ARRAY, STRING or MAP is expected in FOR, got 'T'"],
             ["FOR k, v IN T DO END", "type name 'T' cannot be used as an expression"]
            )
        ),
    "scope": testWithContext(
        context(grammar.declarationSequence,
                "VAR m: MAP OF INTEGER;"),
        pass(),
        fail(["PROCEDURE p(); BEGIN FOR k, v IN m DO END; ASSERT(k # \"abc\"); END;", "undeclared identifier: 'k'"],
             ["PROCEDURE p(); BEGIN FOR k, v IN m DO END; ASSERT(v # 123); END;", "undeclared identifier: 'v'"]
             )
        )
},
"map": {
    "declaration": testWithGrammar(
        grammar.declarationSequence, 
        pass("TYPE M = MAP OF INTEGER;",
             "TYPE M = MAP OF PROCEDURE;",
             "TYPE M = MAP OF PROCEDURE();",
             "TYPE M = MAP OF PROCEDURE(): INTEGER;",
             "TYPE M = MAP OF PROCEDURE(): M;",
             "TYPE M = MAP OF RECORD END;",
             "TYPE M = MAP OF POINTER TO RECORD END;",
             "TYPE M = MAP OF MAP OF INTEGER;",
             "TYPE M = MAP OF ARRAY * OF INTEGER;",
             "TYPE M = MAP OF M;",
             "TYPE T = RECORD field: MAP OF T; END;",
             "VAR v: MAP OF SET;"
            ),
        fail(["TYPE P = POINTER TO MAP OF INTEGER;", "RECORD is expected as a POINTER base type, got 'MAP OF INTEGER'"],
             ["TYPE M = MAP OF Undeclared;", "undeclared identifier: 'Undeclared'"],
             ["VAR MAP: INTEGER;", "not parsed"]
            )
        ),
    "assign": testWithContext(
        context(grammar.statement, 
                "TYPE MapOfInteger = MAP OF INTEGER;"
                + "VAR mapOfInteger1: MapOfInteger; mapOfInteger2: MAP OF INTEGER;"
                + "mapOfString: MAP OF STRING;"),
        pass("mapOfInteger1 := mapOfInteger2"),
        fail(["mapOfInteger1 := mapOfString", "type mismatch: 'MAP OF INTEGER' cannot be assigned to 'MAP OF STRING' expression"])
    ),
    "put": testWithContext(
        context(grammar.statement,
                "VAR m: MAP OF INTEGER;"
                + "sIndex: STRING; aIndex: ARRAY 3 OF CHAR;"),
        pass("m[\"abc\"] := 123",
             "m[sIndex] := 123",
             "m[aIndex] := 123"
            ),
        fail(["m[123] := 123", "invalid MAP key type: STRING or string literal or ARRAY OF CHAR expected, got 'INTEGER'"])
        ),
    "get": testWithContext(
        context(grammar.expression,
                "VAR m: MAP OF INTEGER;"
                + "sIndex: STRING; aIndex: ARRAY 3 OF CHAR;"),
        pass("m[\"abc\"]",
             "m[sIndex]",
             "m[aIndex]"
            ),
        fail(["m[123]", "invalid MAP key type: STRING or string literal or ARRAY OF CHAR expected, got 'INTEGER'"])
        ),
    "get and pass as VAR": testWithContext(
        context(grammar.statement,
                "TYPE T = RECORD END;"
                + "VAR mInt: MAP OF INTEGER;"
                + "    mS: MAP OF STRING;"
                + "    mR: MAP OF T;"
                + "PROCEDURE intByRef(VAR i: INTEGER); END;"
                + "PROCEDURE stringByRef(VAR s: STRING); END;"
                + "PROCEDURE recordByRef(VAR r: T); END;"
                ),
        pass("recordByRef(mR[\"a\"])"),
        fail(["intByRef(mInt[\"a\"])", "cannot reference MAP's element of type 'INTEGER'"],
             ["stringByRef(mS[\"a\"])", "cannot reference MAP's element of type 'STRING'"]
            )
        ),
    "IN": testWithContext(
        context(grammar.expression,
                "VAR m: MAP OF INTEGER;"
                + "sIndex: STRING; aIndex: ARRAY 3 OF CHAR;"),
        pass("\"abc\" IN m",
             "(\"abc\" IN m) = FALSE",
             "sIndex IN m",
             "aIndex IN m"
            ),
        fail(["123 IN m", "invalid MAP key type: STRING or string literal or ARRAY OF CHAR expected, got 'INTEGER'"])
        ),
    "non-VAR parameter": testWithContext(
        context(grammar.declarationSequence,
                "TYPE M = MAP OF INTEGER;"),
        pass(),
        fail(["PROCEDURE p(m: M); BEGIN m[\"abc\"] := 123; END;", "cannot assign to read-only MAP's element of type 'INTEGER'"])
        ),
    "remove": testWithContext(
        context(grammar.statement,
                "VAR m: MAP OF INTEGER; a: ARRAY * OF CHAR;"),
        pass("m.remove(\"abc\")",
             "m.remove(a)"),
        fail(["m.remove(123)", "type mismatch for argument 1: 'INTEGER' cannot be converted to 'ARRAY OF CHAR'"],
             ["m.remove()", "1 argument(s) expected, got 0"],
             ["m.remove(\"abc\", \"abc\")", "1 argument(s) expected, got 2"],
             ["v <- m.remove", "MAP's method 'remove' cannot be referenced"]
            )
        ),
    "clear": testWithContext(
        context(grammar.statement,
                "VAR m: MAP OF INTEGER;"),
        pass("m.clear()", "m.clear"),
        fail(["m.clear(123)", "0 argument(s) expected, got 1"]
            )
        ),
    "clear and remove cannot be applied to read only map": testWithContext(
        context(grammar.declarationSequence,
                "TYPE M = MAP OF INTEGER;"),
        pass("PROCEDURE p(VAR m: M); BEGIN; m.remove(\"abc\"); END;",
             "PROCEDURE p(VAR m: M); BEGIN; m.clear(); END;"),
        fail(["PROCEDURE p(m: M); BEGIN; m.remove(\"abc\"); END;", "method 'remove' cannot be applied to non-VAR MAP"],
             ["PROCEDURE p(m: M); BEGIN; m.clear(); END;", "method 'clear' cannot be applied to non-VAR MAP"]
            )
        ),
    "return": testWithContext(
        context(grammar.declarationSequence,
                "TYPE M = MAP OF INTEGER;"),
        pass("PROCEDURE p(): M; VAR m: M; BEGIN; RETURN m; END;")
        )
    },
"ternary operator": testWithContext(
        context(grammar.expression,
                "TYPE Base = RECORD END; PBase = POINTER TO Base;"
                    + "Derived = RECORD(Base) END; PDerived = POINTER TO Derived;"
                    + "Derived2 = RECORD(Base) END; Derived3 = RECORD(Base) END;" 
                + "VAR b: BOOLEAN; i1, i2: INTEGER; s: STRING; byte: BYTE;"
                + "rb: Base; rd: Derived; rd2: Derived2; rd3: Derived3;"
                + "pb: PBase; pd: POINTER TO Derived; pd2: POINTER TO Derived2; pd3: POINTER TO Derived3;"
                + "PROCEDURE passBase(b: Base): BOOLEAN; RETURN TRUE END;"
                + "PROCEDURE passDerived(d: Derived): BOOLEAN; RETURN TRUE END;"
                + "PROCEDURE passPBase(p: PBase): BOOLEAN; RETURN TRUE END;"
                + "PROCEDURE passPDerived(p: PDerived): BOOLEAN; RETURN TRUE END;"
                + "PROCEDURE passRef(VAR i: INTEGER): BOOLEAN; RETURN TRUE END;"
                ),
        pass("b ? i1 : i2",
             "(b ? i1 : i2) # 0",
             "FLT(b ? i1 : i2)",
             "b ? i1 : byte",
             "b ? byte : i1",
             "b ? \"abc\" : \"de\"",
             "b ? s : \"de\"",
             "b ? \"abc\" : s",
             "b ? pb : pd",
             "b ? pd : pb",
             "b ? pb : NIL",
             "b ? NIL : pb",
             "passBase(b ? pb^ : pd^)",
             "passBase(b ? pd^ : pb^)",
             "passBase(b ? pd2^ : pd3^)",
             "passBase(b ? rb : rd)",
             "passBase(b ? rd : rb)",
             "passBase(b ? rd2 : rd3)",
             "b ? i1 : b ? i1 : i2",
             "passPBase(b ? pb : pd)",
             "passPBase(b ? pd : pb)",
             "passPBase(b ? pb : NIL)",
             "passPBase(b ? NIL : pb)"
             ),
        fail(["b ?", "not parsed"],
             ["b ? i1", "expected \":\" after \"?\" in ternary operator"],
             ["b ? i1 :", "expression is expected after \":\" in ternary operator"],
             ["b ? i1 : s", "incompatible types in ternary operator: 'INTEGER' and 'STRING'"],
             ["passBase(b ? pb^ : pd)", "incompatible types in ternary operator: 'Base' and 'POINTER TO Derived'"],
             ["passDerived(b ? pb : pd)", "type mismatch for argument 1: 'POINTER TO Base' cannot be converted to 'Derived'"],
             ["passDerived(b ? pd : pb)", "type mismatch for argument 1: 'POINTER TO Base' cannot be converted to 'Derived'"],
             ["b ? b ? i1 : i2 : i1", "expected \":\" after \"?\" in ternary operator"],
             ["b ? rb : NIL", "incompatible types in ternary operator: 'Base' and 'NIL'"],
             ["b ? NIL : NIL", "cannot use 'NIL' as a result of ternary operator"],
             ["passPDerived(b ? NIL : pb)", "type mismatch for argument 1: 'PBase' cannot be converted to 'PDerived'"],
             ["passPDerived(b ? pb : NIL)", "type mismatch for argument 1: 'PBase' cannot be converted to 'PDerived'"],
             ["passRef(b ? i1 : i2)", "ternary operator result cannot be passed as VAR actual parameter"]
             )
    ),
"array expression": testWithGrammar(
    grammar.expression,
    pass("[1]",
         "[1, 2]",
         "[FALSE, TRUE]"
         ),
    fail(["[]", "not parsed"],
         ["[1, TRUE]", "array's elements should have the same type: expected 'INTEGER', got 'BOOLEAN'"],
         ["[NIL]", "cannot use NIL to initialize array's element"],
         ["[1, NIL]", "cannot use NIL to initialize array's element"],
         ["[[1, 2], [3, 4]]", "array's elements should have the same type: expected 'ARRAY 2 OF INTEGER', got 'ARRAY 2 OF INTEGER'"] // not supported
        )
    ),
"CONST array": testWithGrammar(
    grammar.declarationSequence,
    pass("CONST a = [1];",
         "CONST a = [1, 2];",
         "CONST a = [FALSE, TRUE];"
         )
    ),
"CONST array pass to procedure": testWithContext(
    context(grammar.expression,
            "CONST a = [1, 2, 3];"
            + "PROCEDURE intArray(a: ARRAY OF INTEGER): BOOLEAN; RETURN FALSE; END;"
            + "PROCEDURE intVarArray(VAR a: ARRAY OF INTEGER): BOOLEAN; RETURN FALSE; END;"
            + "PROCEDURE charArray(a: ARRAY OF CHAR): BOOLEAN; RETURN FALSE; END;"
            ),
    pass("intArray(a)"
         ),
    fail(["intVarArray(a)", "constant cannot be passed as VAR actual parameter"],
         ["charArray(a)", "type mismatch for argument 1: 'ARRAY 3 OF INTEGER' cannot be converted to 'ARRAY OF CHAR'"])
    ),
"CONST array with string literals": testWithContext(
    context(grammar.expression,
            "CONST a = [\"a\", \"bc\", \"d\"];"
            + "PROCEDURE stringArray(a: ARRAY OF STRING): BOOLEAN; RETURN FALSE; END;"
            ),
    pass("stringArray(a)")
    )
};
