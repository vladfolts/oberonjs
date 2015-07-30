"use strict";

var Cast = require("js/Cast.js");
var Class = require("rtl.js").Class;
var Code = require("js/Code.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ContextCase = require("js/ContextCase.js");
var ContextConst = require("js/ContextConst.js");
var ContextDesignator = require("js/ContextDesignator.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextIdentdef = require("js/ContextIdentdef.js");
var ContextIf = require("js/ContextIf.js");
var ContextLoop = require("js/ContextLoop.js");
var ContextModule = require("js/ContextModule.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextProcedure = require("js/ContextProcedure.js");
var ContextType = require("js/ContextType.js");
var ContextVar = require("js/ContextVar.js");
var EberonConstructor = require("js/EberonConstructor.js");
var EberonContext = require("js/EberonContext.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonContextExpression = require("js/EberonContextExpression.js");
var EberonContextProcedure = require("js/EberonContextProcedure.js");
var EberonContextType = require("js/EberonContextType.js");
var EberonDynamicArray = require("js/EberonDynamicArray.js");
var EberonMap = require("js/EberonMap.js");
var EberonOperatorScopes = require("js/EberonOperatorScopes.js");
var EberonRecord = require("js/EberonRecord.js");
var EberonScope = require("js/EberonScope.js");
var EberonString = require("js/EberonString.js");
var EberonTypes = require("js/EberonTypes.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var Module = require("js/Module.js");
var op = require("js/Operator.js");
var eOp = require("js/EberonOperator.js");
var Symbol = require("js/Symbols.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var Type = require("js/Types.js");
var TypeId = require("js/TypeId.js");
var TypePromotion = require("js/EberonTypePromotion.js");
var Variable = require("js/Variable.js");

/*
function log(s){
    console.info(s);
}
*/

var ChainedContext = ContextHierarchy.Node;
ChainedContext.extend = Class.extend;
ChainedContext.prototype.init = ContextHierarchy.Node;

var ExpressionProcedureCall = ChainedContext.extend({
    init: function EberonContext$init(context){
        ChainedContext.prototype.init.call(this, context);
        this.attributes = {};
    },
    endParse: function(){
        var parent = this.parent();
        var d = this.attributes.designator;
        var info = d.info();
        var e;
        if (info instanceof EberonContextDesignator.ResultVariable){
            e = info.expression;
            e = new Expression.Type(d.code(), d.type(), undefined, e.constValue(), e.maxPrecedence());
        }
        else
            e = ContextExpression.designatorAsExpression(d);
        parent.handleExpression(e);
    }
});

var AssignmentOrProcedureCall = ChainedContext.extend({
    init: function EberonContext$init(context){
        ChainedContext.prototype.init.call(this, context);
        this.attributes = {};
        this.__right = undefined;
    },
    handleExpression: function(e){
        this.__right = e;
    },
    codeGenerator: function(){return CodeGenerator.nullGenerator();},
    endParse: function(){
        var d = this.attributes.designator;
        var type = d.type();
        var code;
        if (this.__right){
            var left = Expression.make(d.code(), type, d);
            code = op.assign(left, this.__right, ContextHierarchy.makeLanguageContext(this));
        }
        else if (!(d.info() instanceof EberonContextDesignator.ResultVariable)){
            var procCall = ContextProcedure.makeCall(this, type, d.info());
            var result = procCall.end();
            Module.assertProcStatementResult(result.type());
            code = d.code() + result.code();
        }
        else{
            Module.assertProcStatementResult(type);
            code = d.code();
        }
    
    this.parent().codeGenerator().write(code);
    }
});

var ConstDecl = Class.extend.call(ContextConst.Type, {
    init: function EberonContext$ConstDecl(context){
        ContextConst.Type.call(this, context);
    },
    handleIdentdef: function(id){
        EberonContext.checkOrdinaryExport(id, "constant");
        ContextConst.Type.prototype.handleIdentdef.call(this, id);
    }
});

var VariableDeclaration = Class.extend.call(ContextVar.Declaration, {
    init: function EberonContext$VariableDeclaration(context){
        ContextVar.Declaration.call(this, context);
    },
    handleIdentdef: function(id){
        EberonContext.checkOrdinaryExport(id, "variable");
        ContextVar.Declaration.prototype.handleIdentdef.call(this, id);
    },
    doInitCode: function(){
        var type = this.type;
        if (type instanceof EberonRecord.Record)
            EberonRecord.ensureCanBeInstantiated(this, type, EberonRecord.instantiateForVar);
        return ContextVar.Declaration.prototype.doInitCode.call(this);
    }
});

var While = Class.extend.call(ContextLoop.While, {
    init: function EberonContext$While(context){
        ContextLoop.While.call(this, context);
        this.__scopes = new EberonOperatorScopes.Type(this);
    },
    handleLiteral: function(s){
        ContextLoop.While.prototype.handleLiteral.call(this, s);
        if (s == "DO")
            this.__scopes.doThen();
        else if (s == "ELSIF")
            this.__scopes.alternate();
    },
    handleMessage: function(msg){
        if (this.__scopes.handleMessage(msg))
            return;

        return ContextLoop.While.prototype.handleMessage.call(this, msg);
    },
    endParse: function(){
        this.__scopes.reset();
        ContextLoop.While.prototype.endParse.call(this);
    }
});

var If = Class.extend.call(ContextIf.Type, {
    init: function EberonContext$If(context){
        ContextIf.Type.call(this, context);
        this.__scopes = new EberonOperatorScopes.Type(this);
    },
    handleMessage: function(msg){
        if (this.__scopes.handleMessage(msg))
            return;

        return ContextIf.Type.prototype.handleMessage.call(this, msg);
    },
    handleLiteral: function(s){
        ContextIf.Type.prototype.handleLiteral.call(this, s);
        if (s == "THEN")
            this.__scopes.doThen();
        else if (s == "ELSIF" || s == "ELSE")
            this.__scopes.alternate();
    },
    endParse: function(){
        this.__scopes.reset();
        ContextIf.Type.prototype.endParse.call(this);
    }
});

var CaseLabel = Class.extend.call(ContextCase.Label, {
    init: function EberonContext$CaseLabel(context){
        ContextCase.Label.call(this, context);
    },
    handleLiteral: function(s){
        if (s == ':'){ // statement sequence is expected now
            var root = this.root();
            var scope = EberonScope.makeOperator(
                root.currentScope(),
                root.language().stdSymbols);
            root.pushScope(scope);
        }
    },
    endParse: function(){
        this.root().popScope();
        ContextCase.Label.prototype.endParse.call(this);
    }
});

var Repeat = Class.extend.call(ContextLoop.Repeat, {
    init: function EberonContext$Repeat(context){
        ContextLoop.Repeat.call(this, context);
        var root = this.root();
        var scope = EberonScope.makeOperator(
            root.currentScope(),
            root.language().stdSymbols);
        root.pushScope(scope);
    },
    endParse: function(){
        this.root().popScope();
        //Context.Repeat.prototype.endParse.call(this);
    }
});

var For = Class.extend.call(ContextLoop.For, {
    init: function EberonContext$Repeat(context){
        ContextLoop.For.call(this, context);
        var root = this.root();
        var scope = EberonScope.makeOperator(
            root.currentScope(),
            root.language().stdSymbols);
        root.pushScope(scope);
    },
    handleInPlaceInit: function(symbol, code){
        this.doHandleInitCode(symbol.id(), "for (" + code);
        this.doHandleInitExpression(symbol.info().type());
    },
    endParse: function(){
        this.root().popScope();
        ContextLoop.For.prototype.endParse.call(this);
    }
});

var MapDecl = ChainedContext.extend({
    init: function EberonContext$MapDecl(context){
        ChainedContext.prototype.init.call(this, context);
        this.__type = undefined;
    },
    handleQIdent: function(q){
        var s = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
        var type = ContextExpression.unwrapType(s.symbol().info());
        this.setType(type);
    },
    // anonymous types can be used in map declaration
    setType: function(type){
        this.__type = type;
    },
    isAnonymousDeclaration: function(){return true;},
    typeName: function(){return "";},
    endParse: function(){
        this.parent().setType(new EberonMap.Type(this.__type));
    }
});

function assertArgumentIsNotNonVarDynamicArray(msg){
    if (msg instanceof ContextProcedure.AddArgumentMsg){
        var arg = msg.arg;
        if (!arg.isVar){
            var type = arg.type;
            while (type instanceof Type.Array){
                if (type instanceof EberonDynamicArray.DynamicArray)
                    throw new Errors.Error("dynamic array has no use as non-VAR argument '" + msg.name + "'");
                type = type.elementsType;
            }
        }
    }
}

var FormalParameters = Class.extend.call(ContextProcedure.FormalParameters, {
    init: function EberonContext$FormalParameters(context){
        ContextProcedure.FormalParameters.call(this, context);
    },
    handleMessage: function(msg){
        assertArgumentIsNotNonVarDynamicArray(msg);
        return ContextProcedure.FormalParameters.prototype.handleMessage.call(this, msg);
    },
    doCheckResultType: function(type){
        if (type instanceof EberonDynamicArray.DynamicArray)
            return;
        ContextProcedure.FormalParameters.prototype.doCheckResultType.call(this, type);
    }
});

var FormalType = Class.extend.call(ContextType.HandleSymbolAsType, {
    init: function EberonContext$FormalType(context){
        ContextType.HandleSymbolAsType.call(this, context);
        this.__arrayDimensions = [];
        this.__dynamicDimension = false;
    },
    setType: function(type){           
        function makeDynamic(type){return new EberonDynamicArray.DynamicArray(type); }

        for(var i = this.__arrayDimensions.length; i--;){
            var cons = this.__arrayDimensions[i]
                ? makeDynamic
                : this.root().language().types.makeOpenArray;
            type = cons(type);
        }
        this.parent().setType(type);
    },
    handleLiteral: function(s){
        if (s == "*")
            this.__dynamicDimension = true;
        else if ( s == "OF"){
            this.__arrayDimensions.push(this.__dynamicDimension);
            this.__dynamicDimension = false;
        }
    }
});

var FormalParametersProcDecl = Class.extend.call(ContextProcedure.FormalParametersProcDecl, {
    init: function EberonContext$FormalParametersProcDecl(context){
        ContextProcedure.FormalParametersProcDecl.call(this, context);
    },
    handleMessage: function(msg){
        assertArgumentIsNotNonVarDynamicArray(msg);
        return ContextProcedure.FormalParametersProcDecl.prototype.handleMessage.call(this, msg);
    },
    doCheckResultType: function(type){
        if (type instanceof EberonDynamicArray.DynamicArray)
            return;
        ContextProcedure.FormalParametersProcDecl.prototype.doCheckResultType.call(this, type);
    }
});

var ModuleDeclaration = Class.extend.call(ContextModule.Declaration, {
    init: function EberonContext$ModuleDeclaration(context){
        ContextModule.Declaration.call(this, context);
    },
    handleMessage: function(msg){
        if (EberonContextProcedure.handleTypePromotionMadeInSeparateStatement(msg))
            return;
        return ContextModule.Declaration.prototype.handleMessage.call(this, msg);
    }
});

exports.CaseLabel = CaseLabel;
exports.ConstDecl = ConstDecl;
exports.ExpressionProcedureCall = ExpressionProcedureCall;
exports.For = For;
exports.FormalParameters = FormalParameters;
exports.FormalParametersProcDecl = FormalParametersProcDecl;
exports.FormalType = FormalType;
exports.If = If;
exports.ModuleDeclaration = ModuleDeclaration;
exports.AssignmentOrProcedureCall = AssignmentOrProcedureCall;
exports.MapDecl = MapDecl;
exports.Repeat = Repeat;
exports.VariableDeclaration = VariableDeclaration;
exports.While = While;
