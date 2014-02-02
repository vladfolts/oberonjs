var RTL$ = require("rtl.js");
var Cast = require("js/Cast.js");
var Code = require("js/Code.js");
var Context = require("js/Context.js");
var Errors = require("js/Errors.js");
var JsArray = require("js/JsArray.js");
var JsString = require("js/JsString.js");
var Object = require("js/Object.js");
var Operator = require("js/Operator.js");
var Precedence = require("js/CodePrecedence.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");
var Call = RTL$.extend({
	init: function Call(){
	}
});
var StdCall = Call.extend({
	init: function StdCall(){
		Call.prototype.init.call(this);
		this.args = null;
	}
});
var CallGenerator = RTL$.extend({
	init: function CallGenerator(){
		this.args = null;
		this.cx = null;
		this.call = null;
	}
});
var Impl = Types.Procedure.extend({
	init: function Impl(){
		Types.Procedure.prototype.init.call(this);
	}
});
var Type = Types.DefinedProcedure.extend({
	init: function Type(){
		Types.DefinedProcedure.prototype.init.call(this);
		this.mArgs = null;
		this.mResult = null;
	}
});
var Std = Impl.extend({
	init: function Std(){
		Impl.prototype.init.call(this);
		this.call = null;
	}
});
var ArgumentsCode = RTL$.extend({
	init: function ArgumentsCode(){
	}
});
var GenArgCode = ArgumentsCode.extend({
	init: function GenArgCode(){
		ArgumentsCode.prototype.init.call(this);
		this.code = null;
		this.cx = null;
	}
});
var predefined = null;

function checkArgument(actual/*PExpression*/, expected/*PProcedureArgument*/, pos/*INTEGER*/, code/*PArgumentsCode*/){
	var actualType = null;var expectType = null;
	var designator = null;
	var info = null;
	var result = null;
	expectType = expected.type;
	if (expectType != null){
		actualType = actual.type();
		result = Cast.implicit(actualType, expectType, Operator.castOperations());
		if (result == null){
			Errors.raise(JsString.concat(JsString.concat(JsString.concat(JsString.concat(JsString.concat(JsString.concat(JsString.make("type mismatch for argument "), JsString.fromInt(pos + 1 | 0)), JsString.make(": '")), actualType.description()), JsString.make("' cannot be converted to '")), expectType.description()), JsString.make("'")));
		}
		if (expected.isVar && expectType != actualType && Types.isInt(actualType)){
			Errors.raise(JsString.concat(JsString.concat(JsString.concat(JsString.concat(JsString.concat(JsString.concat(JsString.make("type mismatch for argument "), JsString.fromInt(pos + 1 | 0)), JsString.make(": cannot pass '")), actualType.description()), JsString.make("' as VAR parameter of type '")), expectType.description()), JsString.make("'")));
		}
	}
	if (expected.isVar){
		designator = actual.designator();
		if (designator == null){
			Errors.raise(JsString.make("expression cannot be used as VAR parameter"));
		}
		info = designator.info();
		if (info instanceof Types.Const){
			Errors.raise(JsString.make("constant cannot be used as VAR parameter"));
		}
		if (info instanceof Types.Variable && Types.isVariableReadOnly(RTL$.typeGuard(info, Types.Variable))){
			Errors.raise(JsString.concat(info.idType(), JsString.make(" cannot be used as VAR parameter")));
		}
	}
	if (code != null){
		code.write(actual, expected, result);
	}
}

function checkArgumentsType(actual/*Type*/, expected/*Type*/, code/*PArgumentsCode*/){
	var actualLen = 0;
	var i = 0;
	var actualExp = null;
	var expectedArg = null;
	actualLen = JsArray.len(actual);
	while (true){
		if (i < actualLen){
			actualExp = JsArray.at(actual, i);
			expectedArg = JsArray.at(expected, i);
			checkArgument(RTL$.typeGuard(actualExp, Code.Expression), RTL$.typeGuard(expectedArg, Types.ProcedureArgument), i, code);
			++i;
		} else break;
	}
}

function checkArgumentsCount(actual/*INTEGER*/, expected/*INTEGER*/){
	if (actual != expected){
		Errors.raise(JsString.concat(JsString.concat(JsString.fromInt(expected), JsString.make(" argument(s) expected, got ")), JsString.fromInt(actual)));
	}
}

