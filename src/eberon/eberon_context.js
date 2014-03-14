"use strict";

var Cast = require("js/Cast.js");
var Code = require("js/Code.js");
var Context = require("context.js");
var EberonString = require("js/EberonString.js");
var Errors = require("js/Errors.js");
var op = require("js/Operator.js");
var eOp = require("js/EberonOperator.js");
var Symbol = require("js/Symbols.js");
var Procedure = require("js/Procedure.js");
var Type = require("js/Types.js");

function methodCallGenerator(context, id, type){
    return new Procedure.makeProcCallGenerator(context, id, type);
}

function superMethodCallGenerator(context, id, type){
    var args = Procedure.makeArgumentsCode(context);
    args.write(Code.makeExpression("this"));
    return Procedure.makeProcCallGeneratorWithCustomArgs(context, id, type, args);
}

var MethodType = Type.Procedure.extend({
    init: function EberonContext$MethodType(id, type, callGenerator){
        Type.Procedure.prototype.init.call(this);
        this.__id = id;
        this.__type = type;
        this.__callGenerator = callGenerator;
    },
    procType: function(){return this.__type;},
    args: function(){return this.__type.args();},
    result: function(){return this.__type.result();},
    description: function(){return "method " + this.__id;},
    procDescription: function(){return this.__type.description();},
    callGenerator: function(context, id){return this.__callGenerator(context, id, this);}
});

function MethodOrProcMsg(id, type){
    this.id = id;
    this.type = type;
}

var ProcOrMethodId = Context.Chained.extend({
    init: function EberonContext$ProcOrMethodId(parent){
        Context.Chained.prototype.init.call(this, parent);
        this.__maybeTypeId = undefined;
        this.__type = undefined;
    },
    handleIdent: function(id){this.__maybeTypeId = id;},
    handleLiteral: function(s){
        var ss = Context.getSymbolAndScope(this, this.__maybeTypeId);
        var type = Context.unwrapType(ss.symbol().info());
        if (!(type instanceof Type.Record))
            throw new Errors.Error(
                  "RECORD type expected in method declaration, got '"
                + type.description() + "'");
        if (ss.scope() != this.currentScope())
            throw new Errors.Error(
                  "method should be defined in the same scope as its bound type '"
                + this.__maybeTypeId
                + "'");
        this.__type = type;
    },
    handleIdentdef: function(id){
        if (this.__type && id.exported())
            throw new Errors.Error("method implementation cannot be exported: " + id.id());
        this.handleMessage(new MethodOrProcMsg(id, this.__type));
    }
});

var MethodHeading = Context.Chained.extend({
    init: function EberonContext$MethodHeading(parent){
        Context.Chained.prototype.init.call(this, parent);
        this.__id = undefined;
        this.__type = undefined;
    },
    handleIdentdef: function(id){this.__id = id;},
    typeName: function(){return undefined;},
    setType: function(type){this.__type = type;},
    endParse: function(){
        this.handleMessage(new MethodOrProcMsg(this.__id, this.__type));
    }
});

function getMethodSelf(){}
function getMethodSuper(){}

var MethodVariable = Type.Variable.extend({
    init: function(type){
        this.__type = type;
    },
    type: function(){return this.__type;},
    isReadOnly: function(){return true;},
    idType: function(){return "method";}
});

var Designator = Context.Designator.extend({
    init: function EberonContext$Designator(parent){
        Context.Designator.prototype.init.call(this, parent);
    },
    _indexSequence: function(type, info){
        if (type == EberonString.string()){
            var indexType = Type.basic().ch;
            return { length: undefined, 
                     type: indexType,
                     info: EberonString.makeElementVariable(indexType)
                   };
        }
        return Context.Designator.prototype._indexSequence.call(this, type, info);
    },
    _makeDenoteVar: function(type, isReadOnly){
        return (type instanceof MethodType)
            ? new MethodVariable(type)
            : Context.Designator.prototype._makeDenoteVar(type, isReadOnly);
    },
    handleLiteral: function(s){
        if (s == "SELF")
            this.handleSymbol(Symbol.makeFound(this.handleMessage(getMethodSelf)), "this");
        else if (s == "SUPER"){
            var ms = this.handleMessage(getMethodSuper);
            this.handleSymbol(Symbol.makeFound(ms.symbol), ms.code);
        }
        else
            Context.Designator.prototype.handleLiteral.call(this, s);
    }
});

