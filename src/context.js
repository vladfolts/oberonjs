"use strict";

var Cast = require("js/Cast.js");
var Code = require("js/Code.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ConstValue = require("js/ConstValue.js");
var ContextExpression = require("js/ContextExpression.js");
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

exports.FormalParameters = ChainedContext.extend({
    init: function FormalParametersContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__arguments = [];
        this.__result = undefined;

        var parent = this.parent();
        var name = parent.typeName();
        if (name === undefined)
            name = "";
        this.__type = new Procedure.Type(name);
        parent.setType(this.__type);
    },
    handleMessage: function(msg){
        if (msg instanceof ContextProcedure.AddArgumentMsg){
            this.__arguments.push(msg.arg);
            return undefined;
        }
        return ChainedContext.prototype.handleMessage.call(this, msg);
    },
    handleQIdent: function(q){
        var s = ContextHierarchy.getQIdSymbolAndScope(this.root(), q);
        var resultType = ContextExpression.unwrapType(s.symbol().info());
        this._checkResultType(resultType);
        this.__result = resultType;
    },
    endParse: function(){
        this.__type.define(this.__arguments, this.__result);
    },
    _checkResultType: function(type){
        if (type instanceof Type.Array)
            throw new Errors.Error("the result type of a procedure cannot be an ARRAY");
        if (type instanceof Type.Record)
            throw new Errors.Error("the result type of a procedure cannot be a RECORD");
    }
});

exports.FormalParametersProcDecl = exports.FormalParameters.extend({
    init: function FormalParametersProcDeclContext(context){
        exports.FormalParameters.prototype.init.call(this, context);
    },
    handleMessage: function(msg){
        var result = exports.FormalParameters.prototype.handleMessage.call(this, msg);
        if (msg instanceof ContextProcedure.AddArgumentMsg)
            this.parent().handleMessage(msg);
        return result;
    },
    endParse: function(){
        exports.FormalParameters.prototype.endParse.call(this);
        this.handleMessage(new ContextProcedure.EndParametersMsg());
    }
});

exports.ProcDecl = ChainedContext.extend({
    init: function ProcDeclContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__id = undefined;
        this.__firstArgument = true;
        this.__type = undefined;
        this.__returnParsed = false;
        var root = this.root();
        this.__outerScope = root.currentScope();
        this.__stdSymbols = root.language().stdSymbols;
    },
    handleIdentdef: function(id){
        this.__id = id;
        this.codeGenerator().write(this._prolog());
        this.root().pushScope(Scope.makeProcedure(this.__stdSymbols));
    },
    handleIdent: function(id){
        if (this.__id.id() != id)
            throw new Errors.Error("mismatched procedure names: '" + this.__id.id()
                                 + "' at the begining and '" + id + "' at the end");
    },
    _prolog: function(){
        return "\nfunction " + this.__id.id() + "(";
    },
    _epilog: function(){
        return "";
    },
    _beginBody: function(){
        this.codeGenerator().openScope();
    },
    typeName: function(){return undefined;},
    setType: function(type){
        var procSymbol = new Symbol.Symbol(
            this.__id.id(), 
            new Type.ProcedureId(type));
        this.__outerScope.addSymbol(procSymbol, this.__id.exported());
        this.__type = type;
    },
    __addArgument: function(name, arg){
        if (name == this.__id.id())
            throw new Errors.Error("argument '" + name + "' has the same name as procedure");
        var v = this._makeArgumentVariable(arg, name);
        var s = new Symbol.Symbol(name, v);
        this.root().currentScope().addSymbol(s);

        var code = this.codeGenerator();
        if (!this.__firstArgument)
            code.write(", ");
        else
            this.__firstArgument = false;
        code.write(name + "/*" + arg.description() + "*/");
    },
    _makeArgumentVariable: function(arg, name){
        return new Variable.ArgumentVariable(name, arg.type, arg.isVar);
    },
    handleMessage: function(msg){
        if (msg instanceof ContextProcedure.EndParametersMsg){
            this.codeGenerator().write(")");
            this._beginBody();
            return;
        }
        if (msg instanceof ContextProcedure.AddArgumentMsg)
            return this.__addArgument(msg.name, msg.arg);
        return ChainedContext.prototype.handleMessage.call(this, msg);
    },
    handleReturn: function(e){
        var type = e.type();
        var result = this.__type.result();
        if (!result)
            throw new Errors.Error("unexpected RETURN in PROCEDURE declared with no result type");
        
        var language = this.root().language();
        var op;
        if (language.types.implicitCast(type, result, false, {set: function(v){op = v;}, get:function(){return op;}}))
            throw new Errors.Error(
                "RETURN '" + result.description() + "' expected, got '"
                + type.description() + "'");

        this.codeGenerator().write("return " + op.clone(language, e) + ";\n");

        this.__returnParsed = true;
    },
    endParse: function(){
        this.codeGenerator().closeScope(this._epilog());
        this.root().popScope();

        var result = this.__type.result();
        if (result && !this.__returnParsed)
            throw new Errors.Error("RETURN expected at the end of PROCEDURE declared with '"
                                 + Type.typeName(result) + "' result type");
    }
});

