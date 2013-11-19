"use strict";

var assert = require("assert.js").ok;
var Code = require("code.js");
var Context = require("context.js");
var Errors = require("errors.js");
var Grammar = require("grammar.js");
var oc = require("oc.js");
var ImportRTL = require("rtl.js");
var Scope = require("scope.js");
var Stream = require("stream.js").Stream;
var Test = require("test.js");

var TestError = Test.TestError;
var RTL = ImportRTL.RTL;
var Class = ImportRTL.Class;

function parseInContext(grammar, s, context){
    var stream = new Stream(s);
    if (!grammar(stream, context) || !stream.eof())
        throw new Errors.Error("not parsed");
}

var TestContext = Context.Context.extend({
    init: function TestContext(){
        Context.Context.prototype.init.call(this, Code.nullGenerator, new RTL());
        this.pushScope(new Scope.Module("test"));
    },
    qualifyScope: function(){return "";}
});

function makeContext(){return new TestContext();}

function runAndHandleErrors(action, s, handlerError){
    try {
        action(s);
    }
    catch (x){
        if (!(x instanceof Errors.Error))
            throw new Error("'" + s + "': " + x + "\n" 
                            + (x.stack ? x.stack : "(no stack)"));
        
        if (handlerError)
            handlerError(x);
        //else
        //  throw x;
        //  console.log(s + ": " + x);
        return false;
    }
    return true;
}

function parseUsingGrammar(grammar, s, cxFactory){
    var baseContext = makeContext();
    var context = cxFactory ? cxFactory(baseContext) : baseContext;
    parseInContext(grammar, s, context);
}

function setup(run){
    return {
        expectOK: function(s){
            function handleError(e){throw new TestError(s + "\n\t" + e);}

            if (!runAndHandleErrors(run, s, handleError))
                throw new TestError(s + ": not parsed");
        },
        expectError: function(s, error){
            function handleError(actualError){
                var sErr = actualError.toString();
                if (sErr != error)
                    throw new TestError(s + "\n\texpected error: " + error + "\n\tgot: " + sErr );
            }

            if (runAndHandleErrors(run, s, handleError))
                throw new TestError(s + ": should not be parsed, expect error: " + error);
        }
    };
}

function setupParser(parser, contextFactory){
    function parseImpl(s){
        return parseUsingGrammar(parser, s, contextFactory);
    }
    return setup(parseImpl);
}

function setupWithContext(grammar, source){
    function innerMakeContext(){
        var context = makeContext();
        try {
            parseInContext(Grammar.declarationSequence, source, context);
        }
        catch (x) {
            if (x instanceof Errors.Error)
                throw new TestError("setup error: " + x + "\n" + source);
            throw x;
        }
        return context;
    }

    return setupParser(grammar, innerMakeContext);
}

function context(grammar, source){
    return {grammar: grammar, source: source};
}

function pass(/*...*/){return Array.prototype.slice.call(arguments);}

function fail(/*...*/){return Array.prototype.slice.call(arguments);}

function testWithSetup(setup, pass, fail){
    return function(){
        var test = setup();
        var i;
        for(i = 0; i < pass.length; ++i)
            test.expectOK(pass[i]);
    
        if (fail)
            for(i = 0; i < fail.length; ++i){
                var f = fail[i];
                test.expectError(f[0], f[1]);
            }
    };
}

function testWithContext(context, pass, fail){
    return testWithSetup(
        function(){return setupWithContext(context.grammar, context.source);},
        pass,
        fail);
}

function testWithGrammar(grammar, pass, fail){
    return testWithSetup(
        function(){return setupParser(grammar);},
        pass,
        fail);
}

function testWithModule(src, pass, fail){
    return testWithSetup(
        function(){
            var rtl = new RTL();
            var imported = oc.compileModule(new Stream(src), rtl);
            var module = imported.symbol().info();
            return setup(function(s){
                oc.compileModule(new Stream(s),
                                 rtl,
                                 function(){return module;});
            });},
        pass,
        fail);
}

