"use strict";

var Class = require("rtl.js").Class;
var Errors = require("errors.js");

var Id = Class.extend({
    init: function Id(){}
});

var Type = Id.extend({
    init: function Type(){
        Id.prototype.init.call(this);
    }
});

var TypeId = Id.extend({
    init: function TypeId(type){
        Id.prototype.init.call(this);
        this._type = type;
    },
    type: function(){return this._type;},
    description: function(){return 'type ' + this._type.description();}
});

var LazyTypeId = TypeId.extend({
    init: function LazyTypeId(){
        TypeId.prototype.init.call(this);
    },
    define: function(type){return this._type = type;}
});

exports.String = Type.extend({
    init: function TypeString(s){
        Type.prototype.init.call(this);
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
        Type.prototype.init.call(this);
        this.__name = name;
        this.__initValue = initValue;
    },
    idType: function(){return "type";},
    name: function() {return this.__name;},
    description: function(){return this.name();},
    initializer: function() {return this.__initValue;}
});

exports.Basic = BasicType;

exports.Array = BasicType.extend({
    init: function ArrayType(name, initializer, elementsType, size){
        BasicType.prototype.init.call(this, name, initializer);
        this.__elementsType = elementsType;
        this.__size = size;
    },
    elementsType: function(){return this.__elementsType;},
    length: function(){return this.__size;}
});

exports.Pointer = BasicType.extend({
    init: function PointerType(name, base){
        BasicType.prototype.init.call(this, name, "null");
        this.__base = base;
    },
    description: function(){
        return this.name() || "POINTER TO " + this.baseType().description();
    },
    baseType: function(){
        if (this.__base instanceof exports.ForwardRecord)
            this.__base = this.__base.resolve();
        return this.__base;
    }
});

exports.ForwardRecord = Type.extend({
    init: function ForwardRecord(resolve){
        Type.prototype.init.call(this);
        this.__resolve = resolve;
    },
    resolve: function(){return this.__resolve();}
});

exports.Record = BasicType.extend({
    init: function RecordType(name, cons){
        BasicType.prototype.init.call(this, name, "new " + cons + "()");
        this.__cons = cons;        
        this.__fields = {};
        this.__base = undefined;
    },
    cons: function(){return this.__cons;},
    addField: function(field, type){
        var name = field.id();
        if (this.__fields.hasOwnProperty(name))
            throw new Errors.Error("duplicated field: '" + name + "'");
        if (this.__base && this.__base.findSymbol(name))
            throw new Errors.Error("base record already has field: '" + name + "'");
        this.__fields[name] = type;
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
    description: function(){
        return this.name() || "anonymous RECORD";
    }
});

var NilType = Type.extend({
    init: function NilType(){Type.prototype.init.call(this);},
    idType: function(){return "NIL";},
    description: function(){return "NIL";}
});

var basic = {
    bool: new BasicType("BOOLEAN", false),
    ch: new BasicType("CHAR", 0),
    integer: new BasicType("INTEGER", 0),
    real: new BasicType("REAL", 0),
    set: new BasicType("SET", 0)
};
exports.basic = basic;
exports.numeric = [basic.integer, basic.real];

exports.nil = new NilType();

exports.Const = Id.extend({
    init: function Const(type, value){
        Id.prototype.init.call(this);
        this.__type = type;
        this.__value = value;
    },
    idType: function(){return "constant";},
    type: function(){return this.__type;},
    value: function(){return this.__value;}
});

var Variable = Id.extend({
    init: function Variable(type, isVar, isReadOnly){
        Id.prototype.init.call(this);
        this.__type = type;
        this.__isVar = isVar;
        this.__isReadOnly = isReadOnly;
    },
    idType: function(){return this.__isReadOnly ? "read-only variable" : "variable";},
    type: function(){return this.__type;},
    isVar: function(){return this.__isVar;},
    isReadOnly: function(){return this.__isReadOnly;}
});

var ExportedVariable = Variable.extend({
    init: function ExportedVariable(variable){
        Variable.prototype.init.call(this, variable.type(), variable.isVar(), true);
    },
    idType: function(){return "imported variable";}
});

exports.Procedure = BasicType.extend({
    init: function Procedure(name){
        BasicType.prototype.init.call(this, name, "null");
    },
    idType: function(){return "procedure";}
});

var Module = Id.extend({
    init: function Type$Module(name){
        Id.prototype.init.call(this);
        this.__name = name;
    },
    name: function(){return this.__name;}
});

exports.Variable = Variable;
exports.ExportedVariable = ExportedVariable;
exports.Module = Module;
exports.Type = Type;
exports.TypeId = TypeId;
exports.LazyTypeId = LazyTypeId;
