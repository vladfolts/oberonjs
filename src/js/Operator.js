var RTL$ = require("rtl.js");
var Cast = require("js/Cast.js");
var Code = require("js/Code.js");
var Context = require("js/Context.js");
var Errors = require("js/Errors.js");
var JsString = require("js/JsString.js");
var Precedence = require("js/CodePrecedence.js");
var Types = require("js/Types.js");
var CodeMaker = RTL$.extend({
	init: function CodeMaker(){
	}
});
var SimpleCodeMaker = CodeMaker.extend({
	init: function SimpleCodeMaker(){
		CodeMaker.prototype.init.call(this);
		this.code = null;
	}
});
var IntCodeMaker = SimpleCodeMaker.extend({
	init: function IntCodeMaker(){
		SimpleCodeMaker.prototype.init.call(this);
	}
});
var PredCodeMaker = CodeMaker.extend({
	init: function PredCodeMaker(){
		CodeMaker.prototype.init.call(this);
		this.pred = null;
	}
});
var CastToUint8 = Cast.CastOp.extend({
	init: function CastToUint8(){
		Cast.CastOp.prototype.init.call(this);
	}
});
var openArrayChar = null;
var castOperations = new Cast.Operations();
var castToUint8 = null;

function binary(left/*PExpression*/, right/*PExpression*/, context/*Type*/, op/*BinaryOp*/, code/*PCodeMaker*/, precedence/*INTEGER*/, optResultType/*PType*/, optResultPrecedence/*INTEGER*/){
	var result = null;
	var leftValue = null;var rightValue = null;var resultValue = null;
	var leftCode = null;var rightCode = null;var resultCode = null;
	var resultType = null;
	var resultPrecedence = 0;
	var rightExpDeref = null;
	leftValue = left.constValue();
	rightValue = right.constValue();
	if (leftValue != null && rightValue != null){
		resultValue = op(leftValue, rightValue);
	}
	leftCode = Code.adjustPrecedence(Code.derefExpression(left), precedence);
	rightExpDeref = Code.derefExpression(right);
	if (precedence != Precedence.none){
		rightCode = Code.adjustPrecedence(rightExpDeref, precedence - 1 | 0);
	}
	else {
		rightCode = rightExpDeref.code();
	}
	resultCode = code.make(leftCode, rightCode, context);
	if (optResultType != null){
		resultType = optResultType;
	}
	else {
		resultType = left.type();
	}
	if (optResultPrecedence != Precedence.none){
		resultPrecedence = optResultPrecedence;
	}
	else {
		resultPrecedence = precedence;
	}
	return Code.makeExpressionWithPrecedence(resultCode, resultType, null, resultValue, resultPrecedence);
}
SimpleCodeMaker.prototype.make = function(left/*Type*/, right/*Type*/, c/*Type*/){
	return JsString.concat(JsString.concat(left, this.code), right);
}
IntCodeMaker.prototype.make = function(left/*Type*/, right/*Type*/, c/*Type*/){
	return JsString.concat(SimpleCodeMaker.prototype.make.call(this, left, right, c), JsString.make(" | 0"));
}
PredCodeMaker.prototype.make = function(left/*Type*/, right/*Type*/, c/*Type*/){
	return this.pred(left, right, c);
}

function makeSimpleCodeMaker(code/*ARRAY OF CHAR*/){
	var result = null;
	result = new SimpleCodeMaker();
	result.code = JsString.make(code);
	return result;
}

function makeIntCodeMaker(code/*ARRAY OF CHAR*/){
	var result = null;
	result = new IntCodeMaker();
	result.code = JsString.make(code);
	return result;
}

function makePredCodeMaker(pred/*CodePredicate*/){
	var result = null;
	result = new PredCodeMaker();
	result.pred = pred;
	return result;
}

function binaryWithCodeEx(left/*PExpression*/, right/*PExpression*/, context/*Type*/, op/*BinaryOp*/, code/*ARRAY OF CHAR*/, precedence/*INTEGER*/, optResultType/*PType*/, optResultPrecedence/*INTEGER*/){
	return binary(left, right, context, op, makeSimpleCodeMaker(code), precedence, optResultType, optResultPrecedence);
}

function binaryWithCode(left/*PExpression*/, right/*PExpression*/, c/*Type*/, op/*BinaryOp*/, code/*ARRAY OF CHAR*/, precedence/*INTEGER*/){
	return binaryWithCodeEx(left, right, c, op, code, precedence, null, Precedence.none);
}

