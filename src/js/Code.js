var RTL$ = require("rtl.js");
var JsMap = require("js/JsMap.js");
var JsString = require("js/JsString.js");
var Context = require("js/Context.js");
var Object = require("js/Object.js");
var Stream = require("js/Stream.js");
var Symbols = require("js/Symbols.js");
var Precedence = require("js/CodePrecedence.js");
var Types = require("js/Types.js");
var kTab = "\t";
var IGenerator = RTL$.extend({
	init: function IGenerator(){
	}
});
var NullGenerator = IGenerator.extend({
	init: function NullGenerator(){
		IGenerator.prototype.init.call(this);
	}
});
var SimpleGenerator = NullGenerator.extend({
	init: function SimpleGenerator(){
		NullGenerator.prototype.init.call(this);
		this.mResult = null;
	}
});
var Generator = SimpleGenerator.extend({
	init: function Generator(){
		SimpleGenerator.prototype.init.call(this);
		this.indent = 0;
	}
});
var Designator = RTL$.extend({
	init: function Designator(){
		this.mCode = null;
		this.mLval = null;
		this.mRefCode = null;
		this.mType = null;
		this.mInfo = null;
		this.mScope = null;
	}
});
var Const = RTL$.extend({
	init: function Const(){
	}
});
var IntConst = Const.extend({
	init: function IntConst(){
		Const.prototype.init.call(this);
		this.value = 0;
	}
});
var RealConst = Const.extend({
	init: function RealConst(){
		Const.prototype.init.call(this);
		this.value = 0;
	}
});
var SetConst = Const.extend({
	init: function SetConst(){
		Const.prototype.init.call(this);
		this.value = 0;
	}
});
var StringConst = Const.extend({
	init: function StringConst(){
		Const.prototype.init.call(this);
		this.value = null;
	}
});
var Expression = Object.Type.extend({
	init: function Expression(){
		Object.Type.prototype.init.call(this);
		this.mCode = null;
		this.mType = null;
		this.mDesignator = null;
		this.mConstValue = null;
		this.mMaxPrecedence = 0;
	}
});
var ModuleGenerator = RTL$.extend({
	init: function ModuleGenerator(){
		this.name = null;
		this.imports = null;
	}
});
var Closure = Object.Type.extend({
	init: function Closure(){
		Object.Type.prototype.init.call(this);
		this.result = null;
	}
});
var nullGenerator = new NullGenerator();
NullGenerator.prototype.write = function(s/*Type*/){
}
NullGenerator.prototype.openScope = function(){
}
NullGenerator.prototype.closeScope = function(ending/*Type*/){
}
NullGenerator.prototype.result = function(){
	return null;
}
SimpleGenerator.prototype.write = function(s/*Type*/){
	this.mResult = JsString.concat(this.mResult, s);
}
SimpleGenerator.prototype.result = function(){
	return this.mResult;
}

function putIndent(s/*Type*/, indent/*INTEGER*/){
	var i = 0;
	for (i = 0; i <= indent - 1 | 0; ++i){
		s = JsString.appendChar(s, 9);
	}
	return s;
}
Generator.prototype.write = function(s/*Type*/){
	var pos = 0;
	var index = 0;
	index = JsString.indexOf(s, 10);
	while (true){
		if (index != -1){
			++index;
			this.mResult = JsString.concat(this.mResult, JsString.substr(s, pos, index - pos | 0));
			this.mResult = putIndent(this.mResult, this.indent);
			pos = index;
			index = JsString.indexOfFrom(s, 10, pos);
		} else break;
	}
	this.mResult = JsString.concat(this.mResult, JsString.substr(s, pos, JsString.len(s) - pos | 0));
}
Generator.prototype.openScope = function(){
	++this.indent;
	this.mResult = JsString.appendChar(this.mResult, 123);
	this.mResult = JsString.appendChar(this.mResult, 10);
	this.mResult = putIndent(this.mResult, this.indent);
}
Generator.prototype.closeScope = function(ending/*Type*/){
	--this.indent;
	this.mResult = JsString.substr(this.mResult, 0, JsString.len(this.mResult) - 1 | 0);
	this.mResult = JsString.appendChar(this.mResult, 125);
	if (ending != null){
		this.write(ending);
	}
	else {
		this.mResult = JsString.appendChar(this.mResult, 10);
		this.mResult = putIndent(this.mResult, this.indent);
	}
}
Expression.prototype.code = function(){
	return this.mCode;
}
Expression.prototype.lval = function(){
	var result = null;
	if (this.mDesignator != null){
		result = this.mDesignator.mLval;
	}
	else {
		result = this.mCode;
	}
	return result;
}
Expression.prototype.type = function(){
	return this.mType;
}
Expression.prototype.designator = function(){
	return this.mDesignator;
}
Expression.prototype.constValue = function(){
	return this.mConstValue;
}
Expression.prototype.maxPrecedence = function(){
	return this.mMaxPrecedence;
}
Expression.prototype.isTerm = function(){
	return this.mDesignator == null && this.mMaxPrecedence == Precedence.none;
}