exports.Return = ChainedContext.extend({
    init: function Context$Return(context){
        ChainedContext.prototype.init.call(this, context);
    },
    codeGenerator: function(){return nullCodeGenerator;},
    handleExpression: function(e){
        this.parent().handleReturn(e);
    }
});

exports.ProcParams = HandleSymbolAsType.extend({
    init: function Context$ProcParams(context){
        HandleSymbolAsType.prototype.init.call(this, context);
        this.__isVar = false;
        this.__argNamesForType = [];
    },
    handleLiteral: function(s){
        if (s == "VAR")
            this.__isVar = true;
    },
    handleIdent: function(id){ this.__argNamesForType.push(id);},
    setType: function(type){
        var names = this.__argNamesForType;
        for(var i = 0; i < names.length; ++i){
            var name = names[i];
            this.handleMessage(
                new ContextProcedure.AddArgumentMsg(name, new Type.ProcedureArgument(type, this.__isVar)));
        }
        this.__isVar = false;
        this.__argNamesForType = [];
    }
});

function ForwardTypeMsg(id){
    this.id = id;
}

exports.PointerDecl = ChainedContext.extend({
    init: function Context$PointerDecl(context){
        ChainedContext.prototype.init.call(this, context);
    },
    handleQIdent: function(q){
        var id = q.id;
        var s = q.module
              ? ContextHierarchy.getModuleSymbolAndScope(q.module, q.id)
              : this.root().findSymbol(id);
        
        var info = s ? s.symbol().info()
                     : this.parent().handleMessage(new ForwardTypeMsg(id));
        var typeId = ContextExpression.unwrapTypeId(info);
        this.__setTypeId(typeId);
    },
    __setTypeId: function(typeId){
        if (!(typeId instanceof TypeId.Forward)){
            var type = typeId.type();
            if (!(type instanceof Type.Record))
                throw new Errors.Error(
                    "RECORD is expected as a POINTER base type, got '" + type.description() + "'");
        }

        var parent = this.parent();
        var name = parent.isAnonymousDeclaration() 
            ? ""
            : parent.genTypeName();
        var pointerType = new Record.Pointer(name, typeId);
        parent.setType(pointerType);
    },
    setType: function(type){
        var typeId = new TypeId.Type(type);
        this.root().currentScope().addFinalizer(function(){Record.stripTypeId(typeId);});
        this.__setTypeId(typeId);
    },
    isAnonymousDeclaration: function(){return true;},
    exportField: function(field){
        throw new Errors.Error( "cannot export anonymous RECORD field: '" + field + "'");
    }
});

function handleIfExpression(e){
    var type = e.type();
    if (type !== basicTypes.bool)
        throw new Errors.Error("'BOOLEAN' expression expected, got '" + type.description() + "'");
}
/*
var IfContextBase = ChainedContext.extend({
    init: function(context){
        ChainedContext.prototype.init.call(this, context);
    },
    endParse: function(){
        var gen = this.codeGenerator();
        gen.write(")");
        gen.openScope();
    },
    handleExpression: handleIfExpression
});
*/
exports.If = ChainedContext.extend({
    init: function IfContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.codeGenerator().write("if (");
    },
    handleExpression: function(e){
        handleIfExpression(e);
        var gen = this.codeGenerator();
        gen.write(")");
        gen.openScope();
    },
    handleLiteral: function(s){
        var gen = this.codeGenerator();
        if (s == "ELSIF"){
            gen.closeScope("");
            gen.write("else if (");
        }
        else if (s == "ELSE"){
            gen.closeScope("");
            gen.write("else ");
            gen.openScope();
        }
    },
    endParse: function(){
        this.codeGenerator().closeScope("");
    }
});