function processArguments(actual/*Type*/, expected/*Type*/, code/*PArgumentsCode*/){
	checkArgumentsCount(JsArray.len(actual), JsArray.len(expected));
	checkArgumentsType(actual, expected, code);
}

function checkArguments(actual/*Type*/, expected/*Type*/){
	processArguments(actual, expected, null);
}

function makeStd(name/*Type*/, call/*PCall*/){
	var result = null;
	result = new Std();
	Types.initProcedure(result, name);
	result.call = call;
	return result;
}
CallGenerator.prototype.handleArgument = function(e/*PExpression*/){
	JsArray.add(this.args, e);
}
CallGenerator.prototype.end = function(){
	return this.call.make(this.args, this.cx);
}

function makeCallGenerator(call/*PCall*/, cx/*PType*/){
	var result = null;
	RTL$.assert(cx != null);
	result = new CallGenerator();
	result.args = JsArray.make();
	result.cx = cx;
	result.call = call;
	return result;
}
GenArgCode.prototype.write = function(actual/*PExpression*/, expected/*PProcedureArgument*/, cast/*PCastOp*/){
	var e = null;
	if (expected != null && expected.isVar){
		actual = Code.refExpression(actual);
	}
	else {
		actual = Code.derefExpression(actual);
	}
	if (JsString.len(this.code) != 0){
		this.code = JsString.concat(this.code, JsString.make(", "));
	}
	if (cast != null){
		e = cast.make(this.cx, actual);
	}
	else {
		e = actual;
	}
	this.code = JsString.concat(this.code, e.code());
}
GenArgCode.prototype.result = function(){
	return this.code;
}

function makeProcCallGeneratorWithCustomArgs(cx/*PType*/, id/*Type*/, type/*DefinedProcedure*/, argumentsCode/*PArgumentsCode*/){
	var CallImpl = Call.extend({
		init: function CallImpl(){
			Call.prototype.init.call(this);
			this.id = null;
			this.args = null;
			this.result = null;
			this.argumentsCode = null;
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var expectedArgs = null;
		var a = null;
		var i = 0;
		expectedArgs = this.args;
		if (expectedArgs != null){
			processArguments(args, expectedArgs, this.argumentsCode);
		}
		else {
			for (i = 0; i <= JsArray.len(args) - 1 | 0; ++i){
				a = JsArray.at(args, i);
				this.argumentsCode.write(RTL$.typeGuard(a, Code.Expression), null, null);
			}
		}
		return Code.makeSimpleExpression(JsString.concat(JsString.concat(JsString.concat(this.id, JsString.make("(")), this.argumentsCode.result()), JsString.make(")")), this.result);
	}
	call = new CallImpl();
	call.id = id;
	call.args = type.args();
	call.result = type.result();
	call.argumentsCode = argumentsCode;
	return makeCallGenerator(call, cx);
}

function makeArgumentsCode(cx/*PType*/){
	var result = null;
	result = new GenArgCode();
	result.code = JsString.makeEmpty();
	result.cx = cx;
	return result;
}

function makeProcCallGenerator(cx/*PType*/, id/*Type*/, type/*DefinedProcedure*/){
	return makeProcCallGeneratorWithCustomArgs(cx, id, type, makeArgumentsCode(cx));
}
Std.prototype.description = function(){
	return JsString.concat(JsString.make("standard procedure "), Types.typeName(this));
}
Std.prototype.callGenerator = function(cx/*PType*/){
	return makeCallGenerator(this.call, cx);
}

function makeSymbol(p/*PProcedure*/){
	return Symbols.makeSymbol(p.name, Types.makeProcedure(p));
}

function nthArgument(args/*Type*/, i/*INTEGER*/){
	var arg = null;
	arg = JsArray.at(args, i);
	return RTL$.typeGuard(arg, Code.Expression);
}

function initStdCall(call/*PStdCall*/){
	call.args = JsArray.make();
}

function hasArgument(call/*PStdCall*/, type/*PType*/){
	var a = null;
	a = new Types.ProcedureArgument();
	a.type = type;
	JsArray.add(call.args, a);
}

function hasVarArgument(call/*PStdCall*/, type/*PType*/){
	var a = null;
	a = new Types.ProcedureArgument();
	a.isVar = true;
	a.type = type;
	JsArray.add(call.args, a);
}

function hasArgumentWithCustomType(call/*PStdCall*/){
	var a = null;
	a = new Types.ProcedureArgument();
	JsArray.add(call.args, a);
}

function hasVarArgumnetWithCustomType(call/*PStdCall*/){
	var a = null;
	a = new Types.ProcedureArgument();
	a.isVar = true;
	JsArray.add(call.args, a);
}

function checkSingleArgument(actual/*Type*/, expected/*Type*/){
	RTL$.assert(JsArray.len(expected) == 1);
	checkArguments(actual, expected);
	RTL$.assert(JsArray.len(actual) == 1);
	return nthArgument(actual, 0);
}

function makeNew(){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var arg = null;
		var argType = null;
		var baseType = null;
		arg = checkSingleArgument(args, this.args);
		argType = arg.type();
		if (!(argType instanceof Types.Pointer)){
			Errors.raise(JsString.concat(JsString.concat(JsString.make("POINTER variable expected, got '"), argType.description()), JsString.make("'")));
		}
		baseType = Types.pointerBase(RTL$.typeGuard(argType, Types.Pointer));
		if (baseType instanceof Types.NonExportedRecord){
			Errors.raise(JsString.make("non-exported RECORD type cannot be used in NEW"));
		}
		return Code.makeSimpleExpression(JsString.concat(JsString.concat(arg.code(), JsString.make(" = ")), baseType.initializer(cx)), null);
	}
	call = new CallImpl();
	initStdCall(call);
	hasVarArgumnetWithCustomType(call);
	return makeSymbol(makeStd(JsString.make("NEW"), call));
}

function makeLen(){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var arg = null;
		var argType = null;
		arg = checkSingleArgument(args, this.args);
		argType = arg.type();
		if (!(argType instanceof Types.Array) && !(argType instanceof Types.String)){
			Errors.raise(JsString.concat(JsString.concat(JsString.make("ARRAY or string is expected as an argument of LEN, got '"), argType.description()), JsString.make("'")));
		}
		return Code.makeSimpleExpression(JsString.concat(arg.code(), JsString.make(".length")), Types.basic().integer);
	}
	call = new CallImpl();
	initStdCall(call);
	hasArgumentWithCustomType(call);
	return makeSymbol(makeStd(JsString.make("LEN"), call));
}

