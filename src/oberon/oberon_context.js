"use strict";

var Code = require("js/Code.js");
var Context = require("context.js");
var Errors = require("js/Errors.js");
var op = require("js/Operator.js");
var Type = require("js/Types.js");

var RecordDecl = Context.RecordDecl.extend({
    init: function OberonContext$RecordDecl(context){
        Context.RecordDecl.prototype.init.call(this, context, Type.makeRecord);
    }
});

var VariableDeclaration = Context.VariableDeclaration.extend({
    init: function(context){
        Context.VariableDeclaration.prototype.init.call(this, context);
    },
    checkExport: function(id){
        var type = this.type();
        if (type instanceof Type.Record || type instanceof Type.Array)
            throw new Errors.Error("variable '" + id + "' cannot be exported: only scalar variables can be exported");
    }
});

var ProcedureCall = Context.Chained.extend({
    init: function ProcedureCallContext(context){
        Context.Chained.prototype.init.call(this, context);
        this.__type = undefined;
        this.__id = undefined;
        this.__procCall = undefined;
        this.__code = Code.makeSimpleGenerator();
    },
    setDesignator: function(d){
        this.__type = d.type();
        this.__id = d.code();
        this.__procCall = Context.makeProcCall(this, this.__type, d.info());
        this.__callExpression = undefined;
    },
    codeGenerator: function(){return this.__code;},
    type: function(){return this.__type;},
    handleMessage: function(msg){
        if (msg == Context.beginCallMsg || msg == Context.endCallMsg)
            return undefined;
        return Context.Chained.prototype.handleMessage.call(this, msg);
    },
    handleExpression: function(e){this.__procCall.handleArgument(e);},
    callExpression: function(){return this.__callExpression;},
    endParse: function(){
        var e = this.__procCall.end();
        this.__callExpression = Code.makeExpressionWithPrecedence(this.__id + e.code(), e.type(), undefined, e.constValue(), e.maxPrecedence());
    }
});

var StatementProcedureCall = ProcedureCall.extend({
    init: function StatementProcedureCallContext(context){
        ProcedureCall.prototype.init.call(this, context);
    },
    endParse: function(){
        ProcedureCall.prototype.endParse.call(this);
        var e = this.callExpression();
        Context.assertProcStatementResult(e.type());
        this.parent().codeGenerator().write(e.code());
    }
});

var ExpressionProcedureCall = ProcedureCall.extend({
    init: function ExpressionProcedureCall(context){
        ProcedureCall.prototype.init.call(this, context);
        this.__designator = undefined;
        this.__hasActualParameters = false;
    },
    setDesignator: function(d){
        this.__designator = d;
    },
    handleMessage: function(msg){
        if (msg == Context.beginCallMsg){
            ProcedureCall.prototype.setDesignator.call(this, this.__designator);
            this.__hasActualParameters = true;
            return undefined;
        }
        return ProcedureCall.prototype.handleMessage.call(this, msg);
    },
    endParse: function(){
        var parent = this.parent();
        if (this.__hasActualParameters){
            ProcedureCall.prototype.endParse.call(this);
            parent.handleFactor(this.callExpression());
        }
        else{
            var d = this.__designator;
            parent.setDesignator(d);
        }
    }
});

var Assignment = Context.Chained.extend({
    init: function AssignmentContext(context){
        Context.Chained.prototype.init.call(this, context);
        this.__left = undefined;
    },
    codeGenerator: function(){return Code.nullGenerator();},
    setDesignator: function(d){
        this.__left = Code.makeExpression(d.code(), d.type(), d);
    },
    handleExpression: function(e){
        this.parent().codeGenerator().write(op.assign(this.__left, e, this.language()));
    }
});

exports.Assignment = Assignment;
exports.ExpressionProcedureCall = ExpressionProcedureCall;
exports.RecordDecl = RecordDecl;
exports.StatementProcedureCall = StatementProcedureCall;
exports.VariableDeclaration = VariableDeclaration;