function makeIntConst(n/*INTEGER*/){
	var result = null;
	result = new IntConst();
	result.value = n;
	return result;
}

function makeRealConst(n/*REAL*/){
	var result = null;
	result = new RealConst();
	result.value = n;
	return result;
}

function makeSetConst(s/*SET*/){
	var result = null;
	result = new SetConst();
	result.value = s;
	return result;
}

function makeStringConst(s/*Type*/){
	var result = null;
	result = new StringConst();
	result.value = s;
	return result;
}

function makeExpressionWithPrecedence(code/*Type*/, type/*PType*/, designator/*PDesignator*/, constValue/*PConst*/, maxPrecedence/*INTEGER*/){
	var result = null;
	RTL$.assert(code != null);
	result = new Expression();
	result.mCode = code;
	result.mType = type;
	result.mDesignator = designator;
	result.mConstValue = constValue;
	result.mMaxPrecedence = maxPrecedence;
	return result;
}

function makeExpression(code/*Type*/, type/*PType*/, designator/*PDesignator*/, constValue/*PConst*/){
	return makeExpressionWithPrecedence(code, type, designator, constValue, Precedence.none);
}

function makeSimpleExpression(code/*Type*/, type/*PType*/){
	return makeExpression(code, type, null, null);
}
Designator.prototype.code = function(){
	return this.mCode;
}
Designator.prototype.lval = function(){
	return this.mLval;
}
Designator.prototype.refCode = function(){
	return this.mRefCode;
}
Designator.prototype.type = function(){
	return this.mType;
}
Designator.prototype.info = function(){
	return this.mInfo;
}
Designator.prototype.scope = function(){
	return this.mScope;
}

function makeDesignator(code/*Type*/, lval/*Type*/, refCode/*RefCodeProc*/, type/*PType*/, info/*PId*/, scope/*PScope*/){
	var result = null;
	result = new Designator();
	result.mCode = code;
	result.mLval = lval;
	result.mRefCode = refCode;
	result.mType = type;
	result.mInfo = info;
	result.mScope = scope;
	return result;
}

function derefExpression(e/*PExpression*/){
	var result = null;
	if (e.mDesignator == null || (e.mType instanceof Types.Array || e.mType instanceof Types.Record) || !(e.mDesignator.mInfo instanceof Types.VariableRef)){
		result = e;
	}
	else {
		result = makeSimpleExpression(JsString.concat(e.mCode, JsString.make(".get()")), e.mType);
	}
	return result;
}

function refExpression(e/*PExpression*/){
	var result = null;
	if (e.mDesignator == null || e.mDesignator.mInfo instanceof Types.VariableRef){
		result = e;
	}
	else {
		result = makeSimpleExpression(e.mDesignator.mRefCode(e.mDesignator.mCode), e.mType);
	}
	return result;
}

function adjustPrecedence(e/*PExpression*/, precedence/*INTEGER*/){
	var result = null;
	result = e.mCode;
	if (precedence != Precedence.none && e.mMaxPrecedence > precedence){
		result = JsString.concat(JsString.concat(JsString.make("("), result), JsString.make(")"));
	}
	return result;
}

function isPointerShouldBeExported(type/*Pointer*/){
	var r = null;
	r = Types.pointerBase(type);
	return Types.typeName(r) == null;
}

function typeShouldBeExported(typeId/*PId*/){
	var type = null;
	type = RTL$.typeGuard(typeId, Types.TypeId).type();
	return type instanceof Types.Record || type instanceof Types.Pointer && isPointerShouldBeExported(RTL$.typeGuard(type, Types.Pointer));
}