function makeOdd(){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var arg = null;
		var code = null;
		var constValue = null;
		arg = checkSingleArgument(args, this.args);
		code = Code.adjustPrecedence(arg, Precedence.bitAnd);
		constValue = arg.constValue();
		if (constValue != null){
			constValue = Code.makeIntConst(RTL$.typeGuard(constValue, Code.IntConst).value & 1 ? 1 : 0);
		}
		return Code.makeExpressionWithPrecedence(JsString.concat(code, JsString.make(" & 1")), Types.basic().bool, null, constValue, Precedence.bitAnd);
	}
	call = new CallImpl();
	initStdCall(call);
	hasArgument(call, Types.basic().integer);
	return makeSymbol(makeStd(JsString.make("ODD"), call));
}

function makeAssert(){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var arg = null;
		var rtl = null;
		arg = checkSingleArgument(args, this.args);
		rtl = cx.rtl();
		return Code.makeSimpleExpression(JsString.concat(JsString.concat(JsString.concat(rtl.assertId(), JsString.make("(")), arg.code()), JsString.make(")")), null);
	}
	call = new CallImpl();
	initStdCall(call);
	hasArgument(call, Types.basic().bool);
	return makeSymbol(makeStd(JsString.make("ASSERT"), call));
}

function setBitImpl(name/*ARRAY OF CHAR*/, bitOp/*BinaryOpStr*/){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
			this.name = null;
			this.bitOp = null;
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var x = null;var y = null;
		var yValue = 0;
		var value = null;
		var valueCodeExp = null;
		var valueCode = null;
		var comment = null;
		checkArguments(args, this.args);
		RTL$.assert(JsArray.len(args) == 2);
		x = nthArgument(args, 0);
		y = nthArgument(args, 1);
		value = y.constValue();
		if (value == null){
			valueCodeExp = Operator.lsl(Code.makeExpression(JsString.make("1"), Types.basic().integer, null, Code.makeIntConst(1)), y, cx);
			valueCode = valueCodeExp.code();
		}
		else {
			yValue = RTL$.typeGuard(value, Code.IntConst).value;
			if (yValue < 0 || yValue > 31){
				Errors.raise(JsString.concat(JsString.concat(JsString.concat(JsString.make("value (0..31) expected as a second argument of "), this.name), JsString.make(", got ")), JsString.fromInt(yValue)));
			}
			comment = JsString.make("bit: ");
			if (y.isTerm()){
				comment = JsString.concat(comment, JsString.fromInt(yValue));
			}
			else {
				comment = JsString.concat(comment, Code.adjustPrecedence(y, Precedence.shift));
			}
			yValue = 1 << yValue;
			valueCode = JsString.concat(JsString.concat(JsString.concat(JsString.fromInt(yValue), JsString.make("/*")), comment), JsString.make("*/"));
		}
		return Code.makeSimpleExpression(this.bitOp(Code.adjustPrecedence(x, Precedence.assignment), valueCode), null);
	}
	call = new CallImpl();
	initStdCall(call);
	call.name = JsString.make(name);
	call.bitOp = bitOp;
	hasVarArgument(call, Types.basic().set);
	hasArgument(call, Types.basic().integer);
	return makeSymbol(makeStd(call.name, call));
}

