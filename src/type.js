var Class = require("rtl.js").Class;
var Errors = require("errors.js");

var Id = Class.extend({
	init: function Id(){},
});

var Type = Id.extend({
	init: function Type(){
		Id.prototype.init.bind(this)();
	},
	idType: function(){return "type";},
	isProcedure: function(){return false;}
});

exports.Type = Type;

exports.String = Type.extend({
	init: function TypeString(s){
		Type.prototype.init.bind(this)();
		this.__s = s;
	},
	idType: function(){return "string";},
	description: function(){return (this.__s.length == 1 ? "single-" : "multi-") + "character string";},
	value: function(){return this.__s;},
	asChar: function(){return this.__s.length == 1 ? this.__s.charCodeAt(0) : undefined;},
	length: function(){return this.__s.length;}
});

var BasicType = Type.extend({
	init: function BasicType(name, initValue){
		Type.prototype.init.bind(this)();
		this.__name = name;
		this.__initValue = initValue;
	},
	name: function() {return this.__name;},
	description: function(){return this.name();},
	initializer: function() {return this.__initValue;}
});

exports.Basic = BasicType;

exports.Array = BasicType.extend({
	init: function ArrayType(name, initializer, elementsType, size){
		BasicType.prototype.init.bind(this)(name, initializer);
		this.__elementsType = elementsType;
		this.__size = size;
	},
	elementsType: function(){return this.__elementsType;},
	length: function(){return this.__size;}
});

exports.Pointer = BasicType.extend({
	init: function PointerType(name, base){
		BasicType.prototype.init.bind(this)(name, "null");
		this.__base = base;
	},
	description: function(){
		var name = this.name();
		if (name.indexOf("$") != -1)
			return "POINTER TO " + this.baseType().description();
		return name;
	},
	baseType: function(){
		if (this.__base instanceof exports.ForwardRecord)
			this.__base = this.__base.resolve();
		return this.__base;
	}
});

exports.ForwardRecord = Type.extend({
	init: function(resolve){
		Type.prototype.init.bind(this)();
		this.__resolve = resolve;
	},
	resolve: function(){return this.__resolve();}
});

exports.Record = BasicType.extend({
	init: function RecordType(name){
		BasicType.prototype.init.bind(this)(name, "new " + name + "()");
		this.__fields = {};
		this.__base = undefined;
		this.__finalized = false;
	},
	addField: function(field, type){
		if (this.__fields.hasOwnProperty(field))
			throw new Errors.Error("duplicated field: '" + field + "'");
		if (this.__base && this.__base.findSymbol(field))
			throw new Errors.Error("base record already has field: '" + field + "'");
		this.__fields[field] = type;
	},
	ownFields: function() {return this.__fields;},
	findSymbol: function(field){
		var result = this.__fields[field];
		if ( !result && this.__base)
			result = this.__base.findSymbol(field);
		return result;
	},
	baseType: function() {return this.__base;},
	setBaseType: function(type) {this.__base = type;},
	finalize: function(){this.__finalized = true;},
	description: function(){
		var name = this.name();
		if (name.indexOf("$") != -1)
			return "anonymous RECORD";
		return name;
	}
});

var NilType = Type.extend({
	init: function NilType(){Type.prototype.init.bind(this)();},
	idType: function(){return "NIL";},
	description: function(){return "NIL";}
});

exports.basic = {
	bool: new BasicType("BOOLEAN", false),
	char: new BasicType("CHAR", 0),
	int: new BasicType("INTEGER", 0),
	real: new BasicType("REAL", 0),
	set: new BasicType("SET", 0)
};

exports.nil = new NilType();

exports.Const = Id.extend({
	init: function Const(type, value){
		Id.prototype.init.bind(this)();
		this.__type = type;
		this.__value = value;
	},
	idType: function(){return "constant";},
	type: function(){return this.__type;},
	value: function(){return this.__value;}
});

exports.Variable = Id.extend({
	init: function Variable(type, isVar, isReadOnly){
		Id.prototype.init.bind(this)();
		this.__type = type;
		this.__isVar = isVar;
		this.__isReadOnly = isReadOnly;
	},
	idType: function(){return this.__isReadOnly ? "read-only variable" : "variable";},
	type: function(){return this.__type;},
	isVar: function(){return this.__isVar;},
	isReadOnly: function(){return this.__isReadOnly;}
});

exports.Procedure = Id.extend({
	init: function Procedure(type){
		Id.prototype.init.bind(this)();
		this.__type = type;
	},
	idType: function(){return "procedure";},
	type: function(){return this.__type;}
});

var Symbol = Class.extend({
	init: function Symbol(id, info){
		this.__id = id;
		this.__info = info;
	},
	id: function(){return this.__id;},
	info: function(){return this.__info;},
	isVariable: function(){return this.__info instanceof exports.Variable;},
	isConst: function(){return this.__info instanceof exports.Const;},
	isType: function(){return this.__info instanceof Type;},
	isProcedure: function(){return this.__info instanceof exports.Procedure;},
});

exports.Symbol = Symbol;