var RecordType = Type.Record.extend({
    init: function EberonContext$RecordType(name, cons, scope){
        Type.Record.prototype.init.call(this);
        Type.initRecord(this, name, cons, scope);
        this.__finalized = false;
        this.__declaredMethods = {};
        this.__definedMethods = [];
        this.__abstractMethods = [];
        this.__instantiated = false;
        this.__lazyDefinitions = {};
        this.__nonExportedMethods = [];
    },
    initializer: function(context){
        if (this.__finalized)
            this.__ensureNonAbstract();
        else
            this.__instantiated = true;
        return Type.Record.prototype.initializer.call(this, context);
    },
    findSymbol: function(id){
        var result = this.__hasMethodDeclaration(id);
        if (!result)
            result = Type.Record.prototype.findSymbol.call(this, id);
        return result;
    },
    addField: function(field, type){
        var id = field.id();
        if (this.__hasMethodDeclaration(id))
            throw new Errors.Error(
                "cannot declare field, record already has method '" + id +"'");
        return Type.Record.prototype.addField.call(this, field, type);
    },
    addMethod: function(methodId, type){
        var id = methodId.id();
        var existingField = this.findSymbol(id);
        if (existingField)
            throw new Errors.Error(
                  existingField instanceof MethodType
                ?   "cannot declare a new method '" + id 
                  + "': method already was declared"
                : "cannot declare method, record already has field '" + id + "'");

        this.__declaredMethods[id] = type;

        if (!methodId.exported())
            this.__nonExportedMethods.push(id);
    },
    defineMethod: function(methodId, type){
        var base = Type.recordBase(this);
        var id = methodId.id();
        var existing = this.findSymbol(id);
        if (!(existing instanceof MethodType)){
            throw new Errors.Error(
                  "'" + Type.typeName(this) + "' has no declaration for method '" + id 
                + "'");
        }
        //if (this.__definedMethods.indexOf(id) != -1)
        //    throw new Error.Error("method definition duplicate");
        if (!Cast.areProceduresMatch(existing, type))
            throw new Errors.Error(
                  "overridden method '" + id + "' signature mismatch: should be '"
                + existing.procDescription() + "', got '" 
                + type.procDescription() + "'");
        
        this.__definedMethods.push(id);
    },
    requireMethodDefinition: function(id, reason){
        if (!this.__hasMethodDeclaration(id))
            throw new Errors.Error(
                "there is no method '" + id + "' in base type(s)");
        if (this.__finalized)
            this.__ensureMethodDefinitions({reason: [id]});
        else {
            var ids = this.__lazyDefinitions[reason];
            if (!ids){
                ids = [id];
                this.__lazyDefinitions[reason] = ids;
            }
            else if (ids.indexOf(id) == -1)
                ids.push(id);
            }
    },
    abstractMethods: function(){return this.__abstractMethods;},
    __collectAbstractMethods: function(){
        var selfMethods = Object.keys(this.__declaredMethods);
        var baseType = Type.recordBase(this);
        var methods = baseType ? baseType.abstractMethods().concat(selfMethods)
                               : selfMethods;
        for(var i = 0; i < methods.length; ++i){
            var m = methods[i];
            if (this.__definedMethods.indexOf(m) == -1)
                this.__abstractMethods.push(m);
        }
    },
    finalize: function(){
        this.__finalized = true;
        this.__collectAbstractMethods();
        if (this.__instantiated)
            this.__ensureNonAbstract();
        this.__ensureMethodDefinitions(this.__lazyDefinitions);

        for(var i = 0; i < this.__nonExportedMethods.length; ++i)
            delete this.__declaredMethods[this.__nonExportedMethods[i]];
        delete this.__nonExportedMethods;

        Type.Record.prototype.finalize.call(this);
    },
    __ensureMethodDefinitions: function(reasons){
        var result = [];
        for(var reason in reasons){
            var ids = reasons[reason];
            var report = [];
            for(var i = 0; i < ids.length; ++i){
                var m = ids[i];
                if (!this.__hasMethodDefinition(m))
                    report.push(m);
            }
            if (report.length)
                result.push(reason + ": " + report.join(", "));
        }
        if (result.length)
            throw new Errors.Error(result.join("; "));
    },
    __ensureNonAbstract: function(){
        function errMsg(self){
            return "cannot instantiate '" 
                 + Type.typeName(self) 
                 + "' because it has abstract method(s)";
        }

        var am = this.abstractMethods();
        if (am.length)
            throw new Errors.Error(errMsg(this) + ": " + am.join(", ")
                );

        var baseType = Type.recordBase(this);
        while (baseType){
            if (!baseType.__finalized)
                for(var id in baseType.__declaredMethods){
                    if (!this.__hasMethodDefinition(id))
                        baseType.requireMethodDefinition(id, errMsg(this));
                }
            baseType = Type.recordBase(baseType);
        }
    },
    __hasMethodDeclaration: function(id){
        var type = this;
        var result;
        while (type && !(result = type.__declaredMethods[id]))
            type = Type.recordBase(type);
        return result;
    },
    __hasMethodDefinition: function(id){
        var type = this;
        while (type && type.__definedMethods.indexOf(id) == -1)
            type = Type.recordBase(type);
        return type;
    }
});