function checkVariableArgumentsCount(min/*INTEGER*/, max/*INTEGER*/, actual/*Type*/){
	var len = 0;
	len = JsArray.len(actual);
	if (len < min){
		Errors.raise(JsString.concat(JsString.concat(JsString.concat(JsString.make("at least "), JsString.fromInt(min)), JsString.make(" argument expected, got ")), JsString.fromInt(len)));
	}
	else if (len > max){
		Errors.raise(JsString.concat(JsString.concat(JsString.concat(JsString.make("at most "), JsString.fromInt(max)), JsString.make(" arguments expected, got ")), JsString.fromInt(len)));
	}
}

function incImpl(name/*ARRAY OF CHAR*/, unary/*ARRAY OF CHAR*/, incOp/*BinaryOpStr*/){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
			this.name = null;
			this.unary = null;
			this.incOp = null;
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var x = null;var y = null;
		var code = null;
		var value = null;
		var valueCode = null;
		checkVariableArgumentsCount(1, 2, args);
		checkArgumentsType(args, this.args, null);
		x = nthArgument(args, 0);
		if (JsArray.len(args) == 1){
			code = JsString.concat(this.unary, x.code());
		}
		else {
			y = nthArgument(args, 1);
			value = y.constValue();
			if (value == null){
				valueCode = y.code();
			}
			else {
				valueCode = JsString.fromInt(RTL$.typeGuard(value, Code.IntConst).value);
				if (!y.isTerm()){
					valueCode = JsString.concat(JsString.concat(JsString.concat(valueCode, JsString.make("/*")), y.code()), JsString.make("*/"));
				}
			}
			code = this.incOp(x.code(), valueCode);
		}
		return Code.makeSimpleExpression(code, null);
	}
	call = new CallImpl();
	initStdCall(call);
	call.name = JsString.make(name);
	call.unary = JsString.make(unary);
	call.incOp = incOp;
	hasVarArgument(call, Types.basic().integer);
	hasArgument(call, Types.basic().integer);
	return makeSymbol(makeStd(call.name, call));
}

function inclOp(x/*Type*/, y/*Type*/){
	return JsString.concat(JsString.concat(x, JsString.make(" |= ")), y);
}

function exclOp(x/*Type*/, y/*Type*/){
	return JsString.concat(JsString.concat(JsString.concat(x, JsString.make(" &= ~(")), y), JsString.make(")"));
}

function incOp(x/*Type*/, y/*Type*/){
	return JsString.concat(JsString.concat(x, JsString.make(" += ")), y);
}

function decOp(x/*Type*/, y/*Type*/){
	return JsString.concat(JsString.concat(x, JsString.make(" -= ")), y);
}

