"use strict";

var Class = require("rtl.js").Class;
var Errors = require("js/Errors.js");
var Procedure = require("procedure.js");
var Symbol = require("js/Symbols.js");
var Type = require("js/Types.js");

var stdSymbols = function(){
    var symbols = {};
    var basicTypes = Type.basic();
    for(var t in basicTypes){
        var type = basicTypes[t];
        var name = Type.typeName(type);
        symbols[name] = Symbol.makeSymbol(name, Type.makeTypeId(type));
    }
    
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
        this.__finalizers = [];
    },
    id: function(){return this.__id;},
    addSymbol: function(symbol){
        var id = symbol.id();
        if (this.findSymbol(id))
            throw new Errors.Error( "'" + id + "' already declared");
        this.__symbols[id] = symbol;
    },
    addFinalizer: function(f, closure){this.__finalizers.push(f.bind(undefined, closure));},
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
    addUnresolved: function(id){
        if (this.__unresolved.indexOf(id) == -1)
            this.__unresolved.push(id);
    },
    unresolved: function(){return this.__unresolved;},
    close: function(){
        for(var i = 0; i < this.__finalizers.length; ++i)
            this.__finalizers[i]();

        // make second close() call safe and free memory
        this.__finalizers = []; 
    }
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

var CompiledModule = Type.Module.extend({
    init: function Scope$CompiledModule(id){
        Type.Module.prototype.init.call(this);
        Type.initModule(this, id);
        this.__exports = {};
    },
    defineExports: function(exports){
        for(var id in exports){
            var symbol = exports[id];
            if (symbol.isVariable())
                symbol = Symbol.makeSymbol(
                    id,
                    Type.makeExportedVariable(symbol.info()));
            this.__exports[id] = symbol;
        }
    },  
    findSymbol: function(id){
        var s = this.__exports[id];
        if (!s)
            return undefined;
        return Symbol.makeFound(s);
    }
});

var Module = Scope.extend({
    init: function Scope$Module(name){
        Scope.prototype.init.call(this, "module");
        this.__name = name;
        this.__exports = {};
        this.__symbol = Symbol.makeSymbol(name, new CompiledModule(name));
        this.addSymbol(this.__symbol);
    },
    module: function(){return this.__symbol;},
    addSymbol: function(symbol, exported){
        Scope.prototype.addSymbol.call(this, symbol, exported);
        if (exported)
            this.__exports[symbol.id()] = symbol;
    },
    exports: function(){return this.__exports;}
});

exports.Procedure = ProcedureScope;
exports.Module = Module;