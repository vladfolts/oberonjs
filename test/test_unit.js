var assert = require("assert.js").ok;
var Context = require("context.js");
var Errors = require("errors.js");
var Grammar = require("grammar.js");
var oc = require("oc.js");
var Class = require("rtl.js").Class;
var Stream = require("stream.js").Stream;
var Test = require("test.js");

var TestError = Test.TestError;

function parseInContext(grammar, s, context){
	var stream = new Stream(s);
	if (!grammar(stream, context) || !stream.eof())
		throw new Errors.Error("not parsed");
}

function parseUsingGrammar(grammar, s, cxFactory, handlerError){
	var baseContext = new Context.Context();
	var context = cxFactory ? cxFactory(baseContext) : baseContext;
	try {
		parseInContext(grammar, s, context);
	}
	catch (x){
		if (!(x instanceof Errors.Error))
			throw x;//console.log(x.stack);
		
		if (handlerError)
			handlerError(x);
		//else
		//	throw x;
		//	console.log(s + ": " + x);
		return false;
	}
	return true;
}

function setup(parser, contextFactory){
	function parseImpl(s, handleError){
		return parseUsingGrammar(parser, s, contextFactory, handleError);
	}

	return {
		parse: function(s){
			function handleError(e){throw new TestError(s + "\n\t" + e);}

			if (!parseImpl(s, handleError))
				throw new TestError(s + ": not parsed");
		},
		expectError: function(s, error){
			function handleError(actualError){
				var sErr = actualError.toString();
				if (sErr != error)
					throw new TestError(s + "\n\texpected error: " + error + "\n\tgot: " + sErr );
			}

			if (parseImpl(s, handleError))
				throw new TestError(s + ": should not be parsed, expect error: " + error);
		}
	};
}