exports.emitEndStatement = function(context){
    context.codeGenerator().write(";\n");
};

exports.Case = ChainedContext.extend({
    init: function CaseContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__type = undefined;
        this.__firstCase = true;
        this.__var = this.root().currentScope().generateTempVar("case");
        this.codeGenerator().write("var " + this.__var + " = ");
    },
    caseVar: function(){return this.__var;},
    handleExpression: function(e){
        var type = e.type();
        var gen = this.codeGenerator();
        if (type instanceof Type.String){
            var v;
            if (Type.stringAsChar(type, {set: function(value){v = value;}})){
                gen.write(v);
                type = basicTypes.ch;
            }
        }
        if (!Type.isInt(type) && type != basicTypes.ch)
            throw new Errors.Error(
                Type.intsDescription() + " or 'CHAR' expected as CASE expression");
        this.__type = type;
        gen.write(";\n");
    },
    beginCase: function(){
        if (this.__firstCase)
            this.__firstCase = false;
        else
            this.codeGenerator().write("else ");
    },
    handleLabelType: function(type){
        if (!Cast.areTypesMatch(type, this.__type))
            throw new Errors.Error(
                "label must be '" + Type.typeName(this.__type) + "' (the same as case expression), got '"
                + Type.typeName(type) + "'");
    }
});

exports.CaseLabelList = ChainedContext.extend({
    init: function CaseLabelListContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__glue = "";
    },
    handleLabelType: function(type){this.parent().handleLabelType(type);},
    handleRange: function(from, to){
        var parent = this.parent();
        if (!this.__glue)
            parent.caseLabelBegin();

        var v = parent.parent().caseVar();
        var cond = to === undefined
            ? v + " === " + from.value
            : "(" + v + " >= " + from.value + " && " + v + " <= " + to.value + ")";
        this.codeGenerator().write(this.__glue + cond);
        this.__glue = " || ";
    },
    endParse: function(){this.parent().caseLabelEnd();}
});

exports.CaseLabel = ChainedContext.extend({
    init: function CaseLabelContext(context){
        ChainedContext.prototype.init.call(this, context);
    },
    caseLabelBegin: function(){
        this.parent().beginCase();
        this.codeGenerator().write("if (");
    },
    caseLabelEnd: function(){
        var gen = this.codeGenerator();
        gen.write(")");
        gen.openScope();
    },
    handleLabelType: function(type){this.parent().handleLabelType(type);},
    handleRange: function(from, to){this.parent().handleRange(from, to);},
    endParse: function(){this.codeGenerator().closeScope("");}
});

exports.CaseRange = ChainedContext.extend({
    init: function CaseRangeContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__from = undefined;
        this.__to = undefined;
    },
    codeGenerator: function(){return nullCodeGenerator;}, // suppress any output
    handleLabel: function(type, v){
        this.parent().handleLabelType(type);
        if (this.__from === undefined )
            this.__from = v;
        else
            this.__to = v;
    },
    handleConst: function(type, value){
        if (type instanceof Type.String){
            if (!Type.stringAsChar(type, {set: function(v){value = v;}}))
                throw new Errors.Error("single-character string expected");
            type = basicTypes.ch;
            value = new ConstValue.Int(value);
        }
        this.handleLabel(type, value);
    },
    handleIdent: function(id){
        var s = ContextHierarchy.getSymbol(this.root(), id);
        if (!s.isConst())
            throw new Errors.Error("'" + id + "' is not a constant");
        
        var type = s.info().type;
        if (type instanceof Type.String)
            this.handleConst(type, undefined);
        else
            this.handleLabel(type, s.info().value);
    },
    endParse: function(){this.parent().handleRange(this.__from, this.__to);}
});

