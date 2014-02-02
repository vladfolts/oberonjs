var RTL$ = require("rtl.js");
var Context = require("js/Context.js");
var Errors = require("js/Errors.js");
var JS = GLOBAL;
var JsArray = require("js/JsArray.js");
var JsMap = require("js/JsMap.js");
var JsString = require("js/JsString.js");
var Object = require("js/Object.js");
var openArrayLength = 0;
var Id = Object.Type.extend({
	init: function Id(){
		Object.Type.prototype.init.call(this);
	}
});
var Type = Object.Type.extend({
	init: function Type(){
		Object.Type.prototype.init.call(this);
	}
});
var StorageType = Type.extend({
	init: function StorageType(){
		Type.prototype.init.call(this);
	}
});
var TypeId = Id.extend({
	init: function TypeId(){
		Id.prototype.init.call(this);
		this.mType = null;
	}
});
var ForwardTypeId = TypeId.extend({
	init: function ForwardTypeId(){
		TypeId.prototype.init.call(this);
		this.resolve = null;
	}
});
var LazyTypeId = TypeId.extend({
	init: function LazyTypeId(){
		TypeId.prototype.init.call(this);
	}
});
var Const = Id.extend({
	init: function Const(){
		Id.prototype.init.call(this);
		this.type = null;
		this.value = undefined;
	}
});
var Variable = Id.extend({
	init: function Variable(){
		Id.prototype.init.call(this);
		this.type = null;
		this.readOnly = false;
	}
});
var VariableRef = Variable.extend({
	init: function VariableRef(){
		Variable.prototype.init.call(this);
	}
});
var ExportedVariable = Variable.extend({
	init: function ExportedVariable(){
		Variable.prototype.init.call(this);
	}
});
var ProcedureId = Id.extend({
	init: function ProcedureId(){
		Id.prototype.init.call(this);
		this.type = null;
	}
});
var String = Type.extend({
	init: function String(){
		Type.prototype.init.call(this);
		this.s = null;
	}
});
var NamedType = StorageType.extend({
	init: function NamedType(){
		StorageType.prototype.init.call(this);
		this.name = null;
	}
});
var Array = NamedType.extend({
	init: function Array(){
		NamedType.prototype.init.call(this);
		this.mInitializer = null;
		this.elementsType = null;
		this.len = 0;
	}
});
var Pointer = NamedType.extend({
	init: function Pointer(){
		NamedType.prototype.init.call(this);
		this.base = null;
	}
});
var Procedure = NamedType.extend({
	init: function Procedure(){
		NamedType.prototype.init.call(this);
	}
});
var DefinedProcedure = Procedure.extend({
	init: function DefinedProcedure(){
		Procedure.prototype.init.call(this);
	}
});
var ProcedureArgument = Object.Type.extend({
	init: function ProcedureArgument(){
		Object.Type.prototype.init.call(this);
		this.type = null;
		this.isVar = false;
	}
});
var BasicType = NamedType.extend({
	init: function BasicType(){
		NamedType.prototype.init.call(this);
		this.mInitializer = null;
	}
});
var Field = RTL$.extend({
	init: function Field(){
		this.id = null;
		this.exported = null;
	}
});
var Record = NamedType.extend({
	init: function Record(){
		NamedType.prototype.init.call(this);
		this.fields = null;
		this.base = null;
		this.cons = null;
		this.scope = null;
		this.notExported = null;
	}
});
var NonExportedRecord = Record.extend({
	init: function NonExportedRecord(){
		Record.prototype.init.call(this);
	}
});
var Nil = Type.extend({
	init: function Nil(){
		Type.prototype.init.call(this);
	}
});
var Module = Id.extend({
	init: function Module(){
		Id.prototype.init.call(this);
		this.name = null;
	}
});
var anonymous$1 = RTL$.extend({
	init: function anonymous$1(){
		this.bool = null;
		this.ch = null;
		this.integer = null;
		this.uint8 = null;
		this.real = null;
		this.set = null;
	}
});
var basic = new anonymous$1();
var numeric = null;
var nil = null;
TypeId.prototype.description = function(){
	var t = null;
	t = this.type();
	return JsString.concat(JsString.make("type "), t.description());
}
TypeId.prototype.type = function(){
	return this.mType;
}