function setupWithContext(grammar, source){
	function makeContext(){
		var context = new Context.Context();
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

	return setup(grammar, makeContext);
}

var testSuite = {
comment: function(){
	var test = setup(Grammar.expression);
	test.parse("(**)123");
	test.parse("(*abc*)123");
	test.parse("(*abc*)(*def*)123");
	test.parse("(*a(*b*)c*)123");
	test.expectError("(*123", "comment was not closed");
},
"spaces are required to separate keywords and integers": function(){
	var test = setup(Grammar.typeDeclaration);

	test.expectError("T = ARRAY10OFARRAY5OFINTEGER", "not parsed");
	test.expectError("T = ARRAY10 OF ARRAY 5 OF INTEGER", "not parsed");
	test.expectError("T = ARRAY 10OF ARRAY 5 OF INTEGER", "not parsed");
	test.expectError("T = ARRAY 10 OFARRAY 5 OF INTEGER", "not parsed");
	test.expectError("T = ARRAY 10 OF ARRAY5 OF INTEGER", "undeclared type: 'ARRAY5'");
	test.expectError("T = ARRAY 10 OF ARRAY 5OF INTEGER", "not parsed");
	test.expectError("T = ARRAY 10 OF ARRAY 5 OFINTEGER", "not parsed");
},
expression: function(){
	var test = setupWithContext(
		  Grammar.expression
		, "TYPE ProcType = PROCEDURE(): INTEGER;"
		+ "PROCEDURE p1(): INTEGER; RETURN 1 END p1;"
		+ "PROCEDURE p2(): ProcType; RETURN p1 END p2;"
		+ "PROCEDURE noResult(); END noResult;");

	test.expectError("", "not parsed");
	test.parse("123");
	test.expectError("12a", "not parsed");

	test.parse("1+2");
	test.parse("1 + 2");
	test.parse("1 + 2 + 3");

	test.parse("-1");
	test.parse("+1");

	test.parse("p1() + p1()");
	test.parse("p2()");
	test.expectError("p2()()", "not parsed");
	test.expectError("noResult()", "procedure returning no result cannot be used in an expression");
},
"string expression": function(){
	var test = setup(Grammar.expression);

	test.parse("\"\"");
	test.parse("\"a\"");
	test.parse("\"abc\"");
	test.parse("0FFX");
	test.parse("0AX");
	test.parse("22X");
	test.parse("0X");
	test.expectError("\"", "unexpected end of string");
	test.expectError("FFX", "undeclared identifier: 'FFX'");
	//assert(!parse("1 + \"a\""));
	//assert(parse("\"a\" + \"b\""));
},
"parentheses": function(){
	var test = setup(Grammar.expression);

	test.parse("(1)");
	test.parse("(1 + 2)");
	test.parse("(1 + 2) * 3");
	test.parse("3 * (1 + 2)");
	test.expectError("(1  + 2", "no matched ')'");
},
identifier: function(){
	var IdentDeclarationContext = Class.extend({
		init: function(){this.__ident = undefined;},
		setIdent: function(id){this.__ident = id;},
		ident: function() {return this.__ident;},
		getResult: function() {return this.__ident;}
	});
	function makeContext() {return new IdentDeclarationContext();}
	var parse = function(s) { return parseUsingGrammar(Grammar.ident, s, makeContext); };
	assert(!parse(""));
	assert(parse("i"));
	assert(!parse("1"));
	assert(parse("abc1"));
},
"variable declaration": function(){
	var parse = function(s) { return parseUsingGrammar(Grammar.variableDeclaration, s); };
	assert(parse("i: INTEGER"));
	assert(parse("i, j: INTEGER"));
	assert(!parse("i: T"));
},
"procedure VAR section": function(){
	var parse = function(s) { return parseUsingGrammar(Grammar.declarationSequence, s); };
	assert(parse("VAR"));
	assert(parse("VAR i: INTEGER;"));
	assert(parse("VAR i, j: INTEGER;"));
	assert(parse("VAR i, j: INTEGER; b: BOOLEAN;"));
},
"const declaration": function(){
	var test = setupWithContext(
		  Grammar.declarationSequence
		, "CONST ci = 1; VAR v1: INTEGER;");
	test.parse("CONST i = 10;");
	test.parse("CONST i = 1 + 2;");
	test.parse("CONST i = ci + 2;");
	test.parse("CONST i = ci * 2;");
	test.parse("CONST i = ORD({0..5});");
	test.parse("CONST i = ORD({0..5} <= {0..8});");
	test.parse("CONST b = TRUE;");
	test.parse("CONST b = {0..5} <= {0..8};");
	test.parse("CONST c = \"a\";");
	test.parse("CONST s = \"abc\";");
	test.parse("CONST s0 = \"\";");
	test.parse("CONST set = {};");
	test.parse("CONST set = {1 + 2};");
	test.parse("CONST set = {0..32 - 1};");
	test.parse("CONST set = {ci};");
	test.parse("CONST i1 = 1; b1 = TRUE;");
	test.parse("CONST i1 = 1; i2 = i1 + 1;");
	test.parse("CONST i1 = 1; i2 = i1 + 1; i3 = i2 + 2;");
	test.expectError("CONST i1 = v1;", "constant expression expected");
	test.expectError("CONST i1 = v1 * 2;", "constant expression expected");
	test.expectError("CONST i1 = v1 - 10;", "constant expression expected");
	test.expectError("CONST i1 = 10 - v1;", "constant expression expected");
	test.expectError("CONST s = {v1};", "constant expression expected");
	test.expectError("CONST s = {1, v1};", "constant expression expected");
	test.expectError("CONST s = {1..v1};", "constant expression expected");
	test.expectError("CONST s = {10 - v1..15};", "constant expression expected");
},
"record declaration": function(){
	var parse = function(s) { return parseUsingGrammar(Grammar.typeDeclaration, s); };
	assert(parse("t = RECORD END"));
	assert(parse("t = RECORD i: INTEGER END"));
	assert(parse("t = RECORD i, j: INTEGER END"));
	assert(!parse("t = RECORD i, j, i: INTEGER END"));
	assert(parse("t = RECORD i, j: INTEGER; b: BOOLEAN END"));
},
"array declaration": function(){
	var test = setupWithContext(
		  Grammar.typeDeclaration
		, "CONST c1 = 5; VAR v1: INTEGER;");
	test.parse("T = ARRAY 10 OF INTEGER");
	test.parse("T = ARRAY 10 OF BOOLEAN");
	test.expectError("T = ARRAY 0 OF INTEGER", "array size must be greater than 0, got 0");
	test.expectError("T = ARRAY TRUE OF INTEGER"
				   , "'INTEGER' constant expression expected, got 'BOOLEAN'");
	test.parse("T = ARRAY 1 + 2 OF INTEGER");
	test.parse("T = ARRAY c1 OF INTEGER");
	test.parse("T = ARRAY ORD({0..5} <= {0..8}) OF INTEGER");
	test.expectError("T = ARRAY v1 OF INTEGER", "constant expression expected as ARRAY size");
	test.expectError("T = ARRAY c1 - 10 OF INTEGER", "array size must be greater than 0, got -5");
	test.expectError("T = ARRAY ORD({0..5} >= {0..8}) OF INTEGER", "array size must be greater than 0, got 0");
},
"multi-dimensional array declaration": function(){
	var test = setup(Grammar.typeDeclaration);

	test.parse("T = ARRAY 10 OF ARRAY 5 OF INTEGER");
	test.parse("T = ARRAY 10, 5 OF INTEGER");
},
"PROCEDURE type declaration": function(){
	var test = setup(Grammar.typeDeclaration);

	test.parse("T = PROCEDURE");
	test.parse("T = PROCEDURE()");
	test.parse("T = PROCEDURE(a: INTEGER)");
	test.parse("T = PROCEDURE(a: INTEGER; b: BOOLEAN)");
	test.parse("T = PROCEDURE(): T");
},
"POINTER declaration": function(){
	var test = setup(Grammar.typeDeclaration);

	test.parse("T = POINTER TO RECORD END");
	test.parse("T = POINTER TO NotDeclaredYet");
	test.parse("T = POINTER TO RECORD p: POINTER TO T END");
	test.expectError("T = POINTER TO INTEGER"
				   , "RECORD is expected as a POINTER base type, got 'INTEGER'");
	test.expectError("T = POINTER TO POINTER TO RECORD END"
				   , "RECORD is expected as a POINTER base type, got 'POINTER TO anonymous RECORD'");
},
"POINTER dereference": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "VAR p: POINTER TO RECORD field: INTEGER END; i: INTEGER; r: RECORD END;");

	test.parse("p^.field := 1");
	test.parse("p.field := 0");
	test.expectError("i^", "POINTER TO type expected, got 'INTEGER'");
	test.expectError("r^", "POINTER TO type expected, got 'anonymous RECORD'");
},
"POINTER assignment": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "TYPE Base = RECORD END; Derived = RECORD (Base) END;"
		+ "VAR p1, p2: POINTER TO RECORD END; pBase: POINTER TO Base; pDerived: POINTER TO Derived;");

	test.parse("p1 := NIL");
	test.parse("p1 := p2");
	test.parse("pBase := pDerived");
	test.expectError("p1 := pBase"
				   , "type mismatch: 'p1' is 'POINTER TO anonymous RECORD' and cannot be assigned to 'POINTER TO Base' expression");
	test.expectError("pDerived := pBase"
				   , "type mismatch: 'pDerived' is 'POINTER TO Derived' and cannot be assigned to 'POINTER TO Base' expression");
	test.expectError("NIL := p1", "not parsed");
},
"POINTER cast": function(){
	var test = setupWithContext(
		  Grammar.expression
		, "TYPE Base = RECORD END; Derived = RECORD (Base) END; PDerived = POINTER TO Derived;"
		+ "VAR p1, p2: POINTER TO RECORD END; pBase: POINTER TO Base; pDerived: POINTER TO Derived; i: INTEGER;");

	test.parse("pBase(Derived)");
	test.expectError("pDerived(Derived)"
				   , "invalid type cast: 'Derived' is not an extension of 'Derived'");
	test.expectError("p1(Base)"
				   , "invalid type cast: 'Base' is not an extension of 'anonymous RECORD'");
	test.expectError("p1(INTEGER)"
				   , "invalid type cast: RECORD type expected as an argument of type guard, got 'INTEGER'");
	test.expectError("p1(PDerived)"
				   , "invalid type cast: RECORD type expected as an argument of type guard, got 'PDerived'");
	test.expectError("i(Derived)"
				   , "invalid type cast: 'Derived' is not an extension of 'INTEGER'");
},
"IS expression": function(){
	var test = setupWithContext(
		  Grammar.expression
		, "TYPE Base = RECORD END; Derived = RECORD (Base) END; PDerived = POINTER TO Derived;"
		+ "VAR p: POINTER TO RECORD END; pBase: POINTER TO Base; pDerived: POINTER TO Derived; vDerived: Derived; i: INTEGER;");

	test.parse("pBase IS Derived");
	test.expectError("pBase IS pDerived", "RECORD type expected after 'IS'");
	test.expectError("pBase IS TRUE", "RECORD type expected after 'IS'");
	test.expectError("pBase IS vDerived", "type name expected");
	test.expectError("Derived IS Derived", "POINTER to type expected before 'IS'");
	test.expectError("i IS Derived", "POINTER to type expected before 'IS'");
	test.expectError("p IS Derived"
				   , "invalid type test: 'Derived' is not an extension of 'anonymous RECORD'");
	test.expectError("pDerived IS Derived"
				   , "invalid type test: 'Derived' is not an extension of 'Derived'");
	test.expectError("pDerived IS Base"
				   , "invalid type test: 'Base' is not an extension of 'Derived'");
	test.expectError("pDerived IS INTEGER", "RECORD type expected after 'IS'");
},
"NEW": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "TYPE P = POINTER TO RECORD END;"
		+ "VAR p: P; i: INTEGER;"
		+ "PROCEDURE proc(): P; RETURN NIL END proc;"
		);

	test.parse("NEW(p)");
	test.expectError("NEW.NEW(p)", "cannot designate 'predefined procedure NEW'");
	test.expectError("NEW(i)", "POINTER variable expected, got 'INTEGER'");
	test.expectError("NEW()", "1 argument(s) expected, got 0");
	test.expectError("NEW(p, p)", "1 argument(s) expected, got 2");
	test.expectError("NEW(proc())", "expression cannot be used as VAR parameter");
},
"NEW for read only array element fails": function(){
	var test = setupWithContext(Grammar.procedureDeclaration
							  , "TYPE P = POINTER TO RECORD END;");
	test.expectError("PROCEDURE readOnlyPointers(a: ARRAY OF P); BEGIN NEW(a[0]) END readOnlyPointers",
					 "read-only variable cannot be used as VAR parameter");
},
"LEN": function(){
	var test = setup(Grammar.procedureDeclaration);

	test.parse("PROCEDURE p(a: ARRAY OF INTEGER): INTEGER; RETURN LEN(a) END p");
	test.parse("PROCEDURE p(VAR a: ARRAY OF BOOLEAN): INTEGER; RETURN LEN(a) END p");
	test.parse("PROCEDURE p(): INTEGER; RETURN LEN(\"abc\") END p");
	test.expectError("PROCEDURE p(a: ARRAY OF INTEGER): INTEGER; RETURN LEN(a[0]) END p",
					 "type mismatch for argument 1: 'INTEGER' cannot be converted to 'ARRAY OF any type'");
},
"ODD": function(){
	var test = setup(Grammar.statement);

	test.parse("ODD(1)");
	test.parse("ASSERT(ODD(123))");
	test.expectError("ODD(1.2)", "type mismatch for argument 1: 'REAL' cannot be converted to 'INTEGER'");
	test.expectError("ODD(TRUE)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'");
},
"ORD": function(){
	var test = setupWithContext(Grammar.statement, "VAR ch: CHAR;");

	test.parse("ORD(ch)");
	test.parse("ORD(TRUE)");
	test.parse("ORD({1})");
	test.parse("ORD(\"a\")");
	test.parse("ASSERT(ORD(22X) = 022H)");
	test.expectError("ORD(1.2)", "type mismatch for argument 1: 'REAL' cannot be converted to 'CHAR or BOOLEAN or SET'");
	test.expectError("ORD(\"abc\")", "type mismatch for argument 1: 'multi-character string' cannot be converted to 'CHAR or BOOLEAN or SET'");
},
"CHR": function(){
	var test = setupWithContext(Grammar.statement, "VAR i: INTEGER; ch: CHAR;");

	test.parse("CHR(i)");
	//test.expectError("CHR(ch)", "type mismatch for argument 1: 'CHAR' cannot be converted to 'INTEGER'");
},
"assignment statement": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "CONST c = 15;"
		+ "VAR ch: CHAR; i, n: INTEGER; b: BOOLEAN;"
		    + "proc1: PROCEDURE; proc2: PROCEDURE(): INTEGER;"
		    + "a: ARRAY 5 OF INTEGER;"
		+ "PROCEDURE p(): INTEGER; RETURN 1 END p;"
		+ "PROCEDURE noResult(); END noResult;");
	test.parse("i := 0");
	test.parse("i := n");
	test.parse("i := c");
	test.parse("b := TRUE");
	test.parse("ch := \"A\"");
	test.parse("i := p()");
	test.parse("proc1 := proc1");
	test.parse("proc2 := NIL");
	test.parse("a[1] := 2");
	test.expectError("i := b", "type mismatch: 'i' is 'INTEGER' and cannot be assigned to 'BOOLEAN' expression");
	test.expectError("c := i", "cannot assign to constant");
	test.expectError("ch := \"AB\""
				   , "type mismatch: 'ch' is 'CHAR' and cannot be assigned to 'multi-character string' expression");
	test.expectError("i := .1", "expression expected");
	test.expectError("proc1 := proc2"
				   , "type mismatch: 'proc1' is 'PROCEDURE' and cannot be assigned to 'PROCEDURE(): INTEGER' expression");
	test.expectError("i := noResult()", "procedure returning no result cannot be used in an expression");
	},
