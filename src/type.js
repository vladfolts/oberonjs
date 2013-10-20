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
    description: function(){return 'type ' + this._type.description();},
    strip: function(){
        this._type = this._type instanceof Record 
                   ? new NonExportedRecord(this._type.cons(), this._type.scope(), this._type.baseType())
                   : undefined;
    }
});

var ForwardTypeId = TypeId.extend({
    init: function Type$ForwardTypeId(resolve){
        TypeId.prototype.init.call(this);
        this.__resolve = resolve;
    },
    type: function(){
        if (!this._type)
            this._type = this.__resolve();
        return this._type;
    }
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
    initializer: function(context){return this.__initValue;}
});

exports.Basic = BasicType;

function foldArrayDimensions(a){
    var result = a.length();
    var next = a.elementsType();
    if (result !== undefined
        && next instanceof ArrayType){
        var r = foldArrayDimensions(next);
        return [result + ", " + r[0], r[1]];
    }
    return [result, next.description()];
}

var ArrayType = BasicType.extend({
    init: function ArrayType(name, initializer, elementsType, size){
        BasicType.prototype.init.call(this, name, initializer);
        this.__elementsType = elementsType;
        this.__size = size;
    },
    elementsType: function(){return this.__elementsType;},
    length: function(){return this.__size;},
    description: function(){
        if (this.__elementsType === undefined) // special arrays, see procedure "LEN"
            return this.name();
        var desc = foldArrayDimensions(this);
        var sizes = (desc[0] === undefined ? "" : " " + desc[0]);
        return "ARRAY" + sizes + " OF " + desc[1];
    }
});

exports.Pointer = BasicType.extend({
    init: function PointerType(name, base){
        BasicType.prototype.init.call(this, name, "null");
        this.__base = base;
    },
    description: function(){
        return this.name() || "POINTER TO " + this.baseType().description();
    },
    baseType: function(){return this.__base.type();}
});

var Record = BasicType.extend({
    init: function Type$Record(name, cons, scope){
        BasicType.prototype.init.call(this, name);
        this.__cons = cons;        
        this.__scope = scope;
        this.__fields = {};
        this.__base = undefined;
    },
    initializer: function(context){
        return "new " + context.qualifyScope(this.__scope) + this.__cons + "()";
    },
    scope: function(){return this.__scope;},
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

var NonExportedRecord = Record.extend({
    init: function Scope$NonExportedRecord(cons, scope, base){
        Record.prototype.init.call(this, undefined, cons, scope);
        this.setBaseType(base);
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
    init: function Variable(type, isReadOnly){
        Id.prototype.init.call(this);
        this.__type = type;
        this.__isReadOnly = isReadOnly;
    },
    idType: function(){return this.__isReadOnly ? "read-only variable" : "variable";},
    type: function(){return this.__type;},
    isReadOnly: function(){return this.__isReadOnly;}
});

var VariableRef = Variable.extend({
    init: function Type$VariableRef(type){
        Variable.prototype.init.call(this, type, false);
    }
});

var ExportedVariable = Variable.extend({
    init: function ExportedVariable(variable){
        Variable.prototype.init.call(this, variable.type(), true);
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

exports.Array = ArrayType;
exports.Variable = Variable;
exports.VariableRef = VariableRef;
exports.ExportedVariable = ExportedVariable;
exports.Module = Module;
exports.NonExportedRecord = NonExportedRecord;
exports.Record = Record;
exports.Type = Type;
exports.TypeId = TypeId;
exports.ForwardTypeId = ForwardTypeId;
exports.LazyTypeId = LazyTypeId;