function finalizeRecord(closure/*PType*/){
	RTL$.typeGuard(closure, Record).finalize();
}
Record.prototype.finalize = function(){
	var i = 0;
	for (i = 0; i <= JsArray.stringsLen(this.notExported) - 1 | 0; ++i){
		JsMap.erase(this.fields, JsArray.stringsAt(this.notExported, i));
	}
	this.notExported = null;
}

function initRecord(r/*PRecord*/, name/*Type*/, cons/*Type*/, scope/*PScope*/){
	r.name = name;
	r.cons = cons;
	r.scope = scope;
	r.fields = JsMap.make();
	r.notExported = JsArray.makeStrings();
	scope.addFinalizer(finalizeRecord, r);
}

function makeNonExportedRecord(cons/*Type*/, scope/*PScope*/, base/*PRecord*/){
	var result = null;
	result = new NonExportedRecord();
	initRecord(result, null, cons, scope);
	result.base = base;
	return result;
}
TypeId.prototype.strip = function(){
	var r = null;
	if (this.mType instanceof Record){
		r = RTL$.typeGuard(this.mType, Record);
		this.mType = makeNonExportedRecord(r.cons, r.scope, r.base);
	}
	else {
		this.mType = null;
	}
}

function makeForwardTypeId(resolve/*ResolveTypeCallback*/){
	var result = null;
	result = new ForwardTypeId();
	result.resolve = resolve;
	return result;
}
ForwardTypeId.prototype.type = function(){
	if (this.mType == null){
		this.mType = this.resolve();
	}
	return this.mType;
}

function defineTypeId(tId/*VAR LazyTypeId*/, t/*PType*/){
	tId.mType = t;
}

function typeName(type/*NamedType*/){
	return type.name;
}
ProcedureId.prototype.idType = function(){
	return JsString.make("procedure");
}
String.prototype.description = function(){
	var prefix = null;
	if (JsString.len(this.s) == 1){
		prefix = JsString.make("single-");
	}
	else {
		prefix = JsString.make("multi-");
	}
	return JsString.concat(prefix, JsString.make("character string"));
}

function stringValue(s/*String*/){
	return s.s;
}

function stringLen(s/*String*/){
	return JsString.len(s.s);
}

function stringAsChar(s/*String*/, c/*VAR CHAR*/){
	var result = false;
	result = stringLen(s) == 1;
	if (result){
		c.set(JsString.at(s.s, 0));
	}
	return result;
}
Const.prototype.idType = function(){
	return JsString.make("constant");
}

function constType(c/*Const*/){
	return c.type;
}

function constValue(c/*Const*/){
	return c.value;
}
Variable.prototype.idType = function(){
	var result = null;
	if (this.readOnly){
		result = JsString.make("read-only variable");
	}
	else {
		result = JsString.make("variable");
	}
	return result;
}

function variableType(v/*Variable*/){
	return v.type;
}

function procedureType(p/*ProcedureId*/){
	return p.type;
}

function isVariableReadOnly(v/*Variable*/){
	return v.readOnly;
}
ExportedVariable.prototype.idType = function(){
	return JsString.make("imported variable");
}
TypeId.prototype.idType = function(){
	return JsString.make("type");
}
BasicType.prototype.description = function(){
	return this.name;
}
BasicType.prototype.initializer = function(cx/*Type*/){
	return this.mInitializer;
}
Nil.prototype.description = function(){
	return JsString.make("NIL");
}

function isInt(t/*PType*/){
	return t == basic.integer || t == basic.uint8;
}

function intsDescription(){
	return JsString.make("'INTEGER' or 'BYTE'");
}

function isString(t/*PType*/){
	return t instanceof Array && RTL$.typeGuard(t, Array).elementsType == basic.ch || t instanceof String;
}

function moduleName(m/*Module*/){
	return m.name;
}

