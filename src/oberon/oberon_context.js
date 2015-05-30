"use strict";

var CodeGenerator = require("js/CodeGenerator.js");
var Context = require("context.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var op = require("js/Operator.js");
var Record = require("js/Record.js");
var Type = require("js/Types.js");

var RecordDecl = Context.RecordDecl.extend({
    init: function OberonContext$RecordDecl(context){
        Context.RecordDecl.prototype.init.call(this, context, Record.Type);
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
        this.attributes = {};
        this.__type = undefined;
        this.__id = undefined;
        this.__procCall = undefined;
        this.__code = CodeGenerator.makeSimpleGenerator();
    },
    procCall: function(){
        if (!this.__procCall){
            var d = this.attributes.designator;
            this.__type = d.type();
            this.__id = d.code();
            this.__procCall = Context.makeProcCall(this, this.__type, d.info());
            this.__callExpression = undefined;
        }
        return this.__procCall;
    },
    codeGenerator: function(){return this.__code;},
    type: function(){return this.__type;},
    handleMessage: function(msg){
        if (msg == Context.beginCallMsg || msg == Context.endCallMsg)
            return undefined;
        return Context.Chained.prototype.handleMessage.call(this, msg);
    },
    handleExpression: function(e){
        this.procCall().handleArgument(e);
    },
    callExpression: function(){
        if (!this.__callExpression){
            var e = this.procCall().end();
            this.__callExpression = new Expression.Type(this.__id + e.code(), e.type(), undefined, e.constValue(), e.maxPrecedence());
        }
        return this.__callExpression;
    }
});

var StatementProcedureCall = ProcedureCall.extend({
    init: function StatementProcedureCallContext(context){
        ProcedureCall.prototype.init.call(this, context);
    },
    endParse: function(){
        var e = this.callExpression();
        Context.assertProcStatementResult(e.type());
        this.parent().codeGenerator().write(e.code());
    }
});

var ExpressionProcedureCall = ProcedureCall.extend({
    init: function ExpressionProcedureCall(context){
        ProcedureCall.prototype.init.call(this, context);
        this.__hasActualParameters = false;
    },
    handleMessage: function(msg){
        if (msg == Context.beginCallMsg){
            this.__hasActualParameters = true;
            return;
        }
        return ProcedureCall.prototype.handleMessage.call(this, msg);
    },
    endParse: function(){
        var e = this.__hasActualParameters 
              ? this.callExpression()
              : Context.designatorAsExpression(this.attributes.designator); 
        this.parent().handleExpression(e);
    }
});

var Assignment = Context.Chained.extend({
    init: function AssignmentContext(context){
        Context.Chained.prototype.init.call(this, context);
        this.attributes = {};
    },
    codeGenerator: function(){return CodeGenerator.nullGenerator();},
    handleExpression: function(e){
        var d = this.attributes.designator;
        var left = Expression.make(d.code(), d.type(), d);
        this.parent().codeGenerator().write(op.assign(left, e, this.root().language()));
    }
});

exports.Assignment = Assignment;
exports.ExpressionProcedureCall = ExpressionProcedureCall;
exports.RecordDecl = RecordDecl;
exports.StatementProcedureCall = StatementProcedureCall;
exports.VariableDeclaration = VariableDeclaration;