function makeAbs(){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var arg = null;
		var argType = null;
		arg = checkSingleArgument(args, this.args);
		argType = arg.type();
		if (!JsArray.contains(Types.numeric(), argType)){
			Errors.raise(JsString.concat(JsString.concat(JsString.make("type mismatch: expected numeric type, got '"), argType.description()), JsString.make("'")));
		}
		return Code.makeSimpleExpression(JsString.concat(JsString.concat(JsString.make("Math.abs("), arg.code()), JsString.make(")")), argType);
	}
	call = new CallImpl();
	initStdCall(call);
	hasArgumentWithCustomType(call);
	return makeSymbol(makeStd(JsString.make("ABS"), call));
}

function makeFloor(){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var arg = null;
		arg = checkSingleArgument(args, this.args);
		return Code.makeSimpleExpression(JsString.concat(JsString.concat(JsString.make("Math.floor("), arg.code()), JsString.make(")")), Types.basic().integer);
	}
	call = new CallImpl();
	initStdCall(call);
	hasArgument(call, Types.basic().real);
	return makeSymbol(makeStd(JsString.make("FLOOR"), call));
}

function makeFlt(){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var arg = null;
		var value = null;
		arg = checkSingleArgument(args, this.args);
		value = arg.constValue();
		if (value != null){
			value = Code.makeRealConst(RTL$.typeGuard(value, Code.IntConst).value);
		}
		return Code.makeExpressionWithPrecedence(arg.code(), Types.basic().real, null, value, arg.maxPrecedence());
	}
	call = new CallImpl();
	initStdCall(call);
	hasArgument(call, Types.basic().integer);
	return makeSymbol(makeStd(JsString.make("FLT"), call));
}

function bitShiftImpl(name/*ARRAY OF CHAR*/, op/*BinaryOp*/){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
			this.name = null;
			this.op = null;
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var x = null;var y = null;
		checkArguments(args, this.args);
		RTL$.assert(JsArray.len(args) == 2);
		x = nthArgument(args, 0);
		y = nthArgument(args, 1);
		return this.op(x, y, cx);
	}
	call = new CallImpl();
	initStdCall(call);
	call.name = JsString.make(name);
	call.op = op;
	hasArgument(call, Types.basic().integer);
	hasArgument(call, Types.basic().integer);
	return makeSymbol(makeStd(call.name, call));
}

function makeOrd(){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var arg = null;
		var argType = null;
		var value = null;
		var code = null;
		var ch = 0;
		var result = null;
		arg = checkSingleArgument(args, this.args);
		argType = arg.type();
		if (argType == Types.basic().ch || argType == Types.basic().set){
			value = arg.constValue();
			if (value != null && argType == Types.basic().set){
				value = Code.makeIntConst(RTL$.typeGuard(value, Code.SetConst).value);
			}
			result = Code.makeExpression(arg.code(), Types.basic().integer, null, value);
		}
		else if (argType == Types.basic().bool){
			code = JsString.concat(Code.adjustPrecedence(arg, Precedence.conditional), JsString.make(" ? 1 : 0"));
			result = Code.makeExpressionWithPrecedence(code, Types.basic().integer, null, arg.constValue(), Precedence.conditional);
		}
		else if (argType instanceof Types.String && Types.stringAsChar(RTL$.typeGuard(argType, Types.String), {set: function($v){ch = $v;}, get: function(){return ch;}})){
			result = Code.makeExpression(JsString.fromInt(ch), Types.basic().integer, null, Code.makeIntConst(ch));
		}
		else {
			Errors.raise(JsString.concat(JsString.concat(JsString.make("ORD function expects CHAR or BOOLEAN or SET as an argument, got '"), argType.description()), JsString.make("'")));
		}
		return result;
	}
	call = new CallImpl();
	initStdCall(call);
	hasArgumentWithCustomType(call);
	return makeSymbol(makeStd(JsString.make("ORD"), call));
}

function makeChr(){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var arg = null;
		arg = checkSingleArgument(args, this.args);
		return Code.makeSimpleExpression(arg.code(), Types.basic().ch);
	}
	call = new CallImpl();
	initStdCall(call);
	hasArgument(call, Types.basic().integer);
	return makeSymbol(makeStd(JsString.make("CHR"), call));
}

function makePack(){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var x = null;var y = null;
		checkArguments(args, this.args);
		x = nthArgument(args, 0);
		y = nthArgument(args, 1);
		return Code.makeSimpleExpression(Operator.mulInplace(x, Operator.pow2(y), cx), null);
	}
	call = new CallImpl();
	initStdCall(call);
	hasVarArgument(call, Types.basic().real);
	hasArgument(call, Types.basic().integer);
	return makeSymbol(makeStd(JsString.make("PACK"), call));
}

