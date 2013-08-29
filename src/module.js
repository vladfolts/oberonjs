"use strict";

var Code = require("code.js");
var Errors = require("errors.js");
var Procedure = require("procedure.js");
var Symbol = require("symbol.js");
var Type = require("type.js");

var AnyType = Type.Basic.extend({
    init: function AnyType(){
        Type.Basic.prototype.init.call(this, "ANY");
    },
    findSymbol: function(){return this;},
    callGenerator: function(context, id){
        return new Procedure.CallGenerator(context, id);
    }
});

var any = new AnyType();

var doProcId = "do$";

var doProcSymbol = (function(){
    var description = "JS predefined procedure 'do'";

    var DoProcCallGenerator = Procedure.CallGenerator.extend({
        init: function DoProcCallGenerator(context, id, type){
            Procedure.CallGenerator.prototype.init.call(this, context, id, type);
            this.__code = undefined;
        },
        prolog: function(id){return "";},
        checkArgument: function(pos, e){
            var type = e.type();
            if (!(type instanceof Type.String))
                throw new Errors.Error(
                    "string is expected as an argument of " + description
                    + ", got " + type.description());
            
            this.__code = type.value();
            return Procedure.CallGenerator.prototype.checkArgument.call(this, pos, e);
        },
        epilog: function(){return "";},
        writeArgumentCode: function(){},
        callExpression: function(){
            return new Code.Expression(this.__code);
        }
    });

    var args = [new Procedure.Arg(undefined, false)];
    var ProcType = Type.Procedure.extend({
        init: function(){
            Type.Procedure.prototype.init.call(this, doProcId);
        },
        description: function(){return description;},
        args: function(){return args;},
        result: function(){return undefined;},
        callGenerator: function(context, id){
            return new DoProcCallGenerator(context, id, this);
        }
        });

    return new Symbol.Symbol(doProcId, new ProcType());
})();

var JSModule = Type.Module.extend({
    init: function Module$JSModule(){
        Type.Module.prototype.init.call(this);
    },
    name: function(){return "this";},
    findSymbol: function(id){
        return new Symbol.Found(
            id == doProcId ? doProcSymbol
                           : new Symbol.Symbol(id, any));
    }
});

exports.AnyType = AnyType;
exports.JS = JSModule;
