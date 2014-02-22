var RTL$ = require("rtl.js");
var Code = require("js/Code.js");
var CodePrecedence = require("js/CodePrecedence.js");
var JsString = require("js/JsString.js");
var OberonRtl = require("js/OberonRtl.js");
var Operator = require("js/Operator.js");

function opAddStr(left/*PConst*/, right/*PConst*/){
	return Code.makeStrConst(JsString.concat(RTL$.typeGuard(left, Code.StrConst).value, RTL$.typeGuard(right, Code.StrConst).value));
}

function opEqualStr(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.StrConst).value == RTL$.typeGuard(right, Code.StrConst).value ? 1 : 0);
}

function opNotEqualStr(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(RTL$.typeGuard(left, Code.StrConst).value != RTL$.typeGuard(right, Code.StrConst).value ? 1 : 0);
}

function opLessStr(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(0);
}

function opGreaterStr(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(0);
}

function opLessEqualStr(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(0);
}

function opGraterEqualStr(left/*PConst*/, right/*PConst*/){
	return Code.makeIntConst(0);
}

function addStr(left/*PExpression*/, right/*PExpression*/, rtl/*PType*/){
	return Operator.binaryWithCode(left, right, rtl, opAddStr, " + ", CodePrecedence.addSub);
}

function equalStr(left/*PExpression*/, right/*PExpression*/, rtl/*PType*/){
	return Operator.binaryWithCode(left, right, rtl, opEqualStr, " == ", CodePrecedence.equal);
}

function notEqualStr(left/*PExpression*/, right/*PExpression*/, rtl/*PType*/){
	return Operator.binaryWithCode(left, right, rtl, opNotEqualStr, " != ", CodePrecedence.equal);
}

function lessStr(left/*PExpression*/, right/*PExpression*/, rtl/*PType*/){
	return Operator.binaryWithCode(left, right, rtl, opLessStr, " < ", CodePrecedence.relational);
}

function greaterStr(left/*PExpression*/, right/*PExpression*/, rtl/*PType*/){
	return Operator.binaryWithCode(left, right, rtl, opGreaterStr, " > ", CodePrecedence.relational);
}

function lessEqualStr(left/*PExpression*/, right/*PExpression*/, rtl/*PType*/){
	return Operator.binaryWithCode(left, right, rtl, opLessEqualStr, " <= ", CodePrecedence.relational);
}

function greaterEqualStr(left/*PExpression*/, right/*PExpression*/, rtl/*PType*/){
	return Operator.binaryWithCode(left, right, rtl, opGraterEqualStr, " >= ", CodePrecedence.relational);
}
exports.addStr = addStr;
exports.equalStr = equalStr;
exports.notEqualStr = notEqualStr;
exports.lessStr = lessStr;
exports.greaterStr = greaterStr;
exports.lessEqualStr = lessEqualStr;
exports.greaterEqualStr = greaterEqualStr;