function makeBasic(name/*ARRAY OF CHAR*/, initializer/*ARRAY OF CHAR*/){
	var result = null;
	result = new BasicType();
	result.name = JsString.make(name);
	result.mInitializer = JsString.make(initializer);
	return result;
}
Record.prototype.description = function(){
	var result = null;
	if (this.name != null){
		result = this.name;
	}
	else {
		result = JsString.make("anonymous RECORD");
	}
	return result;
}
Record.prototype.initializer = function(cx/*Type*/){
	return JsString.concat(JsString.concat(JsString.concat(JsString.make("new "), cx.qualifyScope(this.scope)), this.cons), JsString.make("()"));
}
Record.prototype.addField = function(f/*Field*/, type/*PType*/){
	if (JsMap.has(this.fields, f.id())){
		Errors.raise(JsString.concat(JsString.concat(JsString.make("duplicated field: '"), f.id()), JsString.make("'")));
	}
	if (this.base != null && this.base.findSymbol(f.id()) != null){
		Errors.raise(JsString.concat(JsString.concat(JsString.make("base record already has field: '"), f.id()), JsString.make("'")));
	}
	JsMap.put(this.fields, f.id(), type);
	if (!f.exported()){
		JsArray.stringsAdd(this.notExported, f.id());
	}
}
Record.prototype.findSymbol = function(id/*Type*/){
	var result = null;
	if (!JsMap.find(this.fields, id, {set: function($v){result = $v;}, get: function(){return result;}}) && this.base != null){
		result = this.base.findSymbol(id);
	}
	return result;
}

function recordBase(r/*Record*/){
	return r.base;
}

function setRecordBase(r/*Record*/, type/*PRecord*/){
	r.base = type;
}

function recordScope(r/*Record*/){
	return r.scope;
}

function recordConstructor(r/*Record*/){
	return r.cons;
}

function recordOwnFields(r/*Record*/){
	return r.fields;
}

function pointerBase(p/*Pointer*/){
	var result = null;
	result = p.base.type();
	return RTL$.typeGuard(result, Record);
}
Pointer.prototype.description = function(){
	var base = null;
	var result = null;
	if (this.name != null){
		result = this.name;
	}
	else {
		base = pointerBase(this);
		result = JsString.concat(JsString.make("POINTER TO "), base.description());
	}
	return result;
}
Pointer.prototype.initializer = function(cx/*Type*/){
	return JsString.make("null");
}

function foldArrayDimensions(a/*Array*/, sizes/*VAR Type*/, of/*VAR Type*/){
	if (a.len != openArrayLength && a.elementsType instanceof Array){
		foldArrayDimensions(RTL$.typeGuard(a.elementsType, Array), sizes, of);
		sizes.set(JsString.concat(JsString.concat(JsString.fromInt(a.len), JsString.make(", ")), sizes.get()));
	}
	else {
		if (a.len != openArrayLength){
			sizes.set(JsString.fromInt(a.len));
		}
		of.set(a.elementsType.description());
	}
}
Array.prototype.description = function(){
	var result = null;
	var sizes = null;var of = null;
	if (this.elementsType == null){
		result = this.name;
	}
	else {
		foldArrayDimensions(this, {set: function($v){sizes = $v;}, get: function(){return sizes;}}, {set: function($v){of = $v;}, get: function(){return of;}});
		if (sizes == null){
			sizes = JsString.make("");
		}
		else {
			sizes = JsString.concat(JsString.make(" "), sizes);
		}
		result = JsString.concat(JsString.concat(JsString.concat(JsString.make("ARRAY"), sizes), JsString.make(" OF ")), of);
	}
	return result;
}
Array.prototype.initializer = function(cx/*Type*/){
	return this.mInitializer;
}

function arrayElementsType(a/*Array*/){
	return a.elementsType;
}

function arrayLength(a/*Array*/){
	return a.len;
}
Procedure.prototype.initializer = function(cx/*Type*/){
	return JsString.make("null");
}
Procedure.prototype.description = function(){
	return this.name;
}
ProcedureArgument.prototype.description = function(){
	var result = null;
	if (this.isVar){
		result = JsString.make("VAR ");
	}
	else {
		result = JsString.makeEmpty();
	}
	return JsString.concat(result, this.type.description());
}

function makeProcedureArgument(type/*PType*/, isVar/*BOOLEAN*/){
	var result = null;
	result = new ProcedureArgument();
	result.type = type;
	result.isVar = isVar;
	return result;
}
Module.prototype.idType = function(){
	return JsString.make("MODULE");
}

function makeTypeId(type/*PType*/){
	var result = null;
	result = new TypeId();
	result.mType = type;
	return result;
}

function makeLazyTypeId(){
	var result = null;
	result = new LazyTypeId();
	return result;
}

function makeString(s/*Type*/){
	var result = null;
	result = new String();
	result.s = s;
	return result;
}