function makeUnpk(){
	var CallImpl = StdCall.extend({
		init: function CallImpl(){
			StdCall.prototype.init.call(this);
		}
	});
	var call = null;
	CallImpl.prototype.make = function(args/*Type*/, cx/*Type*/){
		var x = null;var y = null;
		checkArguments(args, this.args);
		x = nthArgument(args, 0);
		y = nthArgument(args, 1);
		return Code.makeSimpleExpression(JsString.concat(JsString.concat(Operator.assign(y, Operator.log2(x), cx), JsString.make("; ")), Operator.divInplace(x, Operator.pow2(y), cx)), null);
	}
	call = new CallImpl();
	initStdCall(call);
	hasVarArgument(call, Types.basic().real);
	hasVarArgument(call, Types.basic().integer);
	return makeSymbol(makeStd(JsString.make("UNPK"), call));
}

function dumpProcArgs(proc/*Type*/){
	var result = null;
	var len = 0;
	var i = 0;
	var arg = null;
	len = JsArray.len(proc.mArgs);
	if (len == 0){
		if (proc.mResult != null){
			result = JsString.make("()");
		}
		else {
			result = JsString.makeEmpty();
		}
	}
	else {
		result = JsString.make("(");
		for (i = 0; i <= len - 1 | 0; ++i){
			if (i != 0){
				result = JsString.concat(result, JsString.make(", "));
			}
			arg = JsArray.at(proc.mArgs, i);
			result = JsString.concat(result, RTL$.typeGuard(arg, Types.ProcedureArgument).type.description());
		}
		result = JsString.concat(result, JsString.make(")"));
	}
	return result;
}
Type.prototype.description = function(){
	var result = null;
	result = Types.typeName(this);
	if (result == null){
		result = JsString.concat(JsString.make("PROCEDURE"), dumpProcArgs(this));
		if (this.mResult != null){
			result = JsString.concat(JsString.concat(result, JsString.make(": ")), this.mResult.description());
		}
	}
	return result;
}
Type.prototype.callGenerator = function(cx/*PType*/, id/*Type*/){
	return makeProcCallGenerator(cx, id, this);
}
Type.prototype.define = function(args/*Type*/, result/*PType*/){
	this.mArgs = args;
	this.mResult = result;
}
Type.prototype.args = function(){
	return this.mArgs;
}
Type.prototype.result = function(){
	return this.mResult;
}

function make(name/*Type*/){
	var result = null;
	result = new Type();
	result.name = name;
	return result;
}
predefined = JsArray.make();
JsArray.add(predefined, makeNew());
JsArray.add(predefined, makeLen());
JsArray.add(predefined, makeOdd());
JsArray.add(predefined, makeAssert());
JsArray.add(predefined, setBitImpl("INCL", inclOp));
JsArray.add(predefined, setBitImpl("EXCL", exclOp));
JsArray.add(predefined, incImpl("INC", "++", incOp));
JsArray.add(predefined, incImpl("DEC", "--", decOp));
JsArray.add(predefined, makeAbs());
JsArray.add(predefined, makeFloor());
JsArray.add(predefined, makeFlt());
JsArray.add(predefined, bitShiftImpl("LSL", Operator.lsl));
JsArray.add(predefined, bitShiftImpl("ASR", Operator.asr));
JsArray.add(predefined, bitShiftImpl("ROR", Operator.ror));
JsArray.add(predefined, makeOrd());
JsArray.add(predefined, makeChr());
JsArray.add(predefined, makePack());
JsArray.add(predefined, makeUnpk());
exports.Call = Call;
exports.CallGenerator = CallGenerator;
exports.Type = Type;
exports.Std = Std;
exports.predefined = function(){return predefined;};
exports.checkArgumentsCount = checkArgumentsCount;
exports.makeCallGenerator = makeCallGenerator;
exports.makeProcCallGeneratorWithCustomArgs = makeProcCallGeneratorWithCustomArgs;
exports.makeArgumentsCode = makeArgumentsCode;
exports.makeProcCallGenerator = makeProcCallGenerator;
exports.make = make;
