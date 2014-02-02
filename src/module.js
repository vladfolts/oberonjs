"use strict";

var Code = require("js/Code.js");
var Errors = require("js/Errors.js");
var Procedure = require("js/Procedure.js");
var Symbol = require("js/Symbols.js");
var Type = require("js/Types.js");

var AnyTypeProc = Type.Procedure.extend({
    init: function AnyTypeProc(){
        Type.Procedure.prototype.init.call("PROCEDURE: JS.var");
    },
    result: function(){return any;},
    args: function(){return undefined;}
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
        return new Procedure.makeProcCallGenerator(context, id, anyProc);
    }
});

var any = new AnyType();

var doProcId = "do$";
var varTypeId = "var$";

var doProcSymbol = (function(){
    var description = "JS predefined procedure 'do'";

    var expectedArgs = [Type.makeProcedureArgument(undefined, false)];

    var Call = Procedure.Call.extend({
        init: function DoProcedureCall(){
            Procedure.Call.prototype.init.call(this);
        },
        make: function(args, cx){
            Procedure.checkArgumentsCount(args.length, expectedArgs.length);
            var type = args[0].type();
            if (!(type instanceof Type.String))
                throw new Errors.Error(
                    "string is expected as an argument of " + description
                    + ", got " + type.description());
            
            return Code.makeExpression(Type.stringValue(type));
        }
    });

    var call = new Call();
    var ProcType = Type.Procedure.extend({
        init: function(){
            Type.Procedure.prototype.init.call(this);
            Type.initProcedure(this, doProcId);
        },
        description: function(){return description;},
        callGenerator: function(context){
            return Procedure.makeCallGenerator(call, context);
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