function promoteToWideIfNeeded(e/*PExpression*/){
	var result = null;
	if (e.type() != Types.basic().uint8){
		result = e;
	}
	else {
		result = Code.makeExpressionWithPrecedence(e.code(), Types.basic().integer, e.designator(), e.constValue(), e.maxPrecedence());
	}
	return result;
}

function binaryInt(left/*PExpression*/, right/*PExpression*/, c/*Type*/, op/*BinaryOp*/, code/*ARRAY OF CHAR*/, precedence/*INTEGER*/){
	return promoteToWideIfNeeded(binary(left, right, c, op, makeIntCodeMaker(code), precedence, null, Precedence.bitOr));
}

function binaryPred(left/*PExpression*/, right/*PExpression*/, c/*Type*/, op/*BinaryOp*/, pred/*CodePredicate*/){
	return binary(left, right, c, op, makePredCodeMaker(pred), Precedence.none, null, Precedence.none);
}

function unary(e/*PExpression*/, op/*UnaryOp*/, code/*ARRAY OF CHAR*/){
	var value = null;
	var resultCode = null;
	value = e.constValue();
	if (value != null){
		value = op(value);
	}
	resultCode = JsString.concat(JsString.make(code), Code.adjustPrecedence(Code.derefExpression(e), Precedence.unary));
	return Code.makeExpression(resultCode, e.type(), null, value);
}

function castToStr(e/*PExpression*/, context/*Type*/){
	var resultExpression = null;
	var op = null;
	op = Cast.implicit(e.type(), openArrayChar, castOperations);
	resultExpression = op.make(context, e);
	return resultExpression.code();
}

function opAddReal(left/*PConst*/, right/*PConst*/){
	return Code.makeRealConst(RTL$.typeGuard(left, Code.RealConst).value + RTL$.typeGuard(right, Code.RealConst).value);
}

function opAddInt(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value + RTL$.typeGuard(right, Code.IntConst).value | 0);
}

function opSubReal(left/*PConst*/, right/*PConst*/){
	return Code.makeRealConst(RTL$.typeGuard(left, Code.RealConst).value - RTL$.typeGuard(right, Code.RealConst).value);
}

function opSubInt(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value - RTL$.typeGuard(right, Code.IntConst).value | 0);
}

function opMulReal(left/*PConst*/, right/*PConst*/){
	return Code.makeRealConst(RTL$.typeGuard(left, Code.RealConst).value * RTL$.typeGuard(right, Code.RealConst).value);
}

function opMulInt(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value * RTL$.typeGuard(right, Code.IntConst).value | 0);
}

function opDivReal(left/*PConst*/, right/*PConst*/){
	return Code.makeRealConst(RTL$.typeGuard(left, Code.RealConst).value / RTL$.typeGuard(right, Code.RealConst).value);
}

function opDivInt(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value / RTL$.typeGuard(right, Code.IntConst).value | 0);
}

function opMod(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value % RTL$.typeGuard(right, Code.IntConst).value);
}

function opSetUnion(left/*PConst*/, right/*PConst*/){
	return Code.makeSetConst(RTL$.typeGuard(left, Code.SetConst).value | RTL$.typeGuard(right, Code.SetConst).value);
}

function opSetDiff(left/*PConst*/, right/*PConst*/){
	return Code.makeSetConst(RTL$.typeGuard(left, Code.SetConst).value & ~RTL$.typeGuard(right, Code.SetConst).value);
}

function opSetIntersection(left/*PConst*/, right/*PConst*/){
	return Code.makeSetConst(RTL$.typeGuard(left, Code.SetConst).value & RTL$.typeGuard(right, Code.SetConst).value);
}

function opSetSymmetricDiff(left/*PConst*/, right/*PConst*/){
	return Code.makeSetConst(RTL$.typeGuard(left, Code.SetConst).value ^ RTL$.typeGuard(right, Code.SetConst).value);
}

function opSetInclL(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.setInclL(RTL$.typeGuard(left, Code.SetConst).value, RTL$.typeGuard(right, Code.SetConst).value) ? 1 : 0);
}

function opSetInclR(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.setInclR(RTL$.typeGuard(left, Code.SetConst).value, RTL$.typeGuard(right, Code.SetConst).value) ? 1 : 0);
}

function opOr(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value != 0 || RTL$.typeGuard(right, Code.IntConst).value != 0 ? 1 : 0);
}

function opAnd(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value != 0 && RTL$.typeGuard(right, Code.IntConst).value != 0 ? 1 : 0);
}

function opEqualInt(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value == RTL$.typeGuard(right, Code.IntConst).value ? 1 : 0);
}