exports.While = ChainedContext.extend({
    init: function WhileContext(context){
        ChainedContext.prototype.init.call(this, context);
        var gen = this.codeGenerator();
        gen.write("while (true)");
        gen.openScope();
        gen.write("if (");
    },
    handleExpression: function WhileContext$handleExpression(e){
        handleIfExpression(e);
        var gen = this.codeGenerator();
        gen.write(")");
        gen.openScope();
    },
    handleLiteral: function(s){
        if (s == "ELSIF"){
            var gen = this.codeGenerator();
            gen.closeScope("");
            gen.write("else if (");
        }
    },
    endParse: function(){
        var gen = this.codeGenerator();
        gen.closeScope(" else break;\n");
        gen.closeScope("");
    }
});

exports.Repeat = ChainedContext.extend({
    init: function RepeatContext(context){
        ChainedContext.prototype.init.call(this, context);
        var gen = context.codeGenerator();
        gen.write("do ");
        gen.openScope();
    }
});

exports.Until = ChainedContext.extend({
    init: function UntilContext(context){
        ChainedContext.prototype.init.call(this, context);
        context.codeGenerator().closeScope(" while (");
    },
    codeGenerator: function(){ return nullCodeGenerator; },
    handleExpression: function(e){
        handleIfExpression(e);
        this.parent().codeGenerator().write( op.not(e).code() );
    },
    endParse: function(){
        this.parent().codeGenerator().write(");\n");
    }
});

exports.For = ChainedContext.extend({
    init: function ForContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__var = undefined;
        this.__initExprParsed = false;
        this.__toExpr = CodeGenerator.makeSimpleGenerator();
        this.__toParsed = false;
        this.__by_parsed = false;
        this.__by = undefined;
    },
    handleIdent: function(id){
        var s = ContextHierarchy.getSymbol(this.root(), id);
        if (!s.isVariable())
            throw new Errors.Error("'" + s.id() + "' is not a variable");
        var type = s.info().type();
        if (type !== basicTypes.integer)
            throw new Errors.Error(
                  "'" + s.id() + "' is a '" 
		+ type.description() + "' variable, 'FOR' control variable must be 'INTEGER'");
        this._handleInitCode(id, "for (" + id + " = ");
    },
    _handleInitCode: function(id, code){
        this.__var = id;
        this.codeGenerator().write(code);
    },
    _handleInitExpression: function(type){
        if (type != basicTypes.integer)
            throw new Errors.Error(
                "'INTEGER' expression expected to assign '" + this.__var
                + "', got '" + type.description() + "'");
        this.__initExprParsed = true;
    },
    handleExpression: function(e){
        var type = e.type();
        if (!this.__initExprParsed)
            this._handleInitExpression(type);
        else if (!this.__toParsed) {
            if (type != basicTypes.integer)
                throw new Errors.Error(
                    "'INTEGER' expression expected as 'TO' parameter, got '" + type.description() + "'");
            this.__toParsed = true;
        }
        else {
            if (type != basicTypes.integer)
                throw new Errors.Error("'INTEGER' expression expected as 'BY' parameter, got '" + type.description() + "'");
            var value = e.constValue();
            if (!value)
                throw new Errors.Error("constant expression expected as 'BY' parameter");
            this.__by = value.value;
        }
    },
    codeGenerator: function(){
        if (this.__initExprParsed && !this.__toParsed)
            return this.__toExpr;
        if (this.__toParsed && !this.__by_parsed)
            return nullCodeGenerator; // suppress output for BY expression
        
        return this.parent().codeGenerator();
    },
    handleBegin: function(){
        this.__by_parsed = true;

        var relation = this.__by < 0 ? " >= " : " <= ";
        var step = this.__by === undefined
                            ? "++" + this.__var
                            : this.__var + (this.__by < 0
                                    ? " -= " + -this.__by
                                    : " += " +  this.__by);
        var s = "; " + this.__var + relation + this.__toExpr.result() + "; " + step + ")";
        var gen = this.codeGenerator();
        gen.write(s);
        gen.openScope();
    },
    endParse: function(){this.codeGenerator().closeScope("");}
});

exports.emitForBegin = function(context){context.handleBegin();};

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
    typeName: function(){return undefined;},
    isAnonymousDeclaration: function(){return true;},
    checkExport: function(){},
    handleMessage: function(msg){
        if (msg instanceof ForwardTypeMsg)
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
        if (msg instanceof ForwardTypeMsg){
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