var RecordDecl = Context.RecordDecl.extend({
    init: function EberonContext$RecordDecl(context){
        var makeRecord = function(name, cons, scope){return new RecordType(name, cons, scope);};
        Context.RecordDecl.prototype.init.call(this, context, makeRecord);
    },
    handleMessage: function(msg){
        if (msg instanceof MethodOrProcMsg)
            return this.type().addMethod(
                msg.id,
                new MethodType(msg.id.id(), msg.type, methodCallGenerator));
        if (msg == Context.endParametersMsg) // not used
            return undefined;
        if (msg instanceof Context.AddArgumentMsg) // not used
            return undefined;
        return Context.RecordDecl.prototype.handleMessage.call(this, msg);
    }
});

var ProcOrMethodDecl = Context.ProcDecl.extend({
    init: function EberonContext$ProcOrMethodDecl(parent, stdSymbols){
        Context.ProcDecl.prototype.init.call(this, parent, stdSymbols);
        this.__selfSymbol = undefined;
        this.__methodId = undefined;
        this.__methodType = undefined;
        this.__boundType = undefined;
        this.__endingId = undefined;
    },
    handleMessage: function(msg){
        if (msg == getMethodSelf){
            if (!this.__boundType)
                throw new Errors.Error("SELF can be used only in methods");
            return this.__selfSymbol;
        }
        if (msg == getMethodSuper)
            return this.__handleSuperCall();
        if (msg instanceof MethodOrProcMsg){
            var id = msg.id;
            var type = msg.type;
            if (type){
                this.__selfSymbol = Symbol.makeSymbol("SELF", type);
                this.__methodId = id;
                this.__boundType = type;
            }

            Context.ProcDecl.prototype.handleIdentdef.call(
                this,
                type ? new Context.IdentdefInfo(Type.typeName(type) + "." + id.id(),
                                                id.exported()) 
                     : id
                );
            return undefined;
        }
        return Context.ProcDecl.prototype.handleMessage.call(this, msg);
    },
    _prolog: function(){
        return this.__boundType
            ? Type.typeName(this.__boundType) + ".prototype." + this.__methodId.id() + " = function("
            : Context.ProcDecl.prototype._prolog.call(this);
    },
    setType: function(type){
        Context.ProcDecl.prototype.setType.call(this, type);
        if (this.__methodId)
            this.__methodType = new MethodType(this.__methodId.id(), type, methodCallGenerator);
    },
    handleIdent: function(id){
        if (this.__selfSymbol){
            if (!this.__endingId)
                this.__endingId = id + ".";
            else {
                Context.ProcDecl.prototype.handleIdent.call(this, this.__endingId + id);
                this.__endingId = undefined;
            }
        }
        else
            Context.ProcDecl.prototype.handleIdent.call(this, id);
    },
    endParse: function(){
        if (this.__selfSymbol){
            if (this.__endingId)
                // should throw
                Context.ProcDecl.prototype.handleIdent.call(this, this.__endingId);

            var boundType = this.__selfSymbol.info();
            boundType.defineMethod(this.__methodId, this.__methodType);
        }
        Context.ProcDecl.prototype.endParse.call(this);
    },
    __handleSuperCall: function(){
        if (!this.__methodId)
            throw new Errors.Error("SUPER can be used only in methods");

        var baseType = Type.recordBase(this.__boundType);
        if (!baseType)
            throw new Errors.Error(
                  "'" + Type.typeName(this.__boundType)
                + "' has no base type - SUPER cannot be used");

        var id = this.__methodId.id();
        baseType.requireMethodDefinition(id, "cannot use abstract method(s) in SUPER calls");
        return {
            symbol: Symbol.makeSymbol(
                "method",  
                Type.makeProcedure(new MethodType(id, this.__methodType.procType(), superMethodCallGenerator))),
            code: Type.typeName(baseType) + ".prototype." + id + ".call"
        };
    }
});