function opEqualReal(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.RealConst).value == RTL$.typeGuard(right, Code.RealConst).value ? 1 : 0);
}

function opNotEqualInt(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value != RTL$.typeGuard(right, Code.IntConst).value ? 1 : 0);
}

function opNotEqualReal(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.RealConst).value != RTL$.typeGuard(right, Code.RealConst).value ? 1 : 0);
}

function opLessInt(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value < RTL$.typeGuard(right, Code.IntConst).value ? 1 : 0);
}

function opLessReal(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.RealConst).value < RTL$.typeGuard(right, Code.RealConst).value ? 1 : 0);
}

function opGreaterInt(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value > RTL$.typeGuard(right, Code.IntConst).value ? 1 : 0);
}

function opGreaterReal(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.RealConst).value > RTL$.typeGuard(right, Code.RealConst).value ? 1 : 0);
}

function opEqLessInt(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value <= RTL$.typeGuard(right, Code.IntConst).value ? 1 : 0);
}

function opEqLessReal(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.RealConst).value <= RTL$.typeGuard(right, Code.RealConst).value ? 1 : 0);
}

function opEqGreaterInt(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value >= RTL$.typeGuard(right, Code.IntConst).value ? 1 : 0);
}

function opEqGreaterReal(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.RealConst).value >= RTL$.typeGuard(right, Code.RealConst).value ? 1 : 0);
}

function opNot(x/*PConst*/){
	return Code.makeIntConst(!RTL$.typeGuard(x, Code.IntConst).value != 0 ? 1 : 0);
}

function opNegateInt(x/*PConst*/){
	return Code.makeIntConst(-RTL$.typeGuard(x, Code.IntConst).value);
}

function opNegateReal(x/*PConst*/){
	return Code.makeRealConst(-RTL$.typeGuard(x, Code.RealConst).value);
}

function opUnaryPlus(x/*PConst*/){
	return x;
}

function opSetComplement(x/*PConst*/){
	return Code.makeSetConst(~RTL$.typeGuard(x, Code.SetConst).value);
}

function opLsl(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value << RTL$.typeGuard(right, Code.IntConst).value);
}

function opAsr(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value >> RTL$.typeGuard(right, Code.IntConst).value);
}

function opRor(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value >>> RTL$.typeGuard(right, Code.IntConst).value);
}

function codeSetInclL(left/*Type*/, right/*Type*/, c/*Type*/){
	var rtl = null;
	rtl = c.rtl();
	return rtl.setInclL(left, right);
}

function codeSetInclR(left/*Type*/, right/*Type*/, c/*Type*/){
	var rtl = null;
	rtl = c.rtl();
	return rtl.setInclR(left, right);
}

function strCmp(op/*ARRAY OF CHAR*/, left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	var rtl = null;
	rtl = c.rtl();
	return Code.makeSimpleExpression(JsString.concat(JsString.concat(rtl.strCmp(castToStr(left, c), castToStr(right, c)), JsString.make(op)), JsString.make("0")), Types.basic().bool);
}

function assign(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	var designator = null;
	var info = null;
	var leftCode = null;var rightCode = null;
	var leftType = null;var rightType = null;
	var isArray = false;
	var castOperation = null;
	var rtl = null;
	var castExp = null;
	var result = null;
	
	function assignArrayFromString(a/*Array*/, s/*String*/){
		var rtl = null;
		if (Types.arrayLength(a) == Types.openArrayLength){
			Errors.raise(JsString.concat(JsString.make("string cannot be assigned to open "), a.description()));
		}
		else if (Types.stringLen(s) > Types.arrayLength(a)){
			Errors.raise(JsString.concat(JsString.concat(JsString.concat(JsString.fromInt(Types.arrayLength(a)), JsString.make("-character ARRAY is too small for ")), JsString.fromInt(Types.stringLen(s))), JsString.make("-character string")));
		}
		rtl = c.rtl();
		return rtl.assignArrayFromString(leftCode, rightCode);
	}
	designator = left.designator();
	info = designator.info();
	if (!(info instanceof Types.Variable) || Types.isVariableReadOnly(RTL$.typeGuard(info, Types.Variable))){
		Errors.raise(JsString.concat(JsString.make("cannot assign to "), info.idType()));
	}
	leftCode = left.lval();
	rightCode = right.code();
	leftType = left.type();
	rightType = right.type();
	isArray = leftType instanceof Types.Array;
	if (isArray && Types.arrayElementsType(RTL$.typeGuard(leftType, Types.Array)) == Types.basic().ch && rightType instanceof Types.String){
		result = assignArrayFromString(RTL$.typeGuard(leftType, Types.Array), RTL$.typeGuard(rightType, Types.String));
	}
	else {
		castOperation = Cast.implicit(rightType, leftType, castOperations);
		if (castOperation == null){
			Errors.raise(JsString.concat(JsString.concat(JsString.concat(JsString.concat(JsString.concat(JsString.concat(JsString.make("type mismatch: '"), leftCode), JsString.make("' is '")), leftType.description()), JsString.make("' and cannot be assigned to '")), rightType.description()), JsString.make("' expression")));
		}
		if (isArray && rightType instanceof Types.Array && Types.arrayLength(RTL$.typeGuard(leftType, Types.Array)) == Types.openArrayLength){
			Errors.raise(JsString.concat(JsString.concat(JsString.concat(JsString.concat(JsString.make("'"), leftCode), JsString.make("' is open '")), leftType.description()), JsString.make("' and cannot be assigned")));
		}
		if (isArray || rightType instanceof Types.Record){
			rtl = c.rtl();
			result = rtl.copy(rightCode, leftCode);
		}
		else {
			castExp = castOperation.make(c, Code.derefExpression(right));
			rightCode = castExp.code();
			if (info instanceof Types.VariableRef){
				rightCode = JsString.concat(JsString.concat(JsString.make(".set("), rightCode), JsString.make(")"));
			}
			else {
				rightCode = JsString.concat(JsString.make(" = "), rightCode);
			}
			result = JsString.concat(leftCode, rightCode);
		}
	}
	return result;
}

