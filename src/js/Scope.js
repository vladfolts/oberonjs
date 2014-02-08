var RTL$ = require("rtl.js");
var Context = require("js/Context.js");
var Errors = require("js/Errors.js");
var JsArray = require("js/JsArray.js");
var JsMap = require("js/JsMap.js");
var JsString = require("js/JsString.js");
var Object = require("js/Object.js");
var Procedures = require("js/Procedure.js");
var Symbols = require("js/Symbols.js");
var Types = require("js/Types.js");
var Type = Context.Scope.extend({
	init: function Type(){
		Context.Scope.prototype.init.call(this);
		this.symbols = null;
		this.unresolved = null;
		this.finalizers = null;
	}
});
var Procedure = Type.extend({
	init: function Procedure(){
		Type.prototype.init.call(this);
	}
});
var CompiledModule = Types.Module.extend({
	init: function CompiledModule(){
		Types.Module.prototype.init.call(this);
		this.exports = null;
	}
});
var Module = Type.extend({
	init: function Module(){
		Type.prototype.init.call(this);
		this.symbol = null;
		this.exports = null;
	}
});
var Finalizer = Object.Type.extend({
	init: function Finalizer(){
		Object.Type.prototype.init.call(this);
		this.proc = null;
		this.closure = null;
	}
});
var stdSymbols = null;

function makeStdSymbols(){
	var result = null;
	var i = 0;
	var proc = null;
	
	function addSymbol(t/*PBasicType*/){
		var name = null;
		name = Types.typeName(t);
		JsMap.put(result, name, Symbols.makeSymbol(name, Types.makeTypeId(t)));
	}
	result = JsMap.make();
	addSymbol(Types.basic().bool);
	addSymbol(Types.basic().ch);
	addSymbol(Types.basic().integer);
	addSymbol(Types.basic().uint8);
	addSymbol(Types.basic().real);
	addSymbol(Types.basic().set);
	for (i = 0; i <= JsArray.len(Procedures.predefined()) - 1 | 0; ++i){
		proc = JsArray.at(Procedures.predefined(), i);
		JsMap.put(result, RTL$.typeGuard(proc, Symbols.Symbol).id(), proc);
	}
	return result;
}

function init(scope/*Type*/){
	scope.symbols = JsMap.make();
	scope.unresolved = JsArray.makeStrings();
	scope.finalizers = JsArray.make();
}

function makeCompiledModule(name/*Type*/){
	var result = null;
	result = new CompiledModule();
	Types.initModule(result, name);
	result.exports = JsMap.make();
	return result;
}

function makeModule(name/*Type*/){
	var result = null;
	result = new Module();
	init(result);
	result.exports = JsMap.make();
	result.symbol = Symbols.makeSymbol(name, makeCompiledModule(name));
	result.addSymbol(result.symbol, false);
	return result;
}

function addUnresolved(s/*Type*/, id/*Type*/){
	if (!JsArray.containsString(s.unresolved, id)){
		JsArray.addString(s.unresolved, id);
	}
}

function resolve(s/*Type*/, symbol/*PSymbol*/){
	var id = null;
	var i = 0;
	var info = null;
	var type = null;
	id = symbol.id();
	i = JsArray.stringsIndexOf(s.unresolved, id);
	if (i != -1){
		info = symbol.info();
		type = RTL$.typeGuard(info, Types.TypeId).type();
		if (type != null && !(type instanceof Types.Record)){
			Errors.raise(JsString.concat(JsString.concat(JsString.make("'"), id), JsString.make("' must be of RECORD type because it was used before in the declation of POINTER")));
		}
		JsArray.removeString(s.unresolved, i);
	}
}

function unresolved(s/*Type*/){
	return s.unresolved;
}
Type.prototype.close = function(){
	var i = 0;
	var p = null;
	var finalizer = null;
	if (this.finalizers != null){
		for (i = 0; i <= JsArray.len(this.finalizers) - 1 | 0; ++i){
			p = JsArray.at(this.finalizers, i);
			finalizer = RTL$.typeGuard(p, Finalizer);
			finalizer.proc(finalizer.closure);
		}
		this.finalizers = null;
	}
}
Type.prototype.addFinalizer = function(proc/*FinalizerProc*/, closure/*PType*/){
	var f = null;
	f = new Finalizer();
	f.proc = proc;
	f.closure = closure;
	JsArray.add(this.finalizers, f);
}

function close(s/*Type*/){
	return s.unresolved;
}
Type.prototype.addSymbol = function(s/*PSymbol*/, exported/*BOOLEAN*/){
	var id = null;
	id = s.id();
	if (this.findSymbol(id) != null){
		Errors.raise(JsString.concat(JsString.concat(JsString.make("'"), id), JsString.make("' already declared")));
	}
	JsMap.put(this.symbols, id, s);
}
Type.prototype.findSymbol = function(id/*Type*/){
	var result = null;
	var void$ = false;
	if (!JsMap.find(this.symbols, id, {set: function($v){result = $v;}, get: function(){return result;}})){
		void$ = JsMap.find(stdSymbols, id, {set: function($v){result = $v;}, get: function(){return result;}});
	}
	return RTL$.typeGuard(result, Symbols.Symbol);
}
Procedure.prototype.addSymbol = function(s/*PSymbol*/, exported/*BOOLEAN*/){
	var info = null;
	if (exported){
		info = s.info();
		Errors.raise(JsString.concat(JsString.concat(JsString.concat(JsString.concat(JsString.make("cannot export from within procedure: "), info.idType()), JsString.make(" '")), s.id()), JsString.make("'")));
	}
	Type.prototype.addSymbol.call(this, s, exported);
}

function makeProcedure(){
	var result = null;
	result = new Procedure();
	init(result);
	return result;
}

function addExport(id/*Type*/, value/*PType*/, closure/*VAR Type*/){
	var symbol = null;
	var info = null;
	symbol = RTL$.typeGuard(value, Symbols.Symbol);
	info = symbol.info();
	if (info instanceof Types.Variable){
		symbol = Symbols.makeSymbol(id, Types.makeExportedVariable(RTL$.typeGuard(info, Types.Variable)));
	}
	JsMap.put(RTL$.typeGuard(closure, CompiledModule).exports, id, symbol);
}

function defineExports(m/*CompiledModule*/, exports/*Type*/){
	JsMap.forEach(exports, addExport, m);
}
CompiledModule.prototype.findSymbol = function(id/*Type*/){
	var s = null;
	var result = null;
	if (JsMap.find(this.exports, id, {set: function($v){s = $v;}, get: function(){return s;}})){
		result = Symbols.makeFound(RTL$.typeGuard(s, Symbols.Symbol), null);
	}
	return result;
}
Module.prototype.addSymbol = function(s/*PSymbol*/, exported/*BOOLEAN*/){
	Type.prototype.addSymbol.call(this, s, exported);
	if (exported){
		JsMap.put(this.exports, s.id(), s);
	}
}

function moduleSymbol(m/*Module*/){
	return m.symbol;
}

function moduleExports(m/*Module*/){
	return m.exports;
}
stdSymbols = makeStdSymbols();
exports.Procedure = Procedure;
exports.Module = Module;
exports.makeModule = makeModule;
exports.addUnresolved = addUnresolved;
exports.resolve = resolve;
exports.unresolved = unresolved;
exports.close = close;
exports.makeProcedure = makeProcedure;
exports.defineExports = defineExports;
exports.moduleSymbol = moduleSymbol;
exports.moduleExports = moduleExports;
