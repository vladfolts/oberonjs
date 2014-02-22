var RTL$ = require("rtl.js");
var JsString = require("js/JsString.js");
var Object = require("js/Object.js");
var ScopeBase = require("js/ScopeBase.js");
var Types = require("js/Types.js");
var Symbol = Object.Type.extend({
	init: function Symbol(){
		Object.Type.prototype.init.call(this);
		this.mId = null;
		this.mInfo = null;
	}
});
var FoundSymbol = RTL$.extend({
	init: function FoundSymbol(){
		this.mSymbol = null;
		this.mScope = null;
	}
});
Symbol.prototype.id = function(){
	return this.mId;
}
Symbol.prototype.info = function(){
	return this.mInfo;
}
Symbol.prototype.isModule = function(){
	return this.mInfo instanceof Types.Module;
}
Symbol.prototype.isVariable = function(){
	return this.mInfo instanceof Types.Variable;
}
Symbol.prototype.isConst = function(){
	return this.mInfo instanceof Types.Const;
}
Symbol.prototype.isType = function(){
	return this.mInfo instanceof Types.TypeId;
}
Symbol.prototype.isProcedure = function(){
	return this.mInfo instanceof Types.ProcedureId;
}
FoundSymbol.prototype.scope = function(){
	return this.mScope;
}
FoundSymbol.prototype.symbol = function(){
	return this.mSymbol;
}

function makeSymbol(id/*Type*/, info/*PId*/){
	var result = null;
	result = new Symbol();
	result.mId = id;
	result.mInfo = info;
	return result;
}

function makeFound(s/*PSymbol*/, scope/*PType*/){
	var result = null;
	result = new FoundSymbol();
	result.mSymbol = s;
	result.mScope = scope;
	return result;
}
exports.Symbol = Symbol;
exports.FoundSymbol = FoundSymbol;
exports.makeSymbol = makeSymbol;
exports.makeFound = makeFound;