var AddOperator = Context.AddOperator.extend({
    init: function EberonContext$AddOperator(context){
        Context.AddOperator.prototype.init.call(this, context);
    },
    _matchPlusOperator: function(type){
        if (type == EberonString.string() || type instanceof Type.String)
            return eOp.addStr;
        return Context.AddOperator.prototype._matchPlusOperator.call(this, type);
    },
    _expectPlusOperator: function(){return "numeric type or SET or STRING";}
});

var RelationOps = Context.RelationOps.extend({
    init: function EberonContext$RelationOps(){
        Context.RelationOps.prototype.init.call(this);
    },
    eq: function(type){
        return type == EberonString.string() 
            ? eOp.equalStr
            : Context.RelationOps.prototype.eq.call(this, type);
    },
    notEq: function(type){
        return type == EberonString.string() 
            ? eOp.notEqualStr
            : Context.RelationOps.prototype.notEq.call(this, type);
    },
    less: function(type){
        return type == EberonString.string() 
            ? eOp.lessStr
            : Context.RelationOps.prototype.less.call(this, type);
    },
    greater: function(type){
        return type == EberonString.string() 
            ? eOp.greaterStr
            : Context.RelationOps.prototype.greater.call(this, type);
    },
    lessEq: function(type){
        return type == EberonString.string() 
            ? eOp.lessEqualStr
            : Context.RelationOps.prototype.lessEq.call(this, type);
    },
    greaterEq: function(type){
        return type == EberonString.string() 
            ? eOp.greaterEqualStr
            : Context.RelationOps.prototype.greaterEq.call(this, type);
    }
});

var relationOps = new RelationOps();

var Expression = Context.Expression.extend({
    init: function EberonContext$Expression(context){
        Context.Expression.prototype.init.call(this, context, relationOps);
    }
});

exports.AddOperator = AddOperator;
exports.Designator = Designator;
exports.Expression = Expression;
exports.MethodHeading = MethodHeading;
exports.ProcOrMethodId = ProcOrMethodId;
exports.ProcOrMethodDecl = ProcOrMethodDecl;
exports.RecordDecl = RecordDecl;