"array expression": function(){
	var test = setup(Grammar.procedureBody);
	test.parse("VAR a: ARRAY 10 OF INTEGER; BEGIN a[0] := 1 END");
	test.parse("VAR a: ARRAY 10 OF INTEGER; BEGIN a[0] := 1; a[1] := a[0] END");
	test.expectError("VAR a: ARRAY 10 OF INTEGER; BEGIN a[0] := TRUE END"
				   , "type mismatch: 'a[0]' is 'INTEGER' and cannot be assigned to 'BOOLEAN' expression");
	test.expectError("VAR a: ARRAY 10 OF INTEGER; BEGIN a[TRUE] := 1 END"
				   , "'INTEGER' expression expected, got 'BOOLEAN'");
	test.expectError("VAR i: INTEGER; BEGIN i[0] := 1 END"
				   , "ARRAY expected, got 'INTEGER'");
	test.expectError("VAR a: ARRAY 10 OF INTEGER; BEGIN a[0][0] := 1 END"
				   , "ARRAY expected, got 'INTEGER'");
	test.expectError("VAR a: ARRAY 10 OF BOOLEAN; BEGIN a[0,0] := TRUE END"
				   , "ARRAY expected, got 'BOOLEAN'");
	test.expectError("VAR a: ARRAY 10, 20 OF BOOLEAN; BEGIN a[0] := TRUE END"
				   , "type mismatch: 'a[0]' is 'ARRAY OF BOOLEAN' and cannot be assigned to 'BOOLEAN' expression");
	test.expectError("VAR a: ARRAY 10 OF INTEGER; BEGIN a[10] := 0 END"
				   , "index out of bounds: maximum possible index is 9, got 10");
	test.expectError("CONST c1 = 5; VAR a: ARRAY 10 OF INTEGER; BEGIN a[10 + c1] := 0 END"
				   , "index out of bounds: maximum possible index is 9, got 15");
},
"multi-dimensional array expression": function(){
	var test = setup(Grammar.procedureBody);
	test.parse("VAR a: ARRAY 10 OF ARRAY 5 OF INTEGER; BEGIN a[0][0] := 1 END");
	test.parse("VAR a: ARRAY 10, 5 OF BOOLEAN; BEGIN a[0][0] := TRUE END");
	test.parse("VAR a: ARRAY 10, 5 OF BOOLEAN; BEGIN a[0, 0] := TRUE END");
},
"INTEGER number": function(){
	var test = setup(Grammar.expression);
	test.parse("0");
	test.parse("123");
	test.parse("1H");
	test.parse("1FH");
	test.parse("0FFH");
	test.parse("0H");
	test.expectError("FFH", "undeclared identifier: 'FFH'");
	test.expectError("FF", "undeclared identifier: 'FF'");
	test.expectError("1HH", "not parsed");
	test.expectError("1H0", "not parsed");
	test.expectError("1 23", "not parsed");
	test.expectError("1F FH", "not parsed");
},
"SET statement": function(){
	var test = setupWithContext(Grammar.statement, "VAR s: SET;");
	test.parse("s := {}");
	test.parse("s := {0}");
	test.parse("s := {0, 1}");
	test.parse("s := {1 + 2, 5..10}");
	//test.expectError("s := {32}", "0..31");
},
"REAL number": function(){
	var test = setup(Grammar.expression);
	test.parse("1.2345");
	test.parse("1.");
	test.parse("1.2345E6");
	test.parse("1.2345E+6");
	test.parse("1.2345E-12");
	test.expectError("1. 2345E-12", "not parsed");
	test.expectError("1.23 45E-12", "not parsed");
	test.expectError("1.2345 E-12", "not parsed");
	test.expectError("1.2345E-1 2", "not parsed");
},
"LONGREAL number": function(){
	var test = setup(Grammar.expression);
	test.parse("1.2345D6");
	test.parse("1.2345D+6");
	test.parse("1.2345D-6");
},
"IF statement": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "VAR b1: BOOLEAN; i1: INTEGER;");
	test.parse("IF b1 THEN i1 := 0 END");
	test.parse("IF FALSE THEN i1 := 0 ELSE i1 := 1 END");
	test.parse("IF TRUE THEN i1 := 0 ELSIF FALSE THEN i1 := 1 ELSE i1 := 2 END");
	test.expectError("IF i1 THEN i1 := 0 END", "'BOOLEAN' expression expected, got 'INTEGER'");
	test.expectError("IF b1 THEN i1 := 0 ELSIF i1 THEN i1 := 2 END"
				   , "'BOOLEAN' expression expected, got 'INTEGER'");
},
"CASE statement": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "CONST ci = 15; cc = \"A\";	VAR	c1: CHAR; b1: BOOLEAN; i1, i2: INTEGER;");
	test.parse("CASE i1 OF END");
	test.parse("CASE i1 OF 0: b1 := TRUE END");
	test.parse("CASE c1 OF \"A\": b1 := TRUE END");
	test.parse("CASE i1 OF 0: b1 := TRUE | 1: b1 := FALSE END");
	test.parse("CASE i1 OF 0, 1: b1 := TRUE END");
	test.parse("CASE c1 OF \"A\", \"B\": b1 := TRUE END");
	test.parse("CASE i1 OF 0..2: b1 := TRUE END");
	test.parse("CASE i1 OF ci..2: b1 := TRUE END");
	test.parse("CASE c1 OF cc..\"Z\": b1 := TRUE END");
	test.parse("CASE i1 OF 1, 2, 3: b1 := TRUE | 4..10: b1 := FALSE | 11: c1 := \"A\" END");
	test.parse("CASE i1 OF 1, 2, 5..9: b1 := TRUE END");
	test.expectError("CASE i1 OF undefined: b1 := TRUE END"
				   , "undeclared identifier: 'undefined'");
	test.expectError("CASE i1 OF i2: b1 := TRUE END"
				   , "'i2' is not a constant");
	test.expectError("CASE b1 OF END", "'INTEGER' or 'CHAR' expected as CASE expression");
	test.expectError("CASE i1 OF \"A\": b1 := TRUE END"
				   , "label must be 'INTEGER' (the same as case expression), got 'CHAR'");
	test.expectError("CASE c1 OF \"A\", 1: b1 := TRUE END"
				   , "label must be 'CHAR' (the same as case expression), got 'INTEGER'");
	test.expectError("CASE c1 OF \"A\"..1: b1 := TRUE END"
				   , "label must be 'CHAR' (the same as case expression), got 'INTEGER'");
},
"WHILE statement": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "VAR b1: BOOLEAN; i1: INTEGER;");
	test.parse("WHILE TRUE DO i1 := 0 END");
	test.parse("WHILE b1 DO i1 := 0 ELSIF FALSE DO i1 := 1 END");
	test.expectError("WHILE i1 DO i1 := 0 END", "'BOOLEAN' expression expected, got 'INTEGER'");
	test.expectError("WHILE b1 DO i1 := 0 ELSIF i1 DO i1 := 1 END", "'BOOLEAN' expression expected, got 'INTEGER'");
},
"REPEAT statement": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "VAR b1: BOOLEAN; i1: INTEGER;");
	test.parse("REPEAT i1 := 0 UNTIL TRUE");
	test.parse("REPEAT i1 := 0 UNTIL b1");
	test.expectError("REPEAT i1 := 0 UNTIL i1", "'BOOLEAN' expression expected, got 'INTEGER'");
},
"FOR statement": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "CONST c = 15; VAR b: BOOLEAN; i, n: INTEGER;");
	test.parse("FOR i := 0 TO 10 DO n := 1 END");
	test.parse("FOR i := 0 TO 10 BY 5 DO b := TRUE END");
	test.parse("FOR i := 0 TO n DO b := TRUE END");
	test.parse("FOR i := 0 TO n BY c DO n := 1; b := FALSE END");
	test.expectError("FOR undefined := 0 TO 10 DO n := 1 END"
				   , "undeclared identifier: 'undefined'");
	test.expectError("FOR b := TRUE TO 10 DO n := 1 END"
				   , "'b' is a 'BOOLEAN' variable, 'FOR' control variable must be 'INTEGER'");
	test.expectError("FOR c := 0 TO 10 DO END", "'c' is not a variable");
	test.expectError("FOR i := TRUE TO 10 DO n := 1 END"
				   , "'INTEGER' expression expected to assign 'i', got 'BOOLEAN'");
	test.expectError("FOR i := 0 TO TRUE DO END"
				   , "'INTEGER' expression expected as 'TO' parameter, got 'BOOLEAN'");
	test.expectError("FOR i := 0 TO 10 BY n DO END"
				   , "constant expression expected as 'BY' parameter");
	test.expectError("FOR i := 0 TO 10 BY TRUE DO END"
				   , "'INTEGER' expression expected as 'BY' parameter, got 'BOOLEAN'");
	test.expectError("FOR i := 0 TO 10 DO - END"
				   , "END expected (FOR)");
},
"logical operators": function(){
	var test = setupWithContext(
		  Grammar.statement, "VAR b1, b2: BOOLEAN; i1: INTEGER;");

	test.parse("b1 := b1 OR b2");
	test.parse("b1 := b1 & b2");
	test.parse("b1 := ~b2");
	test.expectError("b1 := i1 OR b2", "BOOLEAN expected as operand of 'OR', got 'INTEGER'");
	test.expectError("b1 := b1 OR i1", "type mismatch: expected 'BOOLEAN', got 'INTEGER'");
	test.expectError("b1 := i1 & b2", "BOOLEAN expected as operand of '&', got 'INTEGER'");
	test.expectError("b1 := b1 & i1", "type mismatch: expected 'BOOLEAN', got 'INTEGER'");
	test.expectError("b1 := ~i1", "type mismatch: expected 'BOOLEAN', got 'INTEGER'");
},
"arithmetic operators": function(){
	var test = setupWithContext(
		  Grammar.statement, "VAR b1: BOOLEAN; i1, i2: INTEGER; r1, r2: REAL;");

	test.parse("i1 := i1 + i2");
	test.parse("i1 := i1 - i2");
	test.parse("i1 := i1 * i2");
	test.parse("i1 := i1 DIV i2");
	test.parse("i1 := i1 MOD i2");
	test.expectError("i1 := i1 / i2", "operator DIV expected for integer division");
	test.parse("r1 := r1 + r2");
	test.parse("r1 := r1 - r2");
	test.parse("r1 := r1 * r2");
	test.parse("r1 := r1 / r2");
},
"relations are BOOLEAN": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "TYPE Base = RECORD END; Derived = RECORD (Base) END;"
		+ "VAR pBase: POINTER TO Base; proc1, proc2: PROCEDURE;"
			+ "set1, set2: SET;"
			+ "b: BOOLEAN; i1, i2: INTEGER; r1, r2: REAL; c1, c2: CHAR; ca1, ca2: ARRAY 10 OF CHAR;");

	test.parse("b := pBase IS Derived");
	test.parse("b := pBase = pBase");
	test.parse("b := proc1 # proc2");
	test.parse("b := set1 <= set2");
	test.parse("b := i1 IN set2");
	test.parse("b := i1 < i2");
	test.parse("IF i1 > i2 THEN END");
	test.parse("b := c1 > c2");
	test.parse("b := ca1 <= ca2");
	test.parse("b := r1 >= r2");
},
"SET relations": function(){
	var test = setupWithContext(
		  Grammar.expression
		, "VAR set1, set2: SET; b: BOOLEAN; i: INTEGER;");

	test.parse("set1 <= set2");
	test.parse("set1 >= set2");
	test.parse("set1 = set2");
	test.parse("set1 # set2");
	test.parse("i IN set1");

	test.expectError("set1 <= i", "type mismatch: expected 'SET', got 'INTEGER'");
	test.expectError("b IN set1", "'INTEGER' expected as an element of SET, got 'BOOLEAN'");
	test.expectError("i IN b", "type mismatch: expected 'SET', got 'BOOLEAN'");
},
"SET operators": function(){
	var test = setupWithContext(
		  Grammar.expression
		, "VAR set1, set2: SET; b: BOOLEAN; i: INTEGER;");

	test.parse("set1 + set2");
	test.parse("set1 - set2");
	test.parse("set1 * set2");
	test.parse("set1 / set2");
	test.parse("-set1");

	test.expectError("set1 + i", "type mismatch: expected 'SET', got 'INTEGER'");
	test.expectError("set1 - b", "type mismatch: expected 'SET', got 'BOOLEAN'");
	test.expectError("set1 * b", "type mismatch: expected 'SET', got 'BOOLEAN'");
	test.expectError("set1 / b", "type mismatch: expected 'SET', got 'BOOLEAN'");
},
"SET functions": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "VAR set1, set2: SET; b: BOOLEAN; i: INTEGER;");

	test.parse("INCL(set1, i)");
	test.parse("EXCL(set1, i)");
	test.expectError("INCL({}, i)", "expression cannot be used as VAR parameter");
},
"procedure body": function(){
	var test = setup(Grammar.procedureBody);
	test.parse("END");
	test.parse("VAR END");
	test.parse("VAR i: INTEGER; END");
	test.parse("VAR a: ARRAY 10 OF INTEGER; END");
	test.expectError("VAR i: INTEGER;", "END expected (PROCEDURE)");
    test.expectError("VAR i: INTEGER; i := 1; END", "END expected (PROCEDURE)");
	test.parse("VAR i: INTEGER; BEGIN i := 1 END");
	test.parse("VAR b: BOOLEAN; BEGIN b := TRUE END");
	test.expectError("VAR i: INTEGER; BEGIN j := 1 END", "undeclared identifier: 'j'");
	test.expectError("VAR i: INTEGER; BEGIN i.field := 1 END",
					 "cannot designate 'INTEGER'");
	test.expectError("VAR i: INTEGER; BEGIN i := j END", "undeclared identifier: 'j'");
	test.parse("VAR i, j: INTEGER; BEGIN i := 1; j := 2; i := 1 + i + j - 2 END");
	test.expectError("TYPE T = RECORD field: INTEGER END; VAR v: T; BEGIN v := 1 END"
				   , "type mismatch: 'v' is 'T' and cannot be assigned to 'INTEGER' expression");
	test.expectError("TYPE T = RECORD field: INTEGER END; VAR v: T; BEGIN v.unknown := 1 END"
				   , "Type 'T' has no 'unknown' field");
	test.parse("TYPE T = RECORD field: INTEGER END; VAR v: T; BEGIN v.field := 1 END");
	test.parse("TYPE T1 = RECORD field: INTEGER END; T2 = RECORD field: T1 END; VAR v1: T1; v2: T2; BEGIN v1.field := v2.field.field END");
	test.parse("TYPE T1 = RECORD field1: INTEGER END; T2 = RECORD (T1) field2: INTEGER END; VAR v: T2; BEGIN v.field2 := v.field1 END");
	test.expectError("TYPE T1 = RECORD field1: INTEGER END; T2 = RECORD (T1) field1: INTEGER END; END"
			       , "base record already has field: 'field1'");
},
"procedure heading": function(){
	function makeContext(cx){return new Context.ProcDecl(new Context.Context(cx));}
	var test = setup(Grammar.procedureHeading, makeContext);

	test.parse("PROCEDURE p");
	test.parse("PROCEDURE p(a1: INTEGER)");
	test.parse("PROCEDURE p(a1, a2: INTEGER; b1: BOOLEAN)");
	test.expectError("PROCEDURE p(a1: INTEGER; a1: BOOLEAN)", "'a1' already declared");
	test.expectError("PROCEDURE p(p: INTEGER)", "argument 'p' has the same name as procedure");
},
procedure: function(){
	var test = setupWithContext(Grammar.procedureDeclaration
							  , "TYPE ProcType = PROCEDURE(): ProcType;");
	test.parse("PROCEDURE p; END p");
	test.expectError("PROCEDURE p; END", "not parsed");
	test.expectError("PROCEDURE p1; END p2"
				   , "mismatched procedure names: 'p1' at the begining and 'p2' at the end");
	test.parse("PROCEDURE p; VAR i: INTEGER; BEGIN i := i + 1 END p");
	test.parse("PROCEDURE p(a: INTEGER); BEGIN a := a + 1 END p");
	test.expectError("PROCEDURE p(a: INTEGER); VAR a: INTEGER END p", "'a' already declared");
	test.parse("PROCEDURE p; BEGIN p() END p");
	test.expectError("PROCEDURE p(a: INTEGER); BEGIN p() END p", "1 argument(s) expected, got 0");
	test.expectError("PROCEDURE p(a: INTEGER); BEGIN p(1, 2) END p", "1 argument(s) expected, got 2");
	test.parse("PROCEDURE p(a: INTEGER); BEGIN p(a) END p");
	test.parse("PROCEDURE p(a: INTEGER; b: BOOLEAN); BEGIN p(a, b) END p");
	test.expectError("PROCEDURE p(a: INTEGER; b: BOOLEAN); BEGIN p(b, a) END p"
				   , "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'");
	test.expectError("PROCEDURE p; BEGIN p1() END p", "undeclared identifier: 'p1'");

	test.parse("PROCEDURE p(): ProcType; RETURN p END p");
},
"procedure RETURN": function(){
	var test = setupWithContext(Grammar.procedureDeclaration
							  , "VAR i: INTEGER; PROCEDURE int(): INTEGER; RETURN 1 END int;");
	test.parse("PROCEDURE p(): BOOLEAN; RETURN TRUE END p");
	test.parse("PROCEDURE p(): BOOLEAN; RETURN int() = 1 END p");
	test.expectError("PROCEDURE p; RETURN TRUE END p"
				   , "unexpected RETURN in PROCEDURE declared with no result type");
	test.expectError("PROCEDURE p(): BOOLEAN; END p", "RETURN expected at the end of PROCEDURE declared with 'BOOLEAN' result type");
	test.expectError("PROCEDURE p(): undeclared; END p", "undeclared identifier: 'undeclared'");
	test.expectError("PROCEDURE p(): i; END p", "type name expected");
	test.expectError("PROCEDURE p(): INTEGER; RETURN TRUE END p"
				   , "RETURN 'INTEGER' expected, got 'BOOLEAN'");
},
"pass VAR argument as VAR parameter": function(){
	var test = setupWithContext(Grammar.procedureDeclaration,
								"PROCEDURE p1(VAR i: INTEGER); END p1;"
								+ "PROCEDURE p2(VAR b: BOOLEAN); END p2;"
								);
	test.parse("PROCEDURE p(VAR i1: INTEGER); BEGIN p1(i1) END p");
	test.expectError("PROCEDURE p(VAR b: BOOLEAN); BEGIN p2(~b) END p", "expression cannot be used as VAR parameter");
},
"VAR parameter": function(){
	var test = setupWithContext(Grammar.statement
							  , "CONST c = 123;"
							  + "VAR i1: INTEGER; b1: BOOLEAN; a1: ARRAY 5 OF INTEGER;"
							    + "r1: RECORD f1: INTEGER END;"
							  + "PROCEDURE p1(VAR i: INTEGER); END p1;"
							  + "PROCEDURE p2(VAR b: BOOLEAN); END p2;"
							  );
	test.parse("p1(i1)");
	test.parse("p1(a1[0])");
	test.parse("p1(r1.f1)");
	test.expectError("p1(c)", "constant cannot be used as VAR parameter");
	test.expectError("p1(123)", "expression cannot be used as VAR parameter");
	test.expectError("p2(TRUE)", "expression cannot be used as VAR parameter");
	test.expectError("p1(i1 + i1)", "expression cannot be used as VAR parameter");
	test.expectError("p1(i1 * i1)", "expression cannot be used as VAR parameter");
	test.expectError("p1(+i1)", "expression cannot be used as VAR parameter");
	test.expectError("p1(-i1)", "expression cannot be used as VAR parameter");
	test.expectError("p2(~b1)", "expression cannot be used as VAR parameter");
},
"ARRAY parameter": function(){
	var test = setupWithContext(Grammar.procedureDeclaration
							  , "TYPE T = RECORD i: INTEGER; p: POINTER TO T END;"
							  + "PROCEDURE p1(i: INTEGER); END p1;"
							  + "PROCEDURE varInteger(VAR i: INTEGER); END varInteger;"
							  + "PROCEDURE p2(a: ARRAY OF INTEGER); END p2;"
							  + "PROCEDURE p3(VAR a: ARRAY OF INTEGER); END p3;"
							  );
	test.parse("PROCEDURE p(a: ARRAY OF INTEGER); END p");
	test.parse("PROCEDURE p(a: ARRAY OF ARRAY OF INTEGER); END p");
	test.parse("PROCEDURE p(a: ARRAY OF ARRAY OF INTEGER); BEGIN p1(a[0][0]) END p");
	test.parse("PROCEDURE p(a: ARRAY OF INTEGER); BEGIN p2(a) END p");
	test.parse("PROCEDURE p(a: ARRAY OF T); BEGIN varInteger(a[0].p.i) END p");
	test.expectError("PROCEDURE p(a: ARRAY OF INTEGER); BEGIN a[0] := 0 END p",
					 "cannot assign to read-only variable");
	test.expectError("PROCEDURE p(a: ARRAY OF INTEGER); BEGIN p3(a) END p",
					 "read-only variable cannot be used as VAR parameter");
	test.expectError("PROCEDURE p(a: ARRAY OF T); BEGIN a[0].i := 0 END p",
					 "cannot assign to read-only variable");
	test.expectError("PROCEDURE p(a: ARRAY OF T); BEGIN varInteger(a[0].i) END p",
					 "read-only variable cannot be used as VAR parameter");
},
"procedure call": function(){
	var test = setupWithContext(Grammar.statement
							  , "TYPE ProcType = PROCEDURE;"
							  + "VAR notProcedure: INTEGER;"
							  + "PROCEDURE p; END p;"
							  + "PROCEDURE p1(i: INTEGER); END p1;"
							  + "PROCEDURE p2(i: INTEGER; b: BOOLEAN); END p2;"
							  + "PROCEDURE p3(): ProcType; RETURN p END p3;"
							   );
	test.parse("p");
	test.parse("p()");

	test.parse("p1(1)");
	test.parse("p1(1 + 2)");

	test.parse("p2(1, TRUE)");
	test.expectError("notProcedure", "PROCEDURE expected, got 'INTEGER'");
	test.expectError("p2(TRUE, 1)", "type mismatch for argument 1: 'BOOLEAN' cannot be converted to 'INTEGER'");
	test.expectError("p2(1, 1)", "type mismatch for argument 2: 'INTEGER' cannot be converted to 'BOOLEAN'");
	test.expectError("p3()()", "not parsed");
},
"procedure assignment": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "TYPE ProcType1 = PROCEDURE(): ProcType1;"
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
		+ "PROCEDURE p1(): ProcType1; RETURN p1 END p1;"
		);
	test.parse("v1 := v2");
	test.parse("v5 := v6");
	test.parse("v7 := v8");
	test.parse("v7 := v9");
	test.parse("v8 := v9");
	test.parse("v1 := p1");
	test.expectError("p1 := v1", "cannot assign to procedure" );
	test.expectError(
		  "v3 := v1"
		, "type mismatch: 'v3' is 'PROCEDURE(INTEGER): ProcType1' and cannot be assigned to 'ProcType1' expression");
	test.expectError(
		  "v3 := v4"
		, "type mismatch: 'v3' is 'PROCEDURE(INTEGER): ProcType1' and cannot be assigned to 'PROCEDURE(BOOLEAN): ProcType1' expression");
	test.expectError(
		  "v10 := NEW"
		, "type mismatch: 'v10' is 'ProcType6' and cannot be assigned to 'predefined procedure NEW' expression");
	test.expectError("v10 := v11", "type mismatch: 'v10' is 'ProcType6' and cannot be assigned to 'ProcType7' expression" );
	test.expectError("v8 := v8VAR", "type mismatch: 'v8' is 'ProcType4' and cannot be assigned to 'ProcType4VAR' expression" );
},
"string assignment": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "VAR a1: ARRAY 3 OF CHAR;"
			+ "ch1: CHAR;"
			+ "intArray: ARRAY 10 OF INTEGER;"
		);
	test.parse("a1 := \"abc\"");
	test.parse("a1 := \"ab\"");
	test.parse("a1 := \"a\"");
	test.parse("a1 := 22X");
	test.parse("ch1 := \"A\"");
	test.parse("ch1 := 22X");
	test.expectError("a1 := \"abcd\"", "3-character ARRAY is too small for 4-character string");
	test.expectError("intArray := \"abcd\""
				   , "type mismatch: 'intArray' is 'ARRAY OF INTEGER' and cannot be assigned to 'multi-character string' expression");
},
"array assignment": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "VAR charArray: ARRAY 3 OF CHAR;"
			+ "intArray: ARRAY 10 OF INTEGER;"
			+ "intArray2: ARRAY 10 OF INTEGER;"
			+ "intArray3: ARRAY 5 OF INTEGER;"
		);
	test.parse("intArray := intArray2");
	test.expectError("intArray := charArray"
				   , "type mismatch: 'intArray' is 'ARRAY OF INTEGER' and cannot be assigned to 'ARRAY OF CHAR' expression");
	test.expectError("intArray2 := intArray3"
				   , "array size mismatch: 'intArray2' has size 10 and cannot be assigned to the array with size 5");
	test.expectError("intArray3 := charArray"
				   , "type mismatch: 'intArray3' is 'ARRAY OF INTEGER' and cannot be assigned to 'ARRAY OF CHAR' expression");
},
"record assignment": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "TYPE Base1 = RECORD END;"
			+ "T1 = RECORD (Base1) END;"
			+ "T2 = RECORD END;"
		+ "VAR b1: Base1; r1: T1; r2: T2;"
		);
	test.parse("r1 := r1");
	test.parse("b1 := r1");
	test.expectError("r1 := r2", "type mismatch: 'r1' is 'T1' and cannot be assigned to 'T2' expression");
	test.expectError("r1 := b1", "type mismatch: 'r1' is 'T1' and cannot be assigned to 'Base1' expression");
},
"open array assignment fails": function(){
	var test = setup(Grammar.procedureDeclaration);
	test.expectError("PROCEDURE p(s1, s2: ARRAY OF CHAR); BEGIN s1 := s2 END p"
				   , "cannot assign to read-only variable");
	test.expectError("PROCEDURE p(VAR s1, s2: ARRAY OF CHAR); BEGIN s1 := s2 END p"
				   , "'s1' is open 'ARRAY OF CHAR' and cannot be assigned");
	test.expectError("PROCEDURE p(s1: ARRAY OF CHAR); VAR s2: ARRAY 10 OF CHAR; BEGIN s2 := s1 END p"
				   , "'s2' cannot be assigned to open 'ARRAY OF CHAR'");
},
"string assignment to open array fails": function(){
	var test = setup(Grammar.procedureDeclaration);
	test.expectError("PROCEDURE p(s: ARRAY OF CHAR); BEGIN s := \"abc\" END p", "cannot assign to read-only variable");
	test.expectError("PROCEDURE p(VAR s: ARRAY OF CHAR); BEGIN s := \"abc\" END p", "string cannot be assigned to open ARRAY OF CHAR");
},
"string argument": function(){
	var test = setupWithContext(
		  Grammar.statement
		, "PROCEDURE p1(s: ARRAY OF CHAR); END p1;"
		+ "PROCEDURE p2(VAR s: ARRAY OF CHAR); END p2;"
		+ "PROCEDURE p3(i: INTEGER); END p3;"
		+ "PROCEDURE p4(a: ARRAY OF INTEGER); END p4;"
		);
	test.parse("p1(\"abc\")");
	test.expectError("p2(\"abc\")", "expression cannot be used as VAR parameter");
	test.expectError("p3(\"abc\")", "type mismatch for argument 1: 'multi-character string' cannot be converted to 'INTEGER'");
	test.expectError("p4(\"abc\")", "type mismatch for argument 1: 'multi-character string' cannot be converted to 'ARRAY OF INTEGER'");
},
"scope": function(){
	var test = setup(Grammar.declarationSequence);
	test.parse("PROCEDURE p1(a1: INTEGER); END p1; PROCEDURE p2(a1: BOOLEAN); END p2;");
},
module: function(){
	var test = setup(Grammar.module);
	test.parse("MODULE m; END m.");
	test.expectError("MODULE m; END undeclared.",
					 "original module name 'm' expected, got 'undeclared'");
    test.expectError("MODULE m; BEGIN - END m.", "END expected (MODULE)");
},
assert: function(){
	var test = setup(Grammar.statement);
	test.parse("ASSERT(TRUE)");
	test.parse("ASSERT(TRUE, 123)");
	test.expectError("ASSERT()", "1 or 2 arguments expected, got 0");
	test.expectError("ASSERT(123, TRUE)", "type mismatch for argument 1: 'INTEGER' cannot be converted to 'BOOLEAN'");
},
IMPORT: function(){
	var test = setup(Grammar.module);
	test.parse("MODULE m; IMPORT JS; END m.");
	test.parse("MODULE m; IMPORT JS; BEGIN JS.alert(\"test\") END m.");
	test.parse("MODULE m; IMPORT JS; BEGIN JS.console.info(123) END m.");
	test.expectError("MODULE m; IMPORT unknown; END m.", "module(s) not found: unknown");
	test.expectError("MODULE m; IMPORT unknown1, unknown2; END m.", "module(s) not found: unknown1, unknown2");
	test.expectError("MODULE m; IMPORT u1 := unknown1, unknown2; END m.", "module(s) not found: unknown1, unknown2");
}};

Test.run(testSuite);