function makeArray(name/*Type*/, initializer/*Type*/, elementsType/*PType*/, len/*INTEGER*/){
	var result = null;
	result = new Array();
	result.name = name;
	result.mInitializer = initializer;
	result.elementsType = elementsType;
	result.len = len;
	return result;
}

function makePointer(name/*Type*/, base/*PTypeId*/){
	var result = null;
	result = new Pointer();
	result.name = name;
	result.base = base;
	return result;
}

function makeRecord(name/*Type*/, cons/*Type*/, scope/*PScope*/){
	var result = null;
	result = new Record();
	initRecord(result, name, cons, scope);
	return result;
}

function makeConst(type/*PType*/, value/*JS.var*/){
	var result = null;
	result = new Const();
	result.type = type;
	result.value = value;
	return result;
}

function makeVariable(type/*PType*/, readOnly/*BOOLEAN*/){
	var result = null;
	result = new Variable();
	result.type = type;
	result.readOnly = readOnly;
	return result;
}

function makeVariableRef(type/*PType*/){
	var result = null;
	result = new VariableRef();
	result.type = type;
	result.readOnly = false;
	return result;
}

function makeExportedVariable(v/*Variable*/){
	var result = null;
	result = new ExportedVariable();
	result.type = v.type;
	result.readOnly = true;
	return result;
}

function makeProcedure(type/*PType*/){
	var result = null;
	result = new ProcedureId();
	result.type = type;
	return result;
}

function initProcedure(p/*Procedure*/, name/*Type*/){
	p.name = name;
}

function initModule(m/*Module*/, name/*Type*/){
	m.name = name;
}
basic.bool = makeBasic("BOOLEAN", "false");
basic.ch = makeBasic("CHAR", "0");
basic.integer = makeBasic("INTEGER", "0");
basic.uint8 = makeBasic("BYTE", "0");
basic.real = makeBasic("REAL", "0");
basic.set = makeBasic("SET", "0");
numeric = JsArray.make();
JsArray.add(numeric, basic.integer);
JsArray.add(numeric, basic.uint8);
JsArray.add(numeric, basic.real);
nil = new Nil();
exports.openArrayLength = openArrayLength;
exports.Id = Id;
exports.Type = Type;
exports.TypeId = TypeId;
exports.ForwardTypeId = ForwardTypeId;
exports.Const = Const;
exports.Variable = Variable;
exports.VariableRef = VariableRef;
exports.ProcedureId = ProcedureId;
exports.String = String;
exports.NamedType = NamedType;
exports.Array = Array;
exports.Pointer = Pointer;
exports.Procedure = Procedure;
exports.DefinedProcedure = DefinedProcedure;
exports.ProcedureArgument = ProcedureArgument;
exports.Record = Record;
exports.NonExportedRecord = NonExportedRecord;
exports.Module = Module;
exports.basic = function(){return basic;};
exports.numeric = function(){return numeric;};
exports.nil = function(){return nil;};
exports.initRecord = initRecord;
exports.makeForwardTypeId = makeForwardTypeId;
exports.defineTypeId = defineTypeId;
exports.typeName = typeName;
exports.stringValue = stringValue;
exports.stringLen = stringLen;
exports.stringAsChar = stringAsChar;
exports.constType = constType;
exports.constValue = constValue;
exports.variableType = variableType;
exports.procedureType = procedureType;
exports.isVariableReadOnly = isVariableReadOnly;
exports.isInt = isInt;
exports.intsDescription = intsDescription;
exports.isString = isString;
exports.moduleName = moduleName;
exports.recordBase = recordBase;
exports.setRecordBase = setRecordBase;
exports.recordScope = recordScope;
exports.recordConstructor = recordConstructor;
exports.recordOwnFields = recordOwnFields;
exports.pointerBase = pointerBase;
exports.arrayElementsType = arrayElementsType;
exports.arrayLength = arrayLength;
exports.makeProcedureArgument = makeProcedureArgument;
exports.makeTypeId = makeTypeId;
exports.makeLazyTypeId = makeLazyTypeId;
exports.makeString = makeString;
exports.makeArray = makeArray;
exports.makePointer = makePointer;
exports.makeRecord = makeRecord;
exports.makeConst = makeConst;
exports.makeVariable = makeVariable;
exports.makeVariableRef = makeVariableRef;
exports.makeExportedVariable = makeExportedVariable;
exports.makeProcedure = makeProcedure;
exports.initProcedure = initProcedure;
exports.initModule = initModule;
