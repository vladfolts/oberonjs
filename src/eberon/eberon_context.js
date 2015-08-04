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

exports.FormalType = FormalType;
exports.ModuleDeclaration = ModuleDeclaration;
