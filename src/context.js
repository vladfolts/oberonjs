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

var HandleSymbolAsType = ContextType.HandleSymbolAsType;
HandleSymbolAsType.extend = Class.extend;
HandleSymbolAsType.prototype.init = ContextType.HandleSymbolAsType;

exports.CheckAssignment = ChainedContext.extend({
    init: function Context$CheckAssignment(context){
        ChainedContext.prototype.init.call(this, context);
    },
    handleLiteral: function(s){
        if (s == "=")
            throw new Errors.Error("did you mean ':=' (statement expected, got expression)?");
    }
});

exports.VariableDeclaration = HandleSymbolAsType.extend({
    init: function Context$VariableDeclaration(context){
        HandleSymbolAsType.prototype.init.call(this, context);
        this.__idents = [];
        this.__type = undefined;
    },
    handleIdentdef: function(id){this.__idents.push(id);},
    exportField: function(name){
        ContextType.checkIfFieldCanBeExported(name, this.__idents, "variable");
    },
    setType: function(type){this.__type = type;},
    type: function(){return this.__type;},
    typeName: function(){return "";},
    isAnonymousDeclaration: function(){return true;},
    checkExport: function(){},
    handleMessage: function(msg){
        if (msg instanceof ContextType.ForwardTypeMsg)
            throw new Errors.Error("type '" + msg.id + "' was not declared");
        return HandleSymbolAsType.prototype.handleMessage.call(this, msg);
    },
    _initCode: function(){
        return this.__type.initializer(this);
    },
    endParse: function(){
        var idents = this.__idents;
        var gen = this.codeGenerator();
        for(var i = 0; i < idents.length; ++i){
            var id = idents[i];
            var varName = id.id();
            if (id.exported())
                this.checkExport(varName);

            var v = new Variable.DeclaredVariable(varName, this.__type);
            this.root().currentScope().addSymbol(new Symbol.Symbol(varName, v), id.exported());
            gen.write("var " + varName + " = " + this._initCode() + ";");
        }

        gen.write("\n");
    }
});

function assertProcType(type, info){
    var unexpected;
    if ( !type )
        unexpected = info.idType();
    else if (((info instanceof TypeId.Type) || !(type instanceof Type.Procedure)) 
        && !(type instanceof Module.AnyType))
        unexpected = type.description();
    if (unexpected)
        throw new Errors.Error("PROCEDURE expected, got '" + unexpected + "'");
    return type;
}

function assertProcStatementResult(type){
    if (type && !(type instanceof Module.AnyType))
        throw new Errors.Error("procedure returning a result cannot be used as a statement");
}

function beginCallMsg(){}
function endCallMsg(){}

exports.ActualParameters = ChainedContext.extend({
    init: function ActualParametersContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.handleMessage(beginCallMsg);
    },
    handleExpression: function(e){
        this.parent().handleExpression(e);
    },
    endParse: function(){
        this.handleMessage(endCallMsg);
    }
});

exports.TypeSection = ChainedContext.extend({
    init: function TypeSection(context){
        ChainedContext.prototype.init.call(this, context);
    },
    handleMessage: function(msg){
        if (msg instanceof ContextType.ForwardTypeMsg){
            var scope = this.root().currentScope();
            Scope.addUnresolved(scope, msg.id);
            var resolve = function(){
                return ContextHierarchy.getSymbol(this.root(), msg.id).info().type();
            }.bind(this);

            return new TypeId.Forward(resolve);
        }
        return ChainedContext.prototype.handleMessage.call(this, msg);
    },
    endParse: function(){
        var unresolved = Scope.unresolved(this.root().currentScope());
        if (unresolved.length)
            throw new Errors.Error("no declaration found for '" + unresolved.join("', '") + "'");
    }
});

exports.ModuleDeclaration = ChainedContext.extend({
    init: function ModuleDeclarationContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__name = undefined;
        this.__imports = {};
        this.__moduleScope = undefined;
        this.__moduleGen = undefined;
        this.__stdSymbols = this.root().language().stdSymbols;
    },
    handleIdent: function(id){
        if (this.__name === undefined ) {
            this.__name = id;
            this.__moduleScope = new Scope.Module(id, this.__stdSymbols);
            this.root().pushScope(this.__moduleScope);
        }
        else if (id === this.__name){
            var scope = this.root().currentScope();
            scope.close();
            var exports = scope.exports;
            Scope.defineExports(Scope.moduleSymbol(scope).info(), exports);
            this.codeGenerator().write(this.__moduleGen.epilog(exports));
        }
        else
            throw new Errors.Error("original module name '" + this.__name + "' expected, got '" + id + "'" );
    },
    findModule: function(name){
        if (name == this.__name)
            throw new Errors.Error("module '" + this.__name + "' cannot import itself");
        return this.parent().findModule(name);
    },
    handleImport: function(modules){
        var scope = this.root().currentScope();
        var moduleAliases = {};
        for(var i = 0; i < modules.length; ++i){
            var s = modules[i];
            var name = Type.moduleName(s.info());
            this.__imports[name] = s;
            scope.addSymbol(s);
            moduleAliases[name] = s.id();
        }
        this.__moduleGen = this.root().language().moduleGenerator(
                this.__name,
                moduleAliases);
        this.codeGenerator().write(this.__moduleGen.prolog());
    },
    handleLiteral: function(){},
    qualifyScope: function(scope){
        if (scope != this.__moduleScope && scope instanceof Scope.Module){
            var id = Scope.moduleSymbol(scope).id();
            
            // implicitly imported module, e.g.: record.pointerToRecordFromAnotherModule.field
            // should not be used in code generation, 
            // just return non-empty value to indicate this is not current module
            if (!(id in this.__imports))
                return "module '" + id + "' is not imported";
            return this.__imports[id].id() + ".";
        }
        return "";
    }
});

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

function makeProcCall(context, type, info){
    assertProcType(type, info);
    var l = context.root().language();
    return type.callGenerator(
        { types: l.types, 
          rtl: function(){ return l.rtl(); }, 
          qualifyScope: context.qualifyScope.bind(context)
        });
}

exports.assertProcStatementResult = assertProcStatementResult;
exports.beginCallMsg = beginCallMsg;
exports.endCallMsg = endCallMsg;
exports.Chained = ChainedContext;
exports.makeProcCall = makeProcCall;
exports.HandleSymbolAsType = HandleSymbolAsType;
