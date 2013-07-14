"use strict";

var Class = require("rtl.js").Class;
var Errors = require("errors.js");
var Procedure = require("procedure.js");
var Symbol = require("symbol.js");
var Type = require("type.js");

var stdSymbols = function(){
    var symbols = {};
    for(var t in Type.basic){
        var type = Type.basic[t];
        symbols[type.name()] = new Symbol.Symbol(type.name(), new Type.TypeId(type));
    }
    symbols["LONGREAL"] = new Symbol.Symbol("LONGREAL", new Type.TypeId(Type.basic.real));
    
    var predefined = Procedure.predefined;
    for(var i = 0; i < predefined.length; ++i){
        var s = predefined[i];
        symbols[s.id()] = s;
    }
    return symbols;
}();

var Scope = Class.extend({
    init: function Scope(id){
        this.__id = id;
        this.__symbols = {};
        for(var p in stdSymbols)
            this.__symbols[p] = stdSymbols[p];
        this.__unresolved = [];
    },
    id: function(){return this.__id;},
    addSymbol: function(symbol){
        var id = symbol.id();
        if (this.findSymbol(id))
            throw new Errors.Error( "'" + id + "' already declared");
        this.__symbols[id] = symbol;
    },
    resolve: function(symbol){
        var id = symbol.id();
        var i = this.__unresolved.indexOf(id);
        if (i != -1){
            var info = symbol.info();
            var type = info.type();
            if (type !== undefined && !(type instanceof Type.Record))
                throw new Errors.Error(
                    "'" + id + "' must be of RECORD type because it was used before in the declation of POINTER");
            this.__unresolved.splice(i, 1);
        }
    },
    findSymbol: function(ident){return this.__symbols[ident];},
    addUnresolved: function(id){this.__unresolved.push(id);},
    unresolved: function(){return this.__unresolved;}
});

var ProcedureScope = Scope.extend({
    init: function ProcedureScope(){
        Scope.prototype.init.call(this, "procedure");
    },
    addSymbol: function(symbol, exported){
        if (exported)
            throw new Errors.Error("cannot export from within procedure: " 
                + symbol.info().idType() + " '" + symbol.id() + "'");
        Scope.prototype.addSymbol.call(this, symbol, exported);
    }
});

var Module = Scope.extend({
    init: function Module(){
        Scope.prototype.init.call(this, "module");
        this.__exports = [];
    },
    addSymbol: function(symbol, exported){
        if (exported)
            this.__exports.push(symbol);
        Scope.prototype.addSymbol.call(this, symbol, exported);
    },
    resolve: function(symbol){
        var i = this.__exports.indexOf(symbol);
        if (i != -1)
            // remove non-record types from generated exports
            if (symbol.isType() && !(symbol.info().type() instanceof Type.Record))
                this.__exports.splice(i, 1);
        Scope.prototype.resolve.call(this, symbol);
    },
    exports: function(){return this.__exports;}
});

exports.Procedure = ProcedureScope;
exports.Module = Module;