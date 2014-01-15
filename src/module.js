"use strict";

var Code = require("js/Code.js");
var Errors = require("js/Errors.js");
var Procedure = require("procedure.js");
var Symbol = require("js/Symbols.js");
var Type = require("js/Types.js");

var AnyTypeProc = Type.Procedure.extend({
    init: function AnyTypeProc(){
        Type.Procedure.prototype.init.call("PROCEDURE: JS.var");
    },
    result: function(){return any;}
});

var anyProc = new AnyTypeProc();

var AnyType = Type.Type.extend({
    init: function AnyType(){
        Type.Type.prototype.init.call(this);
    },
    description: function(){return "JS.var";},
    initializer: function(){return undefined;},
    findSymbol: function(){return this;},
    callGenerator: function(context, id){
        return new Procedure.CallGenerator(context, id, anyProc);
    }
});

var any = new AnyType();

var doProcId = "do$";
var varTypeId = "var$";

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
            
            this.__code = Type.stringValue(type);
            return Procedure.CallGenerator.prototype.checkArgument.call(this, pos, e);
        },
        epilog: function(){return "";},
        writeArgumentCode: function(){},
        callExpression: function(){
            return Code.makeExpression(this.__code);
        }
    });

    var args = [Type.makeProcedureArgument(undefined, false)];
    var ProcType = Type.Procedure.extend({
        init: function(){
            Type.Procedure.prototype.init.call(this);
            Type.initProcedure(this, doProcId);
        },
        description: function(){return description;},
        args: function(){return args;},
        result: function(){return undefined;},
        callGenerator: function(context, id){
            return new DoProcCallGenerator(context, id, this);
        }
        });

    return Symbol.makeSymbol(doProcId, new ProcType());
})();

var varTypeSymbol = function(){
    return Symbol.makeSymbol(varTypeId, Type.makeTypeId(any));
}();

var JSModule = Type.Module.extend({
    init: function Module$JSModule(){
        Type.Module.prototype.init.call(this);
        Type.initModule(this, "this");
    },
    findSymbol: function(id){
        return Symbol.makeFound(
            id == doProcId ? doProcSymbol
          : id == varTypeId ? varTypeSymbol
          : Symbol.makeSymbol(id, any));
    }
});

exports.AnyType = AnyType;
exports.JS = JSModule;
