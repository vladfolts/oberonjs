var RTL$ = require("rtl.js");
var Code = require("js/Code.js");
var Context = require("js/Context.js");
var Errors = require("js/Errors.js");
var JsArray = require("js/JsArray.js");
var JsString = require("js/JsString.js");
var Procedure = require("js/Procedure.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");
var Type = Types.Module.extend({
	init: function Type(){
		Types.Module.prototype.init.call(this);
	}
});
var AnyType = Types.StorageType.extend({
	init: function AnyType(){
		Types.StorageType.prototype.init.call(this);
	}
});
var AnyTypeProc = Types.DefinedProcedure.extend({
	init: function AnyTypeProc(){
		Types.DefinedProcedure.prototype.init.call(this);
	}
});
var JS = Type.extend({
	init: function JS(){
		Type.prototype.init.call(this);
	}
});
var doProcId = null;var varTypeId = null;
var any = null;
var anyProc = new AnyTypeProc();
var doProcSymbol = null;var varTypeSymbol = null;
AnyType.prototype.description = function(){
	return JsString.make("JS.var");
}
AnyType.prototype.initializer = function(cx/*Type*/){
	return JsString.make("undefined");
}
AnyType.prototype.callGenerator = function(cx/*PType*/, id/*Type*/){
	return Procedure.makeProcCallGenerator(cx, id, anyProc);
}
AnyType.prototype.findSymbol = function(id/*Type*/){
	return any;
}
AnyTypeProc.prototype.args = function(){
	return null;
}
AnyTypeProc.prototype.result = function(){
	return any;
}
JS.prototype.findSymbol = function(id/*Type*/){
	var result = null;
	if (JsString.eq(id, doProcId)){
		result = doProcSymbol;
	}
	else if (JsString.eq(id, varTypeId)){
		result = varTypeSymbol;
	}
	else {
		result = Symbols.makeSymbol(id, Types.makeProcedure(any));
	}
	return Symbols.makeFound(result, null);
}

function makeVarTypeSymbol(){
	return Symbols.makeSymbol(varTypeId, Types.makeTypeId(any));
}

function makeDoProcSymbol(){
	var Call = Procedure.StdCall.extend({
		init: function Call(){
			Procedure.StdCall.prototype.init.call(this);
		}
	});
	var Proc = Procedure.Std.extend({
		init: function Proc(){
			Procedure.Std.prototype.init.call(this);
		}
	});
	var description = null;
	var call = null;
	var proc = null;
	Call.prototype.make = function(args/*Type*/, cx/*Type*/){
		var arg = null;
		var type = null;
		arg = Procedure.checkSingleArgument(args, this);
		type = arg.type();
		if (!(type instanceof Types.String)){
			Errors.raise(JsString.concat(JsString.concat(JsString.concat(JsString.make("string is expected as an argument of "), description), JsString.make(", got ")), type.description()));
		}
		return Code.makeSimpleExpression(Types.stringValue(RTL$.typeGuard(type, Types.String)), null);
	}
	Proc.prototype.description = function(){
		return description;
	}
	description = JsString.make("JS predefined procedure 'do'");
	call = new Call();
	Procedure.initStdCall(call);
	Procedure.hasArgumentWithCustomType(call);
	proc = new Proc();
	Procedure.initStd(JsString.makeEmpty(), call, proc);
	return Procedure.makeSymbol(proc);
}

function makeJS(){
	var result = null;
	result = new JS();
	Types.initModule(result, JsString.make("this"));
	return result;
}
doProcId = JsString.make("do$");
varTypeId = JsString.make("var$");
any = new AnyType();
doProcSymbol = makeDoProcSymbol();
varTypeSymbol = makeVarTypeSymbol();
exports.Type = Type;
exports.AnyType = AnyType;
exports.AnyTypeProc = AnyTypeProc;
exports.makeJS = makeJS;