function inplace(left/*PExpression*/, right/*PExpression*/, c/*Type*/, code/*ARRAY OF CHAR*/, altOp/*BinaryProc*/){
	var designator = null;
	var rightExp = null;
	var result = null;
	designator = left.designator();
	if (designator.info() instanceof Types.VariableRef){
		result = assign(left, altOp(left, right, c), c);
	}
	else {
		rightExp = Code.derefExpression(right);
		result = JsString.concat(JsString.concat(left.code(), JsString.make(code)), rightExp.code());
	}
	return result;
}

function addReal(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opAddReal, " + ", Precedence.addSub);
}

function addInt(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryInt(left, right, c, opAddInt, " + ", Precedence.addSub);
}

function subReal(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opSubReal, " - ", Precedence.addSub);
}

function subInt(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryInt(left, right, c, opSubInt, " - ", Precedence.addSub);
}

function mulReal(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opMulReal, " * ", Precedence.mulDivMod);
}

function mulInt(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryInt(left, right, c, opMulInt, " * ", Precedence.mulDivMod);
}

function divReal(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opDivReal, " / ", Precedence.mulDivMod);
}

function divInt(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryInt(left, right, c, opDivInt, " / ", Precedence.mulDivMod);
}

function mod(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opMod, " % ", Precedence.mulDivMod);
}

function setUnion(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opSetUnion, " | ", Precedence.bitOr);
}

function setDiff(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opSetDiff, " & ~", Precedence.bitAnd);
}

function setIntersection(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opSetIntersection, " & ", Precedence.bitAnd);
}

function setSymmetricDiff(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opSetSymmetricDiff, " ^ ", Precedence.bitXor);
}

function setInclL(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryPred(left, right, c, opSetInclL, codeSetInclL);
}

function setInclR(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryPred(left, right, c, opSetInclR, codeSetInclR);
}

function or(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opOr, " || ", Precedence.or);
}

function and(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opAnd, " && ", Precedence.and);
}

function equalInt(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opEqualInt, " == ", Precedence.equal);
}

function equalReal(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opEqualReal, " == ", Precedence.equal);
}

function equalStr(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return strCmp(" == ", left, right, c);
}

function notEqualInt(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opNotEqualInt, " != ", Precedence.equal);
}

function notEqualReal(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opNotEqualReal, " != ", Precedence.equal);
}

function notEqualStr(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return strCmp(" != ", left, right, c);
}

function is(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCodeEx(left, right, c, null, " instanceof ", Precedence.relational, Types.basic().bool, Precedence.none);
}

function lessInt(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opLessInt, " < ", Precedence.relational);
}

function lessReal(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opLessReal, " < ", Precedence.relational);
}

function lessStr(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return strCmp(" < ", left, right, c);
}

function greaterInt(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opGreaterInt, " > ", Precedence.relational);
}

function greaterReal(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opGreaterReal, " > ", Precedence.relational);
}

function greaterStr(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return strCmp(" > ", left, right, c);
}

function eqLessInt(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opEqLessInt, " <= ", Precedence.relational);
}