var testSuite = {
"comment": testWithGrammar(
    Grammar.expression,
    pass("(**)123",
         "(*abc*)123",
         "(*abc*)(*def*)123",
         "(*a(*b*)c*)123"),
    fail(["(*123", "comment was not closed"])
    ),
"spaces are required to separate keywords and integers": testWithGrammar(
    Grammar.typeDeclaration,
    pass(),
    fail(["T = ARRAY10OFARRAY5OFINTEGER", "not parsed"],
         ["T = ARRAY10 OF ARRAY 5 OF INTEGER", "not parsed"],
         ["T = ARRAY 10OF ARRAY 5 OF INTEGER", "not parsed"],
         ["T = ARRAY 10 OFARRAY 5 OF INTEGER", "not parsed"],
         ["T = ARRAY 10 OF ARRAY5 OF INTEGER", "undeclared identifier: 'ARRAY5'"],
         ["T = ARRAY 10 OF ARRAY 5OF INTEGER", "not parsed"],
         ["T = ARRAY 10 OF ARRAY 5 OFINTEGER", "not parsed"])
    ),
"expression": testWithContext(
    context(Grammar.expression,
            "TYPE ProcType = PROCEDURE(): INTEGER;"
            + "PROCEDURE p1(): INTEGER; RETURN 1 END p1;"
            + "PROCEDURE p2(): ProcType; RETURN p1 END p2;"
            + "PROCEDURE noResult(); END noResult;"),
    pass("123",
         "1+2",
         "1 + 2",
         "1 + 2 + 3",
         "-1",
         "+1",
         "p1() + p1()",
         "p2()"),
    fail(["", "not parsed"],
         ["12a", "not parsed"],
         ["p2()()", "not parsed"],
         ["noResult()", "procedure returning no result cannot be used in an expression"]
         )
    ),
"string expression": testWithGrammar(
    Grammar.expression,
    pass("\"\"",
         "\"a\"",
         "\"abc\"",
         "0FFX",
         "0AX",
         "22X",
         "0X"),
    fail(["\"", "unexpected end of string"],
         ["FFX", "undeclared identifier: 'FFX'"]
        )
    ),
"parentheses": testWithGrammar(
    Grammar.expression,
    pass("(1)",
         "(1 + 2)",
         "(1 + 2) * 3",
         "3 * (1 + 2)"),
    fail(["(1  + 2", "no matched ')'"])
    ),
"identifier": testWithSetup(
    function(){
        var IdentDeclarationContext = Class.extend({
            init: function(){this.__ident = undefined;},
            setIdent: function(id){this.__ident = id;},
            ident: function() {return this.__ident;},
            getResult: function() {return this.__ident;}
        });
        function makeContext() {return new IdentDeclarationContext();}

        return setupParser(Grammar.ident, makeContext);},
    pass("i", "abc1"),
    fail(["", "not parsed"],
         ["1", "not parsed"]
         )
    ),
"variable declaration": testWithGrammar(
    Grammar.variableDeclaration,
    pass("i: INTEGER",
         "i, j: INTEGER"),
    fail(["i: T", "undeclared identifier: 'T'"])
    ),
"procedure VAR section": testWithGrammar(
    Grammar.declarationSequence,
    pass("VAR",
         "VAR i: INTEGER;",
         "VAR i, j: INTEGER;",
         "VAR i, j: INTEGER; b: BOOLEAN;")
    ),
"const declaration": testWithContext(
    context(Grammar.declarationSequence,
            "CONST ci = 1; VAR v1: INTEGER;"),
    pass("CONST i = 10;",
         "CONST i = 1 + 2;",
         "CONST i = ci + 2;",
         "CONST i = ci * 2;",
         "CONST i = ORD({0..5});",
         "CONST i = ORD({0..5} <= {0..8});",
         "CONST b = TRUE;",
         "CONST b = {0..5} <= {0..8};",
         "CONST c = \"a\";",
         "CONST s = \"abc\";",
         "CONST s0 = \"\";",
         "CONST set = {};",
         "CONST set = {1 + 2};",
         "CONST set = {0..32 - 1};",
         "CONST set = {ci};",
         "CONST i1 = 1; b1 = TRUE;",
         "CONST i1 = 1; i2 = i1 + 1;",
         "CONST i1 = 1; i2 = i1 + 1; i3 = i2 + 2;"),
    fail(["CONST i1 = v1;", "constant expression expected"],
         ["CONST i1 = v1 * 2;", "constant expression expected"],
         ["CONST i1 = v1 - 10;", "constant expression expected"],
         ["CONST i1 = 10 - v1;", "constant expression expected"],
         ["CONST s = {v1};", "constant expression expected"],
         ["CONST s = {1, v1};", "constant expression expected"],
         ["CONST s = {1..v1};", "constant expression expected"],
         ["CONST s = {10 - v1..15};", "constant expression expected"])
    ),
"record declaration": testWithGrammar(
    Grammar.typeDeclaration,
    pass("T = RECORD END",
         "T = RECORD i: INTEGER END",
         "T = RECORD i, j: INTEGER END",
         "T = RECORD i, j: INTEGER; b: BOOLEAN END",
         "T = RECORD p: PROCEDURE(r: T) END",
         "T = POINTER TO RECORD p: PROCEDURE(): T END"
         ),
    fail(["T = RECORD i, j, i: INTEGER END", "duplicated field: 'i'"],
         ["T = RECORD r: T END", "recursive field definition: 'r'"],
         ["T = RECORD a: ARRAY 10 OF T END", "recursive field definition: 'a'"],
         ["T = RECORD a: ARRAY 3 OF ARRAY 5 OF T END", "recursive field definition: 'a'"],
         ["T = RECORD r: RECORD rr: T END END", "recursive field definition: 'r'"],
         ["T = RECORD (T) END", "recursive inheritance: 'T'"],
         ["T = RECORD r: RECORD (T) END END", "recursive field definition: 'r'"]
         )
    ),
"record extension": testWithContext(
    context(Grammar.typeDeclaration,
            "TYPE B = RECORD END;"),
    pass("T = RECORD(B) END"
         ),
    fail(["T = RECORD(INTEGER) END", "RECORD type is expected as a base type, got 'INTEGER'"],
         ["T = RECORD(INTEGER) m: INTEGER END", "RECORD type is expected as a base type, got 'INTEGER'"]
         )
    ),
"array declaration": testWithContext(
    context(Grammar.typeDeclaration,
            "CONST c1 = 5; VAR v1: INTEGER; p: POINTER TO RECORD END;"),
    pass("T = ARRAY 10 OF INTEGER",
         "T = ARRAY 10 OF BOOLEAN",
         "T = ARRAY 1 + 2 OF INTEGER",
         "T = ARRAY c1 OF INTEGER",
         "T = ARRAY ORD({0..5} <= {0..8}) OF INTEGER",
         "T = ARRAY 1, 2 OF ARRAY 3, 4 OF INTEGER"
         ),
    fail(["T = ARRAY 0 OF INTEGER",
          "array size must be greater than 0, got 0"],
         ["T = ARRAY TRUE OF INTEGER",
          "'INTEGER' constant expression expected, got 'BOOLEAN'"],
         ["T = ARRAY v1 OF INTEGER",
          "constant expression expected as ARRAY size"],
         ["T = ARRAY p OF INTEGER",
          "'INTEGER' constant expression expected, got 'POINTER TO anonymous RECORD'"],
         ["T = ARRAY c1 - 10 OF INTEGER",
          "array size must be greater than 0, got -5"],
         ["T = ARRAY ORD({0..5} >= {0..8}) OF INTEGER",
          "array size must be greater than 0, got 0"]
         )
    ),
"multi-dimensional array declaration": testWithGrammar(
    Grammar.typeDeclaration,
    pass("T = ARRAY 10 OF ARRAY 5 OF INTEGER",
         "T = ARRAY 10, 5 OF INTEGER")
    ),
"PROCEDURE type declaration": testWithGrammar(
    Grammar.typeDeclaration,
    pass("T = PROCEDURE",
         "T = PROCEDURE()",
         "T = PROCEDURE(a: INTEGER)",
         "T = PROCEDURE(a: INTEGER; b: BOOLEAN)",
         "T = PROCEDURE(): T")
    ),
"POINTER declaration": testWithGrammar(
    Grammar.typeDeclaration,
    pass("T = POINTER TO RECORD END",
         "T = RECORD p: POINTER TO T END",
         "T = POINTER TO RECORD p: T END"),
    fail(["T = POINTER TO INTEGER",
          "RECORD is expected as a POINTER base type, got 'INTEGER'"],
         ["T = POINTER TO POINTER TO RECORD END",
          "RECORD is expected as a POINTER base type, got 'POINTER TO anonymous RECORD'"],
         ["T = POINTER TO RECORD p: POINTER TO T END",
          "RECORD is expected as a POINTER base type, got 'T'"]
        )
    ),
"POINTER forward declaration": testWithContext(
    context(Grammar.module, ""),
    pass("MODULE m; TYPE T = POINTER TO NotDeclaredYet; NotDeclaredYet = RECORD END; END m.",
         "MODULE m; TYPE T1 = POINTER TO NotDeclaredYet; T2 = POINTER TO NotDeclaredYet; NotDeclaredYet = RECORD END; END m."
         ),
    fail(["MODULE m; TYPE T = POINTER TO NotDeclaredYet; END m.",
          "no declaration found for 'NotDeclaredYet'"],
         ["MODULE m; TYPE T1 = POINTER TO NotDeclaredYet1; T2 = POINTER TO NotDeclaredYet2; END m.",
          "no declaration found for 'NotDeclaredYet1', 'NotDeclaredYet2'"],
         ["MODULE m; TYPE T1 = POINTER TO Forward; Forward = PROCEDURE; END m.",
          "'Forward' must be of RECORD type because it was used before in the declation of POINTER"])
    ),
"POINTER dereference": testWithContext(
    context(Grammar.statement,
            "TYPE PT = POINTER TO RECORD END;"
            + "VAR pt: PT; p: POINTER TO RECORD field: INTEGER END; i: INTEGER; r: RECORD END;"),
    pass("p^.field := 1",
         "p.field := 0"),
    fail(["i^", "POINTER TO type expected, got 'INTEGER'"],
         ["r^", "POINTER TO type expected, got 'anonymous RECORD'"],
         ["p.unknown := 0", "type 'anonymous RECORD' has no 'unknown' field"],
         ["pt.unknown := 0", "type 'PT' has no 'unknown' field"])
    ),
"POINTER assignment": testWithContext(
    context(Grammar.statement,
            "TYPE Base = RECORD END;"
                + "Derived = RECORD (Base) END;"
                + "PDerivedAnonymous = POINTER TO RECORD(Base) END;"
            + "VAR p1, p2: POINTER TO RECORD END;"
                + "pBase: POINTER TO Base; pDerived: POINTER TO Derived;"
                + "pDerivedAnonymous: PDerivedAnonymous;"
                + "pDerivedAnonymous2: POINTER TO RECORD(Base) END;"
                ),
    pass("p1 := NIL",
         "p1 := p2",
         "pBase := pDerived",
         "pBase := pDerivedAnonymous",
         "pBase := pDerivedAnonymous2"
         ),
    fail(["p1 := pBase",
          "type mismatch: 'p1' is 'POINTER TO anonymous RECORD' and cannot be assigned to 'POINTER TO Base' expression"],
          ["pDerived := pBase",
           "type mismatch: 'pDerived' is 'POINTER TO Derived' and cannot be assigned to 'POINTER TO Base' expression"],
          ["NIL := p1", "not parsed"])
    ),
"typeguard": testWithContext(
    context(Grammar.expression,
            "TYPE Base = RECORD END; PBase = POINTER TO Base; Derived = RECORD (Base) END; PDerived = POINTER TO Derived;"
            + "VAR p1, p2: POINTER TO RECORD END; pBase: POINTER TO Base; pDerived: POINTER TO Derived;"
            + "vb: Base; i: INTEGER;"),
    pass("pBase(PDerived)",
         "pBase^(Derived)"),
    fail(["pDerived(PDerived)",
          "invalid type cast: 'Derived' is not an extension of 'Derived'"],
         ["p1(PBase)", 
          "invalid type cast: 'Base' is not an extension of 'anonymous RECORD'"],
         ["p1(INTEGER)", 
          "invalid type cast: POINTER type expected as an argument of POINTER type guard, got 'INTEGER'"],
         ["i(Derived)",
          "invalid type cast: 'Derived' is not an extension of 'INTEGER'"],
         ["vb(Derived)",
          "invalid type cast: a value variable and cannot be used in typeguard"],
         ["vb(PDerived)",
          "invalid type cast: a value variable and cannot be used in typeguard"])
    ),
"typeguard for VAR argument": testWithContext(
    context(Grammar.procedureDeclaration,
            "TYPE Base = RECORD END; Derived = RECORD (Base) i: INTEGER END;"
            + "T = RECORD END; TD = RECORD(T) b: Base END;"),
    pass("PROCEDURE proc(VAR p: Base); BEGIN p(Derived).i := 1; END proc"),
    fail(["PROCEDURE proc(p: Base); BEGIN p(Derived).i := 1; END proc",
          "invalid type cast: a value variable and cannot be used in typeguard"],
         ["PROCEDURE proc(p: TD); BEGIN p.b(Derived).i := 1; END proc",
          "invalid type cast: a value variable and cannot be used in typeguard"],
         ["PROCEDURE proc(VAR p: T); BEGIN p(TD).b(Derived).i := 1; END proc",
          "invalid type cast: a value variable and cannot be used in typeguard"])
    ),
"POINTER relations": testWithContext(
    context(Grammar.expression,
            "TYPE B = RECORD END; D = RECORD(B) END;"
          + "VAR p1, p2: POINTER TO RECORD END; pb: POINTER TO B; pd: POINTER TO D;"),
    pass("p1 = p2",
         "p1 # p2",
         "pb = pd",
         "pd # pb"
         ),
    fail(["p1 < p2", "operator '<' type mismatch: numeric type or CHAR or character array expected, got 'POINTER TO anonymous RECORD'"],
         ["p1 <= p2", "operator '<=' type mismatch: numeric type or CHAR or character array expected, got 'POINTER TO anonymous RECORD'"],
         ["p1 > p2", "operator '>' type mismatch: numeric type or CHAR or character array expected, got 'POINTER TO anonymous RECORD'"],
         ["p1 >= p2", "operator '>=' type mismatch: numeric type or CHAR or character array expected, got 'POINTER TO anonymous RECORD'"],
         ["p1 = pb", "type mismatch: expected 'POINTER TO anonymous RECORD', got 'POINTER TO B'"]
         )
    ),
"IS expression": testWithContext(
    context(Grammar.expression,
            "TYPE Base = RECORD END; Derived = RECORD (Base) END; PDerived = POINTER TO Derived;"
            + "VAR p: POINTER TO RECORD END; pBase: POINTER TO Base; pDerived: POINTER TO Derived; vDerived: Derived; i: INTEGER;"),
    pass("pBase IS Derived"),
    fail(["pBase IS pDerived", "type name expected"],
         ["pBase IS TRUE", "type name expected"],
         ["pBase IS vDerived", "type name expected"],
         ["Derived IS Derived", "POINTER to type expected before 'IS'"],
         ["i IS Derived", "POINTER to type expected before 'IS'"],
         ["p IS Derived", 
          "invalid type test: 'Derived' is not an extension of 'anonymous RECORD'"],
         ["pDerived IS Derived", 
         "invalid type test: 'Derived' is not an extension of 'Derived'"],
         ["pDerived IS Base", 
          "invalid type test: 'Base' is not an extension of 'Derived'"],
         ["pDerived IS INTEGER", "RECORD type expected after 'IS'"])
    ),
"BYTE": testWithContext(
    context(Grammar.statement,
              "VAR b1, b2: BYTE; i: INTEGER; set: SET; a: ARRAY 3 OF BYTE;"
            + "PROCEDURE varIntParam(VAR i: INTEGER); END varIntParam;"
            + "PROCEDURE varByteParam(VAR b: BYTE); END varByteParam;"
            ),
    pass("b1 := b2",
         "i := b1",
         "b2 := i",
         "a[b1] := i",
         "ASSERT(i = b1)",
         "ASSERT(b1 = i)",
         "ASSERT(i < b1)",
         "ASSERT(b1 > i)",
         "ASSERT(b1 IN set)",
         "i := b1 DIV i",
         "i := i DIV b1",
         "b1 := b1 MOD i",
         "b1 := i MOD b1",
         "b1 := b1 + i",
         "b1 := i - b1",
         "i := b1 * i",
         "i := -b1",
         "i := +b1"
        ),
    fail(["i := b1 / i", "operator DIV expected for integer division"],
         ["varIntParam(b1)", "type mismatch for argument 1: cannot pass 'BYTE' as VAR parameter of type 'INTEGER'"],
         ["varByteParam(i)", "type mismatch for argument 1: cannot pass 'INTEGER' as VAR parameter of type 'BYTE'"]
        )
    ),
"NEW": testWithContext(
    context(Grammar.statement,
            "TYPE P = POINTER TO RECORD END;"
            + "VAR p: P; i: INTEGER;"
            + "PROCEDURE proc(): P; RETURN NIL END proc;"
            ),
    pass("NEW(p)"),
    fail(["NEW.NEW(p)", "cannot designate 'standard procedure NEW'"],
         ["NEW(i)", "POINTER variable expected, got 'INTEGER'"],
         ["NEW()", "1 argument(s) expected, got 0"],
         ["NEW(p, p)", "1 argument(s) expected, got 2"],
         ["NEW(proc())", "expression cannot be used as VAR parameter"])
    ),
"NEW for read only array element fails": testWithContext(
    context(Grammar.procedureDeclaration,
            "TYPE P = POINTER TO RECORD END;"),
    pass(),
    fail(["PROCEDURE readOnlyPointers(a: ARRAY OF P); BEGIN NEW(a[0]) END readOnlyPointers",
          "read-only variable cannot be used as VAR parameter"])
    ),
"LEN": testWithGrammar(
    Grammar.procedureDeclaration,
    pass("PROCEDURE p(a: ARRAY OF INTEGER): INTEGER; RETURN LEN(a) END p",
         "PROCEDURE p(VAR a: ARRAY OF BOOLEAN): INTEGER; RETURN LEN(a) END p",
         "PROCEDURE p(): INTEGER; RETURN LEN(\"abc\") END p"),
    fail(["PROCEDURE p(a: ARRAY OF INTEGER): INTEGER; RETURN LEN(a[0]) END p",
          "type mismatch for argument 1: 'INTEGER' cannot be converted to 'ARRAY OF any type'"])
    ),
"ABS": testWithContext(
    context(Grammar.statement,
            "VAR i: INTEGER; r: REAL; c: CHAR;"),
    pass("i := ABS(i)",
         "r := ABS(r)"),
    fail(["i := ABS(r)", "type mismatch: 'i' is 'INTEGER' and cannot be assigned to 'REAL' expression"],
         ["i := ABS(c)", "type mismatch: expected numeric type, got 'CHAR'"],
         ["i := ABS(i, i)", "1 argument(s) expected, got 2"]
         )
    ),
"FLOOR": testWithContext(
    context(Grammar.statement, "VAR i: INTEGER; r: REAL;"),
    pass("i := FLOOR(r)"),
    fail(["i := FLOOR(i)", "type mismatch for argument 1: 'INTEGER' cannot be converted to 'REAL'"],
         ["i := FLOOR(r, r)", "1 argument(s) expected, got 2"]
         )
    ),
"FLT": testWithContext(
    context(Grammar.statement, "VAR i: INTEGER; r: REAL;"),
    pass("r := FLT(i)"),
    fail(["r := FLT(r)", "type mismatch for argument 1: 'REAL' cannot be converted to 'INTEGER'"],
         ["i := FLT(i, i)", "1 argument(s) expected, got 2"]
         )
    ),
"LSL": testWithContext(
    context(Grammar.statement,
            "VAR i: INTEGER; r: REAL; c: CHAR;"),
    pass("i := LSL(i, i)"),
    fail(["i := LSL(i, r)", "type mismatch for argument 2: 'REAL' cannot be converted to 'INTEGER'"],
         ["i := LSL(r, i)", "type mismatch for argument 1: 'REAL' cannot be converted to 'INTEGER'"],
         ["r := LSL(i, i)", "type mismatch: 'r' is 'REAL' and cannot be assigned to 'INTEGER' expression"],
         ["i := LSL(i)", "2 argument(s) expected, got 1"]
         )
    ),
"ASR": testWithContext(
    context(Grammar.statement,
            "VAR i: INTEGER; r: REAL; c: CHAR;"),
    pass("i := ASR(i, i)"),
    fail(["i := ASR(i, r)", "type mismatch for argument 2: 'REAL' cannot be converted to 'INTEGER'"],
         ["i := ASR(r, i)", "type mismatch for argument 1: 'REAL' cannot be converted to 'INTEGER'"],
         ["r := ASR(i, i)", "type mismatch: 'r' is 'REAL' and cannot be assigned to 'INTEGER' expression"],
         ["i := ASR(i)", "2 argument(s) expected, got 1"]
         )
    ),
"ROR": testWithContext(
    context(Grammar.statement,
            "VAR i: INTEGER; r: REAL; c: CHAR;"),
    pass("i := ROR(i, i)"),
    fail(["i := ROR(i, r)", "type mismatch for argument 2: 'REAL' cannot be converted to 'INTEGER'"],
         ["i := ROR(r, i)", "type mismatch for argument 1: 'REAL' cannot be converted to 'INTEGER'"],
         ["r := ROR(i, i)", "type mismatch: 'r' is 'REAL' and cannot be assigned to 'INTEGER' expression"],
         ["i := ROR(i)", "2 argument(s) expected, got 1"]
         )
    ),
"ODD": testWithContext(
    context(Grammar.statement, "VAR b: BOOLEAN;"),
    pass("b := ODD(1)",
         "b := ODD(123)"
         ),
    fail(["b := ODD(1.2)", "type mismatch for argument 1: 'REAL' cannot be converted to 'INTEGER'"],
         ["b := ODD(TRUE)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"]
         )
),
"ORD": testWithContext(
    context(Grammar.statement, "VAR ch: CHAR; i: INTEGER; b: BOOLEAN;"),
    pass("i := ORD(ch)",
         "i := ORD(TRUE)",
         "i := ORD({1})",
         "i := ORD(\"a\")",
         "b := ORD(22X) = 022H"),
    fail(["i := ORD(1.2)", "type mismatch for argument 1: 'REAL' cannot be converted to 'CHAR or BOOLEAN or SET'"],
         ["i := ORD(\"abc\")", "type mismatch for argument 1: 'multi-character string' cannot be converted to 'CHAR or BOOLEAN or SET'"]
         )
),
"CHR": testWithContext(
    context(Grammar.statement, "VAR i: INTEGER; ch: CHAR;"),
    pass("ch := CHR(i)"),
    fail(["ch := CHR(ch)", "type mismatch for argument 1: 'CHAR' cannot be converted to 'INTEGER'"])
),
"INC": testWithContext(
    context(Grammar.statement, "VAR i: INTEGER;"),
    pass("INC(i)",
         "INC(i, 3)",
         "INC(i, i)"),
    fail(["INC(i + i)", "expression cannot be used as VAR parameter"],
         ["INC()", "at least 1 argument expected, got 0"],
         ["INC(i, 1, 2)", "at most 2 arguments expected, got 3"]
         )
),
"DEC": testWithContext(
    context(Grammar.statement, "VAR i: INTEGER;"),
    pass("DEC(i)",
         "DEC(i, 3)",
         "DEC(i, i)"),
    fail(["DEC(i + i)", "expression cannot be used as VAR parameter"],
         ["DEC()", "at least 1 argument expected, got 0"],
         ["DEC(i, 1, 2)", "at most 2 arguments expected, got 3"]
         )
),
"PACK": testWithContext(
    context(Grammar.statement, "VAR r: REAL; i: INTEGER;"),
    pass("PACK(r, i)",
         "PACK(r, 3)"),
    fail(["PACK(r, r)", "type mismatch for argument 2: 'REAL' cannot be converted to 'INTEGER'"])
),
"UNPACK": testWithContext(
    context(Grammar.statement, "VAR r: REAL; i: INTEGER;"),
    pass("UNPACK(r, i)"),
    fail(["UNPACK(r, r)", "type mismatch for argument 2: 'REAL' cannot be converted to 'INTEGER'"],
         ["UNPACK(r, 3)", "expression cannot be used as VAR parameter"],
         ["UNPACK(123.456, i)", "expression cannot be used as VAR parameter"]
         )
),
"standard procedure cannot be referenced" : testWithContext(
    context(Grammar.expression, "VAR chr: PROCEDURE(c: CHAR): INTEGER;"),
    pass(),
    fail(["CHR", "standard procedure CHR cannot be referenced"])
    ),
"assignment statement": testWithContext(
    context(Grammar.statement,
            "CONST c = 15;"
            + "VAR ch: CHAR; i, n: INTEGER; b: BOOLEAN;"
                + "proc1: PROCEDURE; proc2: PROCEDURE(): INTEGER;"
                + "a: ARRAY 5 OF INTEGER;"
            + "PROCEDURE p(): INTEGER; RETURN 1 END p;"
            + "PROCEDURE noResult(); END noResult;"),
    pass("i := 0",
         "i := n",
         "i := c",
         "b := TRUE",
         "ch := \"A\"",
         "i := p()",
         "proc1 := proc1",
         "proc2 := NIL",
         "a[1] := 2"),
    fail(["i = 0", "did you mean ':=' (statement expected, got expression)?"],
         ["i := b", "type mismatch: 'i' is 'INTEGER' and cannot be assigned to 'BOOLEAN' expression"],
         ["c := i", "cannot assign to constant"],
         ["ch := \"AB\"",
          "type mismatch: 'ch' is 'CHAR' and cannot be assigned to 'multi-character string' expression"],
         ["ch := CHAR",
          "type mismatch: 'ch' is 'CHAR' and cannot be assigned to 'type CHAR' expression"],
         ["i := .1", "expression expected"],
         ["proc1 := proc2",
          "type mismatch: 'proc1' is 'PROCEDURE' and cannot be assigned to 'PROCEDURE(): INTEGER' expression"],
         ["i := noResult()", "procedure returning no result cannot be used in an expression"])
    ),
"array expression": testWithGrammar(
    Grammar.procedureBody,
    pass("VAR a: ARRAY 10 OF INTEGER; BEGIN a[0] := 1 END",
         "VAR a: ARRAY 10 OF INTEGER; BEGIN a[0] := 1; a[1] := a[0] END",
         "VAR a1, a2: ARRAY 3 OF CHAR; BEGIN ASSERT(a1 = a2); END",
         "VAR a1: ARRAY 2 OF CHAR; a2: ARRAY 3 OF CHAR; BEGIN ASSERT(a1 = a2); END",
         "CONST cs = \"a\"; VAR a: ARRAY 3 OF CHAR; BEGIN ASSERT(a = cs); ASSERT(cs # a); ASSERT(a < cs); ASSERT(cs > a); END"
         ),
    fail(["VAR a: ARRAY 10 OF INTEGER; BEGIN a[0] := TRUE END",
          "type mismatch: 'a[0]' is 'INTEGER' and cannot be assigned to 'BOOLEAN' expression"],
         ["VAR a: ARRAY 10 OF INTEGER; BEGIN a[TRUE] := 1 END",
          "'INTEGER' or 'BYTE' expression expected, got 'BOOLEAN'"],
         ["VAR a: ARRAY 10 OF INTEGER; p: POINTER TO RECORD END; BEGIN a[p] := 1 END",
          "'INTEGER' or 'BYTE' expression expected, got 'POINTER TO anonymous RECORD'"],
         ["VAR i: INTEGER; BEGIN i[0] := 1 END",
          "ARRAY expected, got 'INTEGER'"],
         ["VAR p: POINTER TO RECORD END; BEGIN p[0] := 1 END",
          "ARRAY expected, got 'POINTER TO anonymous RECORD'"],
         ["VAR a: ARRAY 10 OF INTEGER; BEGIN a[0][0] := 1 END",
          "ARRAY expected, got 'INTEGER'"],
         ["VAR a: ARRAY 10 OF BOOLEAN; BEGIN a[0,0] := TRUE END",
          "ARRAY expected, got 'BOOLEAN'"],
         ["VAR a: ARRAY 10, 20 OF BOOLEAN; BEGIN a[0] := TRUE END",
          "type mismatch: 'a[0]' is 'ARRAY 20 OF BOOLEAN' and cannot be assigned to 'BOOLEAN' expression"],
         ["VAR a: ARRAY 10 OF INTEGER; BEGIN a[10] := 0 END",
          "index out of bounds: maximum possible index is 9, got 10"],
         ["CONST c1 = 5; VAR a: ARRAY 10 OF INTEGER; BEGIN a[10 + c1] := 0 END",
          "index out of bounds: maximum possible index is 9, got 15"],
         ["VAR a1, a2: ARRAY 3 OF INTEGER; BEGIN ASSERT(a1 = a2); END",
          "operator '=' type mismatch: numeric type or SET or BOOLEAN or CHAR or character array or POINTER or PROCEDURE expected, got 'ARRAY 3 OF INTEGER'"])
    ),
"multi-dimensional array expression": testWithGrammar(
    Grammar.procedureBody,
    pass("VAR a: ARRAY 10 OF ARRAY 5 OF INTEGER; BEGIN a[0][0] := 1 END",
         "VAR a: ARRAY 10, 5 OF BOOLEAN; BEGIN a[0][0] := TRUE END",
         "VAR a: ARRAY 10, 5 OF BOOLEAN; BEGIN a[0, 0] := TRUE END")
    ),
"INTEGER number": testWithGrammar(
    Grammar.expression,
    pass("0",
         "123",
         "1H",
         "1FH",
         "0FFH",
         "0H"),
    fail(["FFH", "undeclared identifier: 'FFH'"],
         ["FF", "undeclared identifier: 'FF'"],
         ["1HH", "not parsed"],
         ["1H0", "not parsed"],
         ["1 23", "not parsed"],
         ["1F FH", "not parsed"])
    ),
"SET statement": testWithContext(
    context(Grammar.statement, "VAR s: SET;"),
    pass("s := {}",
         "s := {0}",
         "s := {0, 1}",
         "s := {1 + 2, 5..10}")
    //fail("s := {32}", "0..31")
    ),
"REAL number": testWithGrammar(
    Grammar.expression,
    pass("1.2345",
         "1.",
         "1.2345E6",
         "1.2345E+6",
         "1.2345E-12"),
    fail(["1. 2345E-12", "not parsed"],
         ["1.23 45E-12", "not parsed"],
         ["1.2345 E-12", "not parsed"],
         ["1.2345E-1 2", "not parsed"])
    ),
"LONGREAL number": testWithGrammar(
    Grammar.expression,
    pass("1.2345D6",
         "1.2345D+6",
         "1.2345D-6")
    ),
"IF statement": testWithContext(
    context(Grammar.statement,
            "VAR b1: BOOLEAN; i1: INTEGER; p: POINTER TO RECORD END;"),
    pass("IF b1 THEN i1 := 0 END",
         "IF FALSE THEN i1 := 0 ELSE i1 := 1 END",
         "IF TRUE THEN i1 := 0 ELSIF FALSE THEN i1 := 1 ELSE i1 := 2 END"),
    fail(["IF i1 THEN i1 := 0 END", "'BOOLEAN' expression expected, got 'INTEGER'"],
         ["IF b1 THEN i1 := 0 ELSIF i1 THEN i1 := 2 END",
          "'BOOLEAN' expression expected, got 'INTEGER'"],
         ["IF p THEN i1 := 0 END",
          "'BOOLEAN' expression expected, got 'POINTER TO anonymous RECORD'"],
         ["IF b1 (*THEN*) i1 := 0 END", "THEN expected"],
         ["IF b1 THEN i1 := 0 ELSIF ~b1 (*THEN*) i1 := 0 END", "THEN expected"])
    ),
"CASE statement": testWithContext(
    context(Grammar.statement,
              "CONST ci = 15; cc = \"A\";"
            + "VAR c1: CHAR; b1: BOOLEAN; i1, i2: INTEGER; byte: BYTE; p: POINTER TO RECORD END;"),
    pass("CASE i1 OF END",
         "CASE i1 OF | END",
         "CASE i1 OF | 0: b1 := TRUE END",
         "CASE i1 OF 0: b1 := TRUE END",
         "CASE c1 OF \"A\": b1 := TRUE END",
         "CASE byte OF 3: b1 := TRUE END",
         "CASE i1 OF 0: b1 := TRUE | 1: b1 := FALSE END",
         "CASE i1 OF 0, 1: b1 := TRUE END",
         "CASE c1 OF \"A\", \"B\": b1 := TRUE END",
         "CASE i1 OF 0..2: b1 := TRUE END",
         "CASE i1 OF ci..2: b1 := TRUE END",
         "CASE c1 OF cc..\"Z\": b1 := TRUE END",
         "CASE i1 OF 1, 2, 3: b1 := TRUE | 4..10: b1 := FALSE | 11: c1 := \"A\" END",
         "CASE i1 OF 1, 2, 5..9: b1 := TRUE END"),
    fail(["CASE i1 OF undefined: b1 := TRUE END",
          "undeclared identifier: 'undefined'"],
         ["CASE i1 OF i2: b1 := TRUE END",
          "'i2' is not a constant"],
         ["CASE b1 OF END", "'INTEGER' or 'BYTE' or 'CHAR' expected as CASE expression"],
         ["CASE i1 OF \"A\": b1 := TRUE END",
          "label must be 'INTEGER' (the same as case expression), got 'CHAR'"],
         ["CASE i1 OF p: b1 := TRUE END",
          "'p' is not a constant"],
         ["CASE c1 OF \"A\", 1: b1 := TRUE END",
          "label must be 'CHAR' (the same as case expression), got 'INTEGER'"],
         ["CASE c1 OF \"A\"..1: b1 := TRUE END",
          "label must be 'CHAR' (the same as case expression), got 'INTEGER'"])
    ),
"WHILE statement": testWithContext(
    context(Grammar.statement,
            "VAR b1: BOOLEAN; i1: INTEGER;"),
    pass("WHILE TRUE DO i1 := 0 END",
         "WHILE b1 DO i1 := 0 ELSIF FALSE DO i1 := 1 END"),
    fail(["WHILE i1 DO i1 := 0 END", "'BOOLEAN' expression expected, got 'INTEGER'"],
         ["WHILE b1 DO i1 := 0 ELSIF i1 DO i1 := 1 END", "'BOOLEAN' expression expected, got 'INTEGER'"])
    ),
"REPEAT statement": testWithContext(
    context(Grammar.statement,
            "VAR b1: BOOLEAN; i1: INTEGER;"),
    pass("REPEAT i1 := 0 UNTIL TRUE",
         "REPEAT i1 := 0 UNTIL b1"),
    fail(["REPEAT i1 := 0 UNTIL i1", "'BOOLEAN' expression expected, got 'INTEGER'"])
    ),
"FOR statement": testWithContext(
    context(Grammar.statement,
              "CONST c = 15;"
            + "VAR b: BOOLEAN; i, n: INTEGER; ch: CHAR; p: POINTER TO RECORD END;"),
    pass("FOR i := 0 TO 10 DO n := 1 END",
         "FOR i := 0 TO 10 BY 5 DO b := TRUE END",
         "FOR i := 0 TO n DO b := TRUE END",
         "FOR i := 0 TO n BY c DO n := 1; b := FALSE END"),
    fail(["FOR undefined := 0 TO 10 DO n := 1 END",
          "undeclared identifier: 'undefined'"],
         ["FOR b := TRUE TO 10 DO n := 1 END",
          "'b' is a 'BOOLEAN' variable, 'FOR' control variable must be 'INTEGER'"],
         ["FOR ch := 'a' TO 10 DO n := 1 END",
          "'ch' is a 'CHAR' variable, 'FOR' control variable must be 'INTEGER'"],
         ["FOR c := 0 TO 10 DO END", "'c' is not a variable"],
         ["FOR i := TRUE TO 10 DO n := 1 END",
          "'INTEGER' expression expected to assign 'i', got 'BOOLEAN'"],
         ["FOR i := p TO 10 DO n := 1 END",
          "'INTEGER' expression expected to assign 'i', got 'POINTER TO anonymous RECORD'"],
         ["FOR i := 0 TO p DO n := 1 END",
          "'INTEGER' expression expected as 'TO' parameter, got 'POINTER TO anonymous RECORD'"],
         ["FOR i := 0 TO TRUE DO END",
          "'INTEGER' expression expected as 'TO' parameter, got 'BOOLEAN'"],
         ["FOR i := 0 TO 10 BY n DO END",
          "constant expression expected as 'BY' parameter"],
         ["FOR i := 0 TO 10 BY p DO END",
          "'INTEGER' expression expected as 'BY' parameter, got 'POINTER TO anonymous RECORD'"],
         ["FOR i := 0 TO 10 BY TRUE DO END",
          "'INTEGER' expression expected as 'BY' parameter, got 'BOOLEAN'"],
         ["FOR i := 0 TO 10 DO - END",
          "END expected (FOR)"])
    ),
"logical operators": testWithContext(
    context(Grammar.statement, "VAR b1, b2: BOOLEAN; i1: INTEGER; p: POINTER TO RECORD END;"),
    pass("b1 := b1 OR b2",
         "b1 := b1 & b2",
         "b1 := ~b2"),
    fail(["b1 := i1 OR b2", "BOOLEAN expected as operand of 'OR', got 'INTEGER'"],
         ["b1 := b1 OR i1", "type mismatch: expected 'BOOLEAN', got 'INTEGER'"],
         ["b1 := p OR b1", "BOOLEAN expected as operand of 'OR', got 'POINTER TO anonymous RECORD'"],
         ["b1 := i1 & b2", "BOOLEAN expected as operand of '&', got 'INTEGER'"],
         ["b1 := b1 & i1", "type mismatch: expected 'BOOLEAN', got 'INTEGER'"],
         ["b1 := ~i1", "type mismatch: expected 'BOOLEAN', got 'INTEGER'"])
    ),
"arithmetic operators": testWithContext(
    context(Grammar.statement,
            "VAR b1: BOOLEAN; i1, i2: INTEGER; r1, r2: REAL; c1: CHAR; s1: SET;"
            + "p1: PROCEDURE; ptr1: POINTER TO RECORD END;"),
    pass("i1 := i1 + i2",
         "i1 := i1 - i2",
         "i1 := i1 * i2",
         "i1 := i1 DIV i2",
         "i1 := i1 MOD i2",
         "r1 := r1 + r2",
         "r1 := r1 - r2",
         "r1 := r1 * r2",
         "r1 := r1 / r2"),
    fail(["i1 := i1 / i2", "operator DIV expected for integer division"],
         ["r1 := r1 DIV r1", "operator 'DIV' type mismatch: 'INTEGER' or 'BYTE' expected, got 'REAL'"],
         ["b1 := b1 + b1", "operator '+' type mismatch: numeric type expected, got 'BOOLEAN'"],
         ["c1 := c1 - c1", "operator '-' type mismatch: numeric type expected, got 'CHAR'"],
         ["p1 := p1 * p1", "operator '*' type mismatch: numeric type expected, got 'PROCEDURE'"],
         ["ptr1 := ptr1 / ptr1", "operator '/' type mismatch: numeric type expected, got 'POINTER TO anonymous RECORD'"],
         ["s1 := +s1", "operator '+' type mismatch: numeric type expected, got 'SET'"],
         ["b1 := -b1", "operator '-' type mismatch: numeric type expected, got 'BOOLEAN'"],
         ["s1 := +b1", "operator '+' type mismatch: numeric type expected, got 'BOOLEAN'"])
    ),
"relations are BOOLEAN": testWithContext(
    context(Grammar.statement,
            "TYPE Base = RECORD END; Derived = RECORD (Base) END;"
            + "VAR pBase: POINTER TO Base; proc1, proc2: PROCEDURE;"
                + "set1, set2: SET;"
                + "b: BOOLEAN; i1, i2: INTEGER; r1, r2: REAL; c1, c2: CHAR; ca1, ca2: ARRAY 10 OF CHAR;"),
    pass("b := pBase IS Derived",
         "b := pBase = pBase",
         "b := proc1 # proc2",
         "b := set1 <= set2",
         "b := i1 IN set2",
         "b := i1 < i2",
         "IF i1 > i2 THEN END",
         "b := c1 > c2",
         "b := ca1 <= ca2",
         "b := r1 >= r2")
    ),
"SET relations": testWithContext(
    context(Grammar.expression,
            "VAR set1, set2: SET; b: BOOLEAN; i: INTEGER;"),
    pass("set1 <= set2",
         "set1 >= set2",
         "set1 = set2",
         "set1 # set2",
         "i IN set1"),
    fail(["set1 <= i", "type mismatch: expected 'SET', got 'INTEGER'"],
         ["b IN set1", "'INTEGER' or 'BYTE' expected as an element of SET, got 'BOOLEAN'"],
         ["i IN b", "type mismatch: expected 'SET', got 'BOOLEAN'"])
    ),
"SET operators": testWithContext(
    context(Grammar.expression,
            "VAR set1, set2: SET; b: BOOLEAN; i: INTEGER;"),
    pass("set1 + set2",
         "set1 - set2",
         "set1 * set2",
         "set1 / set2",
         "-set1"),
    fail(["set1 + i", "type mismatch: expected 'SET', got 'INTEGER'"],
         ["set1 - b", "type mismatch: expected 'SET', got 'BOOLEAN'"],
         ["set1 * b", "type mismatch: expected 'SET', got 'BOOLEAN'"],
         ["set1 / b", "type mismatch: expected 'SET', got 'BOOLEAN'"])
    ),
"SET functions": testWithContext(
    context(Grammar.statement,
            "VAR set1, set2: SET; b: BOOLEAN; i: INTEGER;"),
    pass("INCL(set1, 0)",
         "EXCL(set1, 3)",
         "INCL(set1, i)",
         "EXCL(set1, i)"),
    fail(["INCL({}, i)", "expression cannot be used as VAR parameter"],
         ["INCL(set1, 32)", "value (0..31) expected as a second argument of INCL, got 32"],
         ["EXCL(set1, -1)", "value (0..31) expected as a second argument of EXCL, got -1"]
        )
    ),
"procedure body": testWithGrammar(
    Grammar.procedureBody,
    pass("END",
         "VAR END",
         "VAR i: INTEGER; END",
         "VAR a: ARRAY 10 OF INTEGER; END",
         "VAR i: INTEGER; BEGIN i := 1 END",
         "VAR b: BOOLEAN; BEGIN b := TRUE END",
         "VAR i, j: INTEGER; BEGIN i := 1; j := 2; i := 1 + i + j - 2 END",
         "TYPE T = RECORD field: INTEGER END; VAR v: T; BEGIN v.field := 1 END",
         "TYPE T1 = RECORD field: INTEGER END; T2 = RECORD field: T1 END; VAR v1: T1; v2: T2; BEGIN v1.field := v2.field.field END",
         "TYPE T1 = RECORD field1: INTEGER END; T2 = RECORD (T1) field2: INTEGER END; VAR v: T2; BEGIN v.field2 := v.field1 END"),
    fail(["VAR i: INTEGER;", "END expected (PROCEDURE)"],
         ["VAR i: INTEGER; i := 1; END", "END expected (PROCEDURE)"],
         ["VAR i: INTEGER; BEGIN j := 1 END", "undeclared identifier: 'j'"],
         ["VAR i: INTEGER; BEGIN i.field := 1 END",
          "cannot designate 'INTEGER'"],
         ["VAR i: INTEGER; BEGIN i := j END", "undeclared identifier: 'j'"],
         ["TYPE T = RECORD field: INTEGER END; VAR v: T; BEGIN v := 1 END",
          "type mismatch: 'v' is 'T' and cannot be assigned to 'INTEGER' expression"],
         ["TYPE T = RECORD field: INTEGER END; VAR v: T; BEGIN v.unknown := 1 END",
          "type 'T' has no 'unknown' field"],
         ["TYPE T1 = RECORD field1: INTEGER END; T2 = RECORD (T1) field1: INTEGER END; END",
          "base record already has field: 'field1'"])
    ),
"procedure heading": testWithSetup(
    function(){
        function innerMakeContext(cx){return new Context.ProcDecl(makeContext());}
        return setupParser(Grammar.procedureHeading, innerMakeContext);
    },
    pass("PROCEDURE p",
         "PROCEDURE p(a1: INTEGER)",
         "PROCEDURE p(a1, a2: INTEGER; b1: BOOLEAN)"),
    fail(["PROCEDURE p(a1: INTEGER; a1: BOOLEAN)", "'a1' already declared"],
         ["PROCEDURE p(p: INTEGER)", "argument 'p' has the same name as procedure"])
    ),
"procedure": testWithContext(
    context(Grammar.procedureDeclaration,
            "TYPE ProcType = PROCEDURE(): ProcType;"),
    pass("PROCEDURE p; END p",
         "PROCEDURE p; VAR i: INTEGER; BEGIN i := i + 1 END p",
         "PROCEDURE p(a: INTEGER); BEGIN a := a + 1 END p",
         "PROCEDURE p; BEGIN p() END p",
         "PROCEDURE p(a: INTEGER); BEGIN p(a) END p",
         "PROCEDURE p(a: INTEGER; b: BOOLEAN); BEGIN p(a, b) END p",
         "PROCEDURE p(): ProcType; RETURN p END p"),
    fail(["PROCEDURE p; END", "not parsed"],
         ["PROCEDURE p1; END p2",
          "mismatched procedure names: 'p1' at the begining and 'p2' at the end"],
         ["PROCEDURE p(a: INTEGER); VAR a: INTEGER END p", "'a' already declared"],
         ["PROCEDURE p(a: INTEGER); BEGIN p() END p", "1 argument(s) expected, got 0"],
         ["PROCEDURE p(a: INTEGER); BEGIN p(1, 2) END p", "1 argument(s) expected, got 2"],
         ["PROCEDURE p(a: INTEGER; b: BOOLEAN); BEGIN p(b, a) END p",
          "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"],
         ["PROCEDURE p; BEGIN p1() END p", "undeclared identifier: 'p1'"])
    ),
"procedure RETURN": testWithContext(
    context(
        Grammar.procedureDeclaration,
            "TYPE A = ARRAY 3 OF INTEGER; R = RECORD END; PR = POINTER TO R;"
          + "VAR i: INTEGER; PROCEDURE int(): INTEGER; RETURN 1 END int;"),
    pass("PROCEDURE p(): BOOLEAN; RETURN TRUE END p",
         "PROCEDURE p(): BOOLEAN; RETURN int() = 1 END p",
         "PROCEDURE p; BEGIN END p" ,
         "PROCEDURE p(): INTEGER; BEGIN RETURN 0 END p"),
    fail(["PROCEDURE p; RETURN TRUE END p", "unexpected RETURN in PROCEDURE declared with no result type"],
         ["PROCEDURE p(): BOOLEAN; END p", "RETURN expected at the end of PROCEDURE declared with 'BOOLEAN' result type"],
         ["PROCEDURE p(): undeclared; END p", "undeclared identifier: 'undeclared'"],
         ["PROCEDURE p(): i; END p", "type name expected"],
         ["PROCEDURE p(): INTEGER; RETURN TRUE END p", "RETURN 'INTEGER' expected, got 'BOOLEAN'"],
         ["PROCEDURE p(a: A): A; RETURN a END p", "the result type of a procedure cannot be an ARRAY"],
         ["PROCEDURE p(): A; VAR a: A; RETURN a END p", "the result type of a procedure cannot be an ARRAY"],
         ["PROCEDURE p(r: R): R; RETURN r END p", "the result type of a procedure cannot be a RECORD"],
         ["PROCEDURE p(): R; VAR r: R; RETURN r END p", "the result type of a procedure cannot be a RECORD"],
         ["PROCEDURE p(pr: PR): R; RETURN pr END p", "the result type of a procedure cannot be a RECORD"]
         )
),
"PROCEDURE relations": testWithContext(
    context(Grammar.expression,
            "VAR p1: PROCEDURE; p2: PROCEDURE;"),
    pass("p1 = p2",
         "p1 # p2",
         "p1 = NIL",
         "NIL # p1"
         )
    ),
"pass VAR argument as VAR parameter": testWithContext(
    context(Grammar.procedureDeclaration,
            "PROCEDURE p1(VAR i: INTEGER); END p1;"
            + "PROCEDURE p2(VAR b: BOOLEAN); END p2;"),
    pass("PROCEDURE p(VAR i1: INTEGER); BEGIN p1(i1) END p"),
    fail(["PROCEDURE p(VAR b: BOOLEAN); BEGIN p2(~b) END p", "expression cannot be used as VAR parameter"])
    ),
"VAR parameter": testWithContext(
    context(Grammar.statement,
            "CONST c = 123;"
            + "VAR i1: INTEGER; b1: BOOLEAN; a1: ARRAY 5 OF INTEGER;"
                + "r1: RECORD f1: INTEGER END;"
            + "PROCEDURE p1(VAR i: INTEGER); END p1;"
            + "PROCEDURE p2(VAR b: BOOLEAN); END p2;"
            ),
    pass("p1(i1)",
         "p1(a1[0])",
         "p1(r1.f1)"),
    fail(["p1(c)", "constant cannot be used as VAR parameter"],
         ["p1(123)", "expression cannot be used as VAR parameter"],
         ["p2(TRUE)", "expression cannot be used as VAR parameter"],
         ["p1(i1 + i1)", "expression cannot be used as VAR parameter"],
         ["p1(i1 * i1)", "expression cannot be used as VAR parameter"],
         ["p1(+i1)", "expression cannot be used as VAR parameter"],
         ["p1(-i1)", "expression cannot be used as VAR parameter"],
         ["p2(~b1)", "expression cannot be used as VAR parameter"])
    ),
"ARRAY parameter": testWithContext(
    context(Grammar.procedureDeclaration,
            "TYPE T = RECORD i: INTEGER; p: POINTER TO T END;"
            + "PROCEDURE p1(i: INTEGER); END p1;"
            + "PROCEDURE varInteger(VAR i: INTEGER); END varInteger;"
            + "PROCEDURE p2(a: ARRAY OF INTEGER); END p2;"
            + "PROCEDURE p3(VAR a: ARRAY OF INTEGER); END p3;"
            ),
    pass("PROCEDURE p(a: ARRAY OF INTEGER); END p",
         "PROCEDURE p(a: ARRAY OF ARRAY OF INTEGER); END p",
         "PROCEDURE p(a: ARRAY OF ARRAY OF INTEGER); BEGIN p1(a[0][0]) END p",
         "PROCEDURE p(a: ARRAY OF INTEGER); BEGIN p2(a) END p",
         "PROCEDURE p(a: ARRAY OF T); BEGIN varInteger(a[0].p.i) END p"),
    fail(["PROCEDURE p(a: ARRAY OF INTEGER); BEGIN a[0] := 0 END p",
          "cannot assign to read-only variable"],
         ["PROCEDURE p(a: ARRAY OF INTEGER); BEGIN p3(a) END p",
          "read-only variable cannot be used as VAR parameter"],
         ["PROCEDURE p(a: ARRAY OF T); BEGIN a[0].i := 0 END p",
          "cannot assign to read-only variable"],
         ["PROCEDURE p(a: ARRAY OF T); BEGIN varInteger(a[0].i) END p",
          "read-only variable cannot be used as VAR parameter"])
    ),
"procedure call": testWithContext(
    context(Grammar.statement,
            "TYPE ProcType = PROCEDURE;" +
            "VAR notProcedure: INTEGER; ptr: POINTER TO RECORD END;" +
            "PROCEDURE p; END p;" +
            "PROCEDURE p1(i: INTEGER); END p1;" +
            "PROCEDURE p2(i: INTEGER; b: BOOLEAN); END p2;" +
            "PROCEDURE p3(): ProcType; RETURN p END p3;"),
    pass("p",
         "p()",
         "p1(1)",
         "p1(1 + 2)",
         "p2(1, TRUE)"),
    fail(["notProcedure", "PROCEDURE expected, got 'INTEGER'"],
         ["ptr()", "PROCEDURE expected, got 'POINTER TO anonymous RECORD'"],
         ["p2(TRUE, 1)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'"],
         ["p2(1, 1)", "type mismatch for argument 2: 'INTEGER' cannot be converted to 'BOOLEAN'"],
         ["p()()", "not parsed"],
         ["p3", "procedure returning a result cannot be used as a statement"],
         ["p3()", "procedure returning a result cannot be used as a statement"]
         )
),
"local procedure": testWithContext(
    context(Grammar.procedureDeclaration,
            "TYPE ProcType = PROCEDURE;" +
            "VAR procVar: ProcType;" +
            "PROCEDURE procWithProcArg(p: ProcType); END procWithProcArg;"),
    pass("PROCEDURE p; PROCEDURE innerP; END innerP; END p",
         "PROCEDURE p; PROCEDURE innerP; END innerP; BEGIN innerP() END p"),
    fail(["PROCEDURE p; PROCEDURE innerP; END innerP; BEGIN procVar := innerP END p",
          "local procedure 'innerP' cannot be referenced"],
         ["PROCEDURE p; PROCEDURE innerP; END innerP; BEGIN procWithProcArg(innerP) END p",
          "local procedure 'innerP' cannot be referenced"],
         ["PROCEDURE p; PROCEDURE innerP; VAR innerV: INTEGER; END innerP; BEGIN innerV := 0 END p",
          "undeclared identifier: 'innerV'"])
    ),
"procedure assignment": testWithContext(
    context(Grammar.statement,
            "TYPE ProcType1 = PROCEDURE(): ProcType1;"
              + "ProcType2 = PROCEDURE(): ProcType2;"
              + "ProcType3 = PROCEDURE(p: ProcType3): ProcType3;"
              + "ProcType4 = PROCEDURE(p: ProcType4): ProcType4;"
              + "ProcType4VAR = PROCEDURE(VAR p: ProcType4VAR): ProcType4VAR;"
              + "ProcType5 = PROCEDURE(p: ProcType3): ProcType4;"
              + "ProcType6 = PROCEDURE(p: INTEGER);"
              + "ProcType7 = PROCEDURE(VAR p: INTEGER);"
            + "VAR v1: ProcType1; v2: ProcType2;"
                + "v3: PROCEDURE(i: INTEGER): ProcType1; v4: PROCEDURE(b: BOOLEAN): ProcType1;"
                + "v5: PROCEDURE(p: ProcType1); v6: PROCEDURE(p: ProcType2);"
                + "v7: ProcType3; v8: ProcType4; v8VAR: ProcType4VAR; v9: ProcType5; v10: ProcType6; v11: ProcType7;"
                + "vProcCharArray: PROCEDURE (a: ARRAY OF CHAR);"
            + "PROCEDURE p1(): ProcType1; RETURN p1 END p1;"
            + "PROCEDURE procCharArray(a: ARRAY OF CHAR); END procCharArray;"
            + "PROCEDURE procIntArray(a: ARRAY OF INTEGER); END procIntArray;"
            ),
    pass("v1 := v2",
         "v5 := v6",
         "v7 := v8",
         "v7 := v9",
         "v8 := v9",
         "v1 := p1",
         "vProcCharArray := procCharArray"),
    fail(["p1 := v1", "cannot assign to procedure"],
         ["v3 := v1",
          "type mismatch: 'v3' is 'PROCEDURE(INTEGER): ProcType1' and cannot be assigned to 'ProcType1' expression"],
         ["v3 := v4",
          "type mismatch: 'v3' is 'PROCEDURE(INTEGER): ProcType1' and cannot be assigned to 'PROCEDURE(BOOLEAN): ProcType1' expression"],
         ["v10 := NEW",
          "standard procedure NEW cannot be referenced"],
         ["v10 := v11", "type mismatch: 'v10' is 'ProcType6' and cannot be assigned to 'ProcType7' expression" ],
         ["v8 := v8VAR", "type mismatch: 'v8' is 'ProcType4' and cannot be assigned to 'ProcType4VAR' expression" ],
         ["vProcCharArray := procIntArray",
          "type mismatch: 'vProcCharArray' is 'PROCEDURE(ARRAY OF CHAR)' and cannot be assigned to 'PROCEDURE(ARRAY OF INTEGER)' expression"]
         )
    ),
"string assignment": testWithContext(
    context(Grammar.statement,
            "VAR a1: ARRAY 3 OF CHAR;"
            + "ch1: CHAR;"
            + "intArray: ARRAY 10 OF INTEGER;"
            ),
    pass("a1 := \"abc\"",
         "a1 := \"ab\"",
         "a1 := \"a\"",
         "a1 := 22X",
         "ch1 := \"A\"",
         "ch1 := 22X"),
    fail(["a1 := \"abcd\"", "3-character ARRAY is too small for 4-character string"],
         ["intArray := \"abcd\"",
          "type mismatch: 'intArray' is 'ARRAY 10 OF INTEGER' and cannot be assigned to 'multi-character string' expression"])
    ),
"string relations": testWithContext(
    context(Grammar.expression,
            "VAR ch: CHAR;"),
    pass("ch = \"a\"",
         "\"a\" = ch",
         "ch # \"a\"",
         "\"a\" # ch"
        ),
    fail(["ch = \"ab\"", "type mismatch: expected 'CHAR', got 'multi-character string'"])
    ),
"array assignment": testWithContext(
    context(Grammar.statement,
            "VAR charArray: ARRAY 3 OF CHAR;"
            + "intArray: ARRAY 10 OF INTEGER;"
            + "intArray2: ARRAY 10 OF INTEGER;"
            + "intArray3: ARRAY 5 OF INTEGER;"
            + "intArray23m1: ARRAY 2 OF ARRAY 3 OF INTEGER;"
            + "intArray23m2: ARRAY 2, 3 OF INTEGER;"
            + "intArray24m: ARRAY 2, 4 OF INTEGER;"
            + "intArray43m: ARRAY 4, 3 OF INTEGER;"
            ),
    pass("intArray := intArray2",
         "intArray23m1 := intArray23m2",
         "intArray23m2 := intArray23m1",
         "intArray43m[0] := intArray23m1[0]"
         ),
    fail(["intArray := charArray",
         "type mismatch: 'intArray' is 'ARRAY 10 OF INTEGER' and cannot be assigned to 'ARRAY 3 OF CHAR' expression"],
         ["intArray2 := intArray3",
          "type mismatch: 'intArray2' is 'ARRAY 10 OF INTEGER' and cannot be assigned to 'ARRAY 5 OF INTEGER' expression"],
         ["intArray3 := charArray",
          "type mismatch: 'intArray3' is 'ARRAY 5 OF INTEGER' and cannot be assigned to 'ARRAY 3 OF CHAR' expression"],
         ["intArray24m := intArray23m1",
          "type mismatch: 'intArray24m' is 'ARRAY 2, 4 OF INTEGER' and cannot be assigned to 'ARRAY 2, 3 OF INTEGER' expression"]
          )
    ),
"record assignment": testWithContext(
    context(Grammar.statement,
            "TYPE Base1 = RECORD END;"
                + "T1 = RECORD (Base1) END;"
                + "T2 = RECORD END;"
            + "VAR b1: Base1; r1: T1; r2: T2;"
            ),
    pass("r1 := r1",
         "b1 := r1"),
    fail(["r1 := r2", "type mismatch: 'r1' is 'T1' and cannot be assigned to 'T2' expression"],
         ["r1 := b1", "type mismatch: 'r1' is 'T1' and cannot be assigned to 'Base1' expression"])
    ),
"open array assignment fails": testWithGrammar(
    Grammar.procedureDeclaration,
    pass(),
    fail(["PROCEDURE p(s1, s2: ARRAY OF CHAR); BEGIN s1 := s2 END p",
          "cannot assign to read-only variable"],
         ["PROCEDURE p(VAR s1, s2: ARRAY OF CHAR); BEGIN s1 := s2 END p",
          "'s1' is open 'ARRAY OF CHAR' and cannot be assigned"],
         ["PROCEDURE p(s1: ARRAY OF CHAR); VAR s2: ARRAY 10 OF CHAR; BEGIN s2 := s1 END p",
          "type mismatch: 's2' is 'ARRAY 10 OF CHAR' and cannot be assigned to 'ARRAY OF CHAR' expression"])
    ),
"open array type as procedure parameter": testWithContext(
    context(Grammar.procedureDeclaration,
            "TYPE A = ARRAY 3 OF INTEGER;"
            ),
    pass("PROCEDURE p(a: ARRAY OF INTEGER); BEGIN END p",
         "PROCEDURE p(a: ARRAY OF ARRAY OF INTEGER); BEGIN END p",
         "PROCEDURE p(a: ARRAY OF A); BEGIN END p"
        ),
    fail(["PROCEDURE p(a: ARRAY OF ARRAY 3 OF INTEGER); BEGIN END p",
          "')' expected"]
        )
    ),
"non-open array type as procedure parameter": testWithContext(
    context(Grammar.procedureDeclaration,
            "TYPE A = ARRAY 2 OF INTEGER;"
            + "VAR a: A;"
            + "PROCEDURE pa(a: A); BEGIN END pa;"
            ),
    pass("PROCEDURE p(a: A); BEGIN END p",
         "PROCEDURE p(); VAR a: A; BEGIN pa(a) END p",
         "PROCEDURE p(); VAR a: ARRAY 2 OF INTEGER; BEGIN pa(a) END p"
         ),
    fail(["PROCEDURE p(a: ARRAY 3 OF INTEGER); BEGIN END p",
          "')' expected"],
         ["PROCEDURE p(a: A): INTEGER; BEGIN RETURN a[2] END p",
          "index out of bounds: maximum possible index is 1, got 2"],
         ["PROCEDURE p(); VAR a: ARRAY 1 OF INTEGER; BEGIN pa(a) END p",
          "type mismatch for argument 1: 'ARRAY 1 OF INTEGER' cannot be converted to 'ARRAY 2 OF INTEGER'"],
         ["PROCEDURE p(a: ARRAY OF INTEGER); BEGIN pa(a) END p",
          "type mismatch for argument 1: 'ARRAY OF INTEGER' cannot be converted to 'ARRAY 2 OF INTEGER'"]
        )
    ),
"string assignment to open array fails": testWithGrammar(
    Grammar.procedureDeclaration,
    pass(),
    fail(["PROCEDURE p(s: ARRAY OF CHAR); BEGIN s := \"abc\" END p", "cannot assign to read-only variable"],
         ["PROCEDURE p(VAR s: ARRAY OF CHAR); BEGIN s := \"abc\" END p", "string cannot be assigned to open ARRAY OF CHAR"])
    ),
"string argument": testWithContext(
    context(Grammar.statement,
            "PROCEDURE p1(s: ARRAY OF CHAR); END p1;"
            + "PROCEDURE p2(VAR s: ARRAY OF CHAR); END p2;"
            + "PROCEDURE p3(i: INTEGER); END p3;"
            + "PROCEDURE p4(a: ARRAY OF INTEGER); END p4;"
            ),
    pass("p1(\"abc\")"),
    fail(["p2(\"abc\")", "expression cannot be used as VAR parameter"],
         ["p3(\"abc\")", "type mismatch for argument 1: 'multi-character string' cannot be converted to 'INTEGER'"],
         ["p4(\"abc\")", "type mismatch for argument 1: 'multi-character string' cannot be converted to 'ARRAY OF INTEGER'"])
    ),
"scope": testWithGrammar(
    Grammar.declarationSequence,
    pass("PROCEDURE p1(a1: INTEGER); END p1; PROCEDURE p2(a1: BOOLEAN); END p2;")
    ),
"module": testWithGrammar(
    Grammar.module,
    pass("MODULE m; END m."),
    fail(["MODULE m; END undeclared.",
          "original module name 'm' expected, got 'undeclared'"],
         ["MODULE m; BEGIN - END m.", "END expected (MODULE)"])
    ),
"assert": testWithGrammar(
    Grammar.statement,
    pass("ASSERT(TRUE)"),
    fail(["ASSERT()", "1 argument(s) expected, got 0"],
         ["ASSERT(TRUE, 123)", "1 argument(s) expected, got 2"],
         ["ASSERT(123, TRUE)", "type mismatch for argument 1: 'INTEGER' cannot be converted to 'BOOLEAN'"])
    ),
"export": testWithGrammar(
    Grammar.declarationSequence,
    pass("CONST i* = 1;",
         "TYPE T* = RECORD END;",
         "VAR i*: INTEGER;",
         "PROCEDURE p*; END p;"
         ),
    fail(["VAR r*: RECORD END;",
          "only scalar type variables can be exported"],
         ["VAR a*: ARRAY 5 OF INTEGER;",
          "only scalar type variables can be exported"],
         ["TYPE T = RECORD f*: INTEGER END;",
          "field 'f' can be exported only if record 'T' itself is exported too"],
         ["TYPE PT* = POINTER TO RECORD f*: INTEGER END;",
          "cannot export anonymous RECORD field: 'f'"],
         ["VAR p: POINTER TO RECORD f*: INTEGER END;",
          "cannot export anonymous RECORD field: 'f'"],
         ["VAR p*: POINTER TO RECORD r: RECORD f*: INTEGER END END;",
          "field 'f' can be exported only if field 'r' itself is exported too"],
         ["VAR i*: POINTER TO RECORD f*: INTEGER END;",
          "cannot export anonymous RECORD field: 'f'"],
         ["VAR i*: POINTER TO RECORD r*: RECORD f*: INTEGER END END;",
          "cannot export anonymous RECORD field: 'r'"],
         ["PROCEDURE p*; VAR i*: INTEGER; END p;",
          "cannot export from within procedure: variable 'i'"]
         //["TYPE PT = POINTER TO RECORD END; PROCEDURE p*(): PT; RETURN NIL END p;",
         //"exported PROCEDURE 'p' uses non-exported type 'PT'"]
         )
    ),
"import JS": testWithGrammar(
    Grammar.module,
    pass("MODULE m; IMPORT JS; END m.",
         "MODULE m; IMPORT JS; BEGIN JS.alert(\"test\") END m.",
         "MODULE m; IMPORT JS; BEGIN JS.console.info(123) END m.",
         "MODULE m; IMPORT JS; BEGIN JS.do(\"throw new Error()\") END m."
         ),
    fail(["MODULE m; IMPORT JS; BEGIN JS.do(123) END m.",
          "string is expected as an argument of JS predefined procedure 'do', got INTEGER"],
         ["MODULE m; IMPORT JS; BEGIN JS.do(\"a\", \"b\") END m.",
          "1 argument(s) expected, got 2"],
         ["MODULE m; IMPORT JS; VAR s: ARRAY 10 OF CHAR; BEGIN JS.do(s) END m.",
          "string is expected as an argument of JS predefined procedure 'do', got ARRAY 10 OF CHAR"]
          )
    ),
"JS.var": testWithGrammar(
    Grammar.module,
    pass("MODULE m; IMPORT JS; VAR v: JS.var; END m.",
         "MODULE m; IMPORT JS; VAR v: JS.var; BEGIN v := JS.f(); END m.",
         "MODULE m; IMPORT JS; VAR v: JS.var; BEGIN v := JS.f1(); JS.f2(v); END m."
         ),
    fail(["MODULE m; IMPORT JS; VAR v: JS.var; i: INTEGER; BEGIN i := v; END m.",
          "type mismatch: 'i' is 'INTEGER' and cannot be assigned to 'JS.var' expression"])
    ),
"import unknown module": testWithGrammar(
    Grammar.module,
    pass(),
    fail(["MODULE m; IMPORT unknown; END m.", "module(s) not found: unknown"],
         ["MODULE m; IMPORT unknown1, unknown2; END m.", "module(s) not found: unknown1, unknown2"]
         )
    ),
"self import is failed": testWithGrammar(
    Grammar.module,
    pass(),
    fail(["MODULE test; IMPORT test; END test.", "module 'test' cannot import itself"])
    ),
"import aliases": testWithGrammar(
    Grammar.module,
    pass("MODULE m; IMPORT J := JS; END m.",
         "MODULE m; IMPORT J := JS; BEGIN J.alert(\"test\") END m."),
    fail(["MODULE m; IMPORT u1 := unknown1, unknown2; END m.", "module(s) not found: unknown1, unknown2"],
         ["MODULE m; IMPORT a1 := m1, a2 := m1; END m.", "module already imported: 'm1'"],
         ["MODULE m; IMPORT a1 := u1, a1 := u2; END m.", "duplicated alias: 'a1'"],
         ["MODULE m; IMPORT J := JS; BEGIN JS.alert(\"test\") END m.", "undeclared identifier: 'JS'"]
         )
    ),
"imported module without exports": testWithModule(
    "MODULE test; END test.",
    pass("MODULE m; IMPORT test; END m."),
    fail(["MODULE m; IMPORT test; BEGIN test.p(); END m.",
          "identifier 'p' is not exported by module 'test'"],
         ["MODULE m; IMPORT t := test; BEGIN t.p(); END m.",
          "identifier 'p' is not exported by module 'test'"]
        )),
"imported variables are read-only": testWithModule(
    "MODULE test; VAR i*: INTEGER; END test.",
    pass("MODULE m; IMPORT test; PROCEDURE p(i: INTEGER); END p; BEGIN p(test.i); END m."),
    fail(["MODULE m; IMPORT test; BEGIN test.i := 123; END m.",
          "cannot assign to imported variable"],
         ["MODULE m; IMPORT test; PROCEDURE p(VAR i: INTEGER); END p; BEGIN p(test.i); END m.",
          "imported variable cannot be used as VAR parameter"]
        )
    ),
"import pointer type": testWithModule(
    "MODULE test;"
    + "TYPE TPAnonymous1* = POINTER TO RECORD END; TPAnonymous2* = POINTER TO RECORD END;"
        + "Base* = RECORD END; TPDerived* = POINTER TO RECORD(Base) END;"
    + "END test.",
    pass("MODULE m; IMPORT test; VAR p1: test.TPAnonymous1; p2: test.TPAnonymous2; END m.",
         "MODULE m; IMPORT test;"
            + "VAR pb: POINTER TO test.Base; pd: test.TPDerived;"
            + "BEGIN pb := pd; END m."),
    fail(["MODULE m; IMPORT test; VAR p1: test.TPAnonymous1; p2: test.TPAnonymous2; BEGIN p1 := p2; END m.",
          "type mismatch: 'p1' is 'TPAnonymous1' and cannot be assigned to 'TPAnonymous2' expression"]
         )
    ),
"import array type": testWithModule(
    "MODULE test; TYPE TA* = ARRAY 3 OF INTEGER; END test.",
    pass("MODULE m; IMPORT test; VAR a: test.TA; END m.")
    ),
"import procedure type": testWithModule(
    "MODULE test; TYPE TProc* = PROCEDURE; END test.",
    pass("MODULE m; IMPORT test; VAR proc: test.TProc; END m.")
    ),
"imported pointer type cannot be used in NEW if base type is not exported": testWithModule(
    "MODULE test;"
    + "TYPE T = RECORD END; TP* = POINTER TO T;"
    + "TPAnonymous* = POINTER TO RECORD END; END test.",
    pass(),
    fail(["MODULE m; IMPORT test; VAR p: test.TPAnonymous; BEGIN NEW(p) END m.",
          "non-exported RECORD type cannot be used in NEW"],
         ["MODULE m; IMPORT test; VAR p: test.TP; BEGIN NEW(p) END m.",
          "non-exported RECORD type cannot be used in NEW"])
    ),
"imported pointer type cannot be dereferenced if base type is not exported (even if base of base type is exported)": testWithModule(
    "MODULE test;"
    + "TYPE B* = RECORD i: INTEGER END; T = RECORD(B) END; TP* = POINTER TO T;"
    + "TPAnonymous* = POINTER TO RECORD(B) END;"
    + "PROCEDURE makeTP*(): TP; VAR result: TP; BEGIN NEW(result); RETURN result END makeTP;"
    + "PROCEDURE makeTPA*(): TPAnonymous; VAR result: TPAnonymous; BEGIN NEW(result); RETURN result END makeTPA;"
    + "END test.",
    pass(),
    fail(["MODULE m; IMPORT test; VAR p: test.TPAnonymous; BEGIN p := test.makeTPA(); p.i := 123; END m.",
          "POINTER TO non-exported RECORD type cannot be dereferenced"],
         ["MODULE m; IMPORT test; VAR p: test.TP; BEGIN p := test.makeTP(); p.i := 123; END m.",
          "POINTER TO non-exported RECORD type cannot be dereferenced"])
    ),
"imported pointer variable: anonymous record field cannot be used": testWithModule(
    "MODULE test; VAR p*: POINTER TO RECORD i: INTEGER END; END test.",
    pass(),
    fail(["MODULE m; IMPORT test; BEGIN ASSERT(test.p.i = 0) END m.",
          "POINTER TO non-exported RECORD type cannot be dereferenced"])
    ),
"syntax errors": testWithGrammar(
    Grammar.module,
    pass(),
    fail(["MODULE m; CONST c = 1 END m.",
          "';' expected"],
         ["MODULE m; TYPE T = RECORD END END m.",
          "';' expected"],
         ["MODULE m; VAR v: INTEGER END m.",
          "';' expected"],
         ["MODULE m; PROCEDURE p(INTEGER) END m.",
          "')' expected"])
    )
};

Test.run(testSuite);
