"use strict";

var Cast = require("js/Cast.js");
var Code = require("js/Code.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ConstValue = require("js/ConstValue.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextIf = require("js/ContextIf.js");
var ContextHierarchy = require("js/ContextHierarchy.js");
var ContextProcedure = require("js/ContextProcedure.js");
var ContextType = require("js/ContextType.js");
var Designator = require("js/Designator.js");
var Errors = require("js/Errors.js");
var Expression = require("js/Expression.js");
var Module = require("js/Module.js");
var op = require("js/Operator.js");
var ObContext = require("js/Context.js");
var Parser = require("parser.js");
var Procedure = require("js/Procedure.js");
var Record = require("js/Record.js");
var Class = require("rtl.js").Class;
var Scope = require("js/Scope.js");
var Symbol = require("js/Symbols.js");
var Type = require("js/Types.js");
var TypeId = require("js/TypeId.js");
var Variable = require("js/Variable.js");

var basicTypes = Type.basic();
var nullCodeGenerator = CodeGenerator.nullGenerator();
var nilType = Type.nil();
/*
function log(s){
    console.info(s);
}
*/

var ChainedContext = ContextHierarchy.Node;
ChainedContext.extend = Class.extend;
ChainedContext.prototype.init = ContextHierarchy.Node;

var ModuleImport = ChainedContext.extend({
    init: function ModuleImport(context){
        ChainedContext.prototype.init.call(this, context);
        this.__import = {};
        this.__currentModule = undefined;
        this.__currentAlias = undefined;
    },
    handleIdent: function(id){
        this.__currentModule = id;
    },
    handleLiteral: function(s){
        if (s == ":=")
            this.__currentAlias = this.__currentModule;
        else if (s == ",")
            this.__handleImport();
    },
    endParse: function(){
        if (this.__currentModule)
            this.__handleImport();

        var modules = [];
        var unresolved = [];
        for(var alias in this.__import){
            var moduleName = this.__import[alias];
            var module = this.parent().findModule(moduleName);
            if (!module)
                unresolved.push(moduleName);
            else
                modules.push(new Symbol.Symbol(alias, module));
        }
        if (unresolved.length)
            throw new Errors.Error("module(s) not found: " + unresolved.join(", "));
        
        this.parent().handleImport(modules);
    },
    __handleImport: function(){
        var alias = this.__currentAlias;
        if (!alias)
            alias = this.__currentModule;
        else
            this.__currentAlias = undefined;
        
        for(var a in this.__import){
            if (a == alias)
                throw new Errors.Error("duplicated alias: '" + alias +"'");
            if (this.__import[a] == this.__currentModule)
                throw new Errors.Error("module already imported: '" + this.__currentModule +"'");
        }
        this.__import[alias] = this.__currentModule;
    }
});
exports.ModuleImport = ModuleImport;

exports.Chained = ChainedContext;