function genExport(s/*Symbol*/){
	var result = null;
	if (s.isVariable()){
		result = JsString.concat(JsString.concat(JsString.make("function(){return "), s.id()), JsString.make(";}"));
	}
	else if (!s.isType() || typeShouldBeExported(s.info())){
		result = s.id();
	}
	return result;
}

function genCommaList(name/*Type*/, closure/*Closure*/){
	if (JsString.len(closure.result) != 0){
		closure.result = JsString.concat(closure.result, JsString.make(", "));
	}
	closure.result = JsString.concat(closure.result, name);
}

function genAliasesAdaptor(key/*Type*/, value/*Type*/, closure/*VAR Type*/){
	genCommaList(value, RTL$.typeGuard(closure, Closure));
}
ModuleGenerator.prototype.prolog = function(){
	var closure = new Closure();
	closure.result = JsString.makeEmpty();
	JsMap.forEachString(this.imports, genAliasesAdaptor, closure);
	return JsString.appendChar(JsString.concat(JsString.concat(JsString.concat(JsString.concat(JsString.make("var "), this.name), JsString.make(" = function (")), closure.result), JsString.make("){")), 10);
}

function genExports(s/*Symbol*/, closure/*Closure*/){
	var code = null;
	code = genExport(s);
	if (code != null){
		if (JsString.len(closure.result) != 0){
			closure.result = JsString.appendChar(JsString.appendChar(closure.result, 44), 10);
		}
		closure.result = JsString.concat(JsString.concat(JsString.concat(JsString.appendChar(closure.result, 9), s.id()), JsString.make(": ")), code);
	}
}

function genExportsAdaptor(key/*Type*/, value/*PType*/, closure/*VAR Type*/){
	genExports(RTL$.typeGuard(value, Symbols.Symbol), RTL$.typeGuard(closure, Closure));
}

function genImportListAdaptor(key/*Type*/, value/*Type*/, closure/*VAR Type*/){
	genCommaList(key, RTL$.typeGuard(closure, Closure));
}
ModuleGenerator.prototype.epilog = function(exports/*Type*/){
	var result = null;
	var closure = new Closure();
	closure.result = JsString.makeEmpty();
	JsMap.forEach(exports, genExportsAdaptor, closure);
	result = closure.result;
	if (JsString.len(result) != 0){
		result = JsString.appendChar(JsString.appendChar(JsString.appendChar(JsString.concat(JsString.appendChar(JsString.make("return {"), 10), result), 10), 125), 10);
	}
	result = JsString.concat(result, JsString.make("}("));
	closure.result = JsString.makeEmpty();
	JsMap.forEachString(this.imports, genImportListAdaptor, closure);
	result = JsString.appendChar(JsString.concat(JsString.concat(result, closure.result), JsString.make(");")), 10);
	return result;
}

function initSimpleGenerator(g/*SimpleGenerator*/){
	g.mResult = JsString.makeEmpty();
}

function makeSimpleGenerator(){
	var result = null;
	result = new SimpleGenerator();
	initSimpleGenerator(result);
	return result;
}

function makeGenerator(){
	var result = null;
	result = new Generator();
	initSimpleGenerator(result);
	return result;
}

function makeModuleGenerator(name/*Type*/, imports/*Strings*/){
	var result = null;
	result = new ModuleGenerator();
	result.name = name;
	result.imports = imports;
	return result;
}
exports.Designator = Designator;
exports.Const = Const;
exports.IntConst = IntConst;
exports.RealConst = RealConst;
exports.SetConst = SetConst;
exports.Expression = Expression;
exports.nullGenerator = function(){return nullGenerator;};
exports.makeIntConst = makeIntConst;
exports.makeRealConst = makeRealConst;
exports.makeSetConst = makeSetConst;
exports.makeStringConst = makeStringConst;
exports.makeExpressionWithPrecedence = makeExpressionWithPrecedence;
exports.makeExpression = makeExpression;
exports.makeSimpleExpression = makeSimpleExpression;
exports.makeDesignator = makeDesignator;
exports.derefExpression = derefExpression;
exports.refExpression = refExpression;
exports.adjustPrecedence = adjustPrecedence;
exports.genExport = genExport;
exports.makeSimpleGenerator = makeSimpleGenerator;
exports.makeGenerator = makeGenerator;
exports.makeModuleGenerator = makeModuleGenerator;