function eqLessReal(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opEqLessReal, " <= ", Precedence.relational);
}

function eqLessStr(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return strCmp(" <= ", left, right, c);
}

function eqGreaterInt(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opEqGreaterInt, " >= ", Precedence.relational);
}

function eqGreaterReal(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opEqGreaterReal, " >= ", Precedence.relational);
}

function eqGreaterStr(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return strCmp(" >= ", left, right, c);
}

function not(x/*PExpression*/, c/*Type*/){
	return unary(x, opNot, "!");
}

function negateInt(x/*PExpression*/, c/*Type*/){
	return promoteToWideIfNeeded(unary(x, opNegateInt, "-"));
}

function negateReal(x/*PExpression*/, c/*Type*/){
	return promoteToWideIfNeeded(unary(x, opNegateReal, "-"));
}

function unaryPlus(x/*PExpression*/, c/*Type*/){
	return unary(x, opUnaryPlus, "");
}

function setComplement(x/*PExpression*/, c/*Type*/){
	return unary(x, opSetComplement, "~");
}

function lsl(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opLsl, " << ", Precedence.shift);
}

function asr(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opAsr, " >> ", Precedence.shift);
}

function ror(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return binaryWithCode(left, right, c, opRor, " >>> ", Precedence.shift);
}

function mulInplace(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return inplace(left, right, c, " *= ", mulReal);
}

function divInplace(left/*PExpression*/, right/*PExpression*/, c/*Type*/){
	return inplace(left, right, c, " /= ", divReal);
}

function pow2(e/*PExpression*/){
	var derefExp = null;
	derefExp = Code.derefExpression(e);
	return Code.makeSimpleExpression(JsString.concat(JsString.concat(JsString.make("Math.pow(2, "), derefExp.code()), JsString.make(")")), Types.basic().real);
}

function log2(e/*PExpression*/){
	var derefExp = null;
	derefExp = Code.derefExpression(e);
	return Code.makeExpressionWithPrecedence(JsString.concat(JsString.concat(JsString.make("(Math.log("), derefExp.code()), JsString.make(") / Math.LN2) | 0")), Types.basic().integer, null, null, Precedence.bitOr);
}

function opCastToUint8(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.IntConst).value * RTL$.typeGuard(right, Code.IntConst).value | 0);
}
CastToUint8.prototype.make = function(context/*Type*/, e/*PExpression*/){
	return binaryWithCode(e, Code.makeExpression(JsString.make("0xFF"), Types.basic().integer, null, Code.makeIntConst(255)), context, opCastToUint8, " & ", Precedence.bitAnd);
}
openArrayChar = Types.makeArray(null, null, Types.basic().ch, Types.openArrayLength);
castToUint8 = new CastToUint8();
castOperations.castToUint8 = castToUint8;
exports.castOperations = function(){return castOperations;};
exports.assign = assign;
exports.addReal = addReal;
exports.addInt = addInt;
exports.subReal = subReal;
exports.subInt = subInt;
exports.mulReal = mulReal;
exports.mulInt = mulInt;
exports.divReal = divReal;
exports.divInt = divInt;
exports.mod = mod;
exports.setUnion = setUnion;
exports.setDiff = setDiff;
exports.setIntersection = setIntersection;
exports.setSymmetricDiff = setSymmetricDiff;
exports.setInclL = setInclL;
exports.setInclR = setInclR;
exports.or = or;
exports.and = and;
exports.equalInt = equalInt;
exports.equalReal = equalReal;
exports.equalStr = equalStr;
exports.notEqualInt = notEqualInt;
exports.notEqualReal = notEqualReal;
exports.notEqualStr = notEqualStr;
exports.is = is;
exports.lessInt = lessInt;
exports.lessReal = lessReal;
exports.lessStr = lessStr;
exports.greaterInt = greaterInt;
exports.greaterReal = greaterReal;
exports.greaterStr = greaterStr;
exports.eqLessInt = eqLessInt;
exports.eqLessReal = eqLessReal;
exports.eqLessStr = eqLessStr;
exports.eqGreaterInt = eqGreaterInt;
exports.eqGreaterReal = eqGreaterReal;
exports.eqGreaterStr = eqGreaterStr;
exports.not = not;
exports.negateInt = negateInt;
exports.negateReal = negateReal;
exports.unaryPlus = unaryPlus;
exports.setComplement = setComplement;
exports.lsl = lsl;
exports.asr = asr;
exports.ror = ror;
exports.mulInplace = mulInplace;
exports.divInplace = divInplace;
exports.pow2 = pow2;
exports.log2 = log2;
