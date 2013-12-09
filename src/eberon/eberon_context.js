"use strict";

var Cast = require("cast.js");
var Context = require("context.js");
var Errors = require("js/Errors.js");
var Symbol = require("symbol.js");
var Procedure = require("procedure.js");
var Type = require("type.js");

function methodCallGenerator(context, id, type){
    return new Procedure.CallGenerator(context, id, type);
}

var SuperCallGenerator = Procedure.CallGenerator.extend({
    init: function(context, id, type){
        Procedure.CallGenerator.prototype.init.call(this, context, id, type);
    },
    prolog: function(){
        return Procedure.CallGenerator.prototype.prolog.call(this) + "this";
    },
    writeArgumentCode: function(e, pos, isVar, convert){
        Procedure.CallGenerator.prototype.writeArgumentCode.call(this, e, pos + 1, isVar, convert);
    }
});

function superMethodCallGenerator(context, id, type){
    return new SuperCallGenerator(context, id, type);
}

var MethodType = Type.Procedure.extend({
    init: function EberonContext$MethodType(type, callGenerator){
        Type.Procedure.prototype.init.call(this);
        this.__type = type;
        this.__callGenerator = callGenerator;
    },
    procType: function(){return this.__type;},
    args: function(){return this.__type.args();},
    result: function(){return this.__type.result();},
    description: function(){return this.__type.description();},
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

var Designator = Context.Designator.extend({
    init: function EberonContext$Designator(parent){
        Context.Designator.prototype.init.call(this, parent);
    },
    handleLiteral: function(s){
        if (s == "SELF")
            this.handleSymbol(new Symbol.Found(this.handleMessage(getMethodSelf)), "this");
        else if (s == "SUPER"){
            var ms = this.handleMessage(getMethodSuper);
            this.handleSymbol(new Symbol.Found(ms.symbol), ms.code);
        }
        else
            Context.Designator.prototype.handleLiteral.call(this, s);
    }
});

var RecordType = Type.Record.extend({
    init: function EberonContext$RecordType(name, cons, scope){
        Type.Record.prototype.init.call(this, name, cons, scope);
        this.__finalized = false;
        scope.addFinalizer(this.finalize.bind(this));
        this.__declaredMethods = {};
        this.__definedMethods = [];
        this.__instantiated = false;
        this.__lazyDefinitions = [];
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
    },
    defineMethod: function(methodId, type){
        var base = this.baseType();
        var id = methodId.id();
        var existing = this.findSymbol(id);
        if (!(existing instanceof MethodType)){
            throw new Errors.Error(
                  "'" + this.name() + "' has no declaration for method '" + id 
                + "'");
        }
        //if (this.__definedMethods.indexOf(id) != -1)
        //    throw new Error.Error("method definition duplicate");
        if (!Cast.areProceduresMatch(existing, type))
            throw new Errors.Error(
                  "overridden method '" + id + "' signature mismatch: should be '"
                + existing.description() + "', got '" 
                + type.description() + "'");
        
        this.__definedMethods.push(id);
    },
    requireMethodDefinition: function(id){
        if (!this.__hasMethodDeclaration(id))
            throw new Errors.Error(
                "there is no method '" + id + "' in base type(s)");
        if (this.__finalized)
            this.__ensureMethodDefinitions([id]);
        else if (this.__lazyDefinitions.indexOf(id) == -1)
            this.__lazyDefinitions.push(id);
    },
    abstractMethods: function(){
        var baseType = this.baseType();
        var methods = baseType ? baseType.abstractMethods().concat(Object.keys(this.__declaredMethods))
                               : Object.keys(this.__declaredMethods);
        var result = [];
        for(var i = 0; i < methods.length; ++i){
            var m = methods[i];
            if (this.__definedMethods.indexOf(m) == -1)
                result.push(m);
        }
        return result;
    },
    finalize: function(){
        this.__finalized = true;
        if (this.__instantiated)
            this.__ensureNonAbstract();
        this.__ensureMethodDefinitions(this.__lazyDefinitions);
    },
    __ensureMethodDefinitions: function(ids){
        var result = [];
        for(var i = 0; i < ids.length; ++i){
            var m = ids[i];
            if (!this.__hasMethodDefinition(m))
                result.push(m);
        }
        if (result.length)
            throw new Errors.Error(
                  "cannot use abstract method(s) in SUPER calls: "
                + result.join(", "));
    },
    __ensureNonAbstract: function(){
        var am = this.abstractMethods();
        if (am.length)
            throw new Errors.Error(
                  "cannot instantiate '" + this.name() 
                + "' because it has abstract method(s): "
                + am.join(", ")
                );
    },
    __hasMethodDeclaration: function(id){
        var type = this;
        var result;
        while (type && !(result = type.__declaredMethods[id]))
            type = type.baseType();
        return result;
    },
    __hasMethodDefinition: function(id){
        var type = this;
        while (type && type.__definedMethods.indexOf(id) == -1)
            type = type.baseType();
        return type;
    }
});

var RecordDecl = Context.RecordDecl.extend({
    init: function EberonContext$RecordDecl(context){
        Context.RecordDecl.prototype.init.call(this, context, RecordType);
    },
    handleMessage: function(msg){
        if (msg instanceof MethodOrProcMsg)
            return this.type().addMethod(
                msg.id,
                new MethodType(msg.type, methodCallGenerator));
        if (msg == Context.endParametersMsg) // not used
            return undefined;
        if (msg instanceof Context.AddArgumentMsg) // not used
            return undefined;
        return Context.RecordDecl.prototype.handleMessage.call(this, msg);
    }
});

var ProcOrMethodDecl = Context.ProcDecl.extend({
    init: function EberonContext$ProcOrMethodDecl(parent){
        Context.ProcDecl.prototype.init.call(this, parent);
        this.__selfSymbol = undefined;
        this.__methodId = undefined;
        this.__methodType = undefined;
        this.__boundType = undefined;
        this.__isNew = undefined;
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
                this.__selfSymbol = new Symbol.Symbol("SELF", type);
                this.__methodId = id;
                this.__boundType = type;
            }

            Context.ProcDecl.prototype.handleIdentdef.call(
                this,
                type ? new Context.IdentdefInfo(type.name() + "." + id.id(),
                                                id.exported()) 
                     : id
                );
            return undefined;
        }
        return Context.ProcDecl.prototype.handleMessage.call(this, msg);
    },
    _prolog: function(){
        return this.__boundType
            ? this.__boundType.name() + ".prototype." + this.__methodId.id() + " = function("
            : Context.ProcDecl.prototype._prolog.call(this);
    },
    setType: function(type){
        Context.ProcDecl.prototype.setType.call(this, type);
        this.__methodType = new MethodType(type, methodCallGenerator);
    },
    handleLiteral: function(s){
        if (s == "NEW"){
            var boundType = this.__selfSymbol.info();
            boundType.addMethod(this.__methodId, this.__methodType);
            this.__isNew = true;
        }
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

            if (!this.__isNew){
                var boundType = this.__selfSymbol.info();
                boundType.defineMethod(this.__methodId, this.__methodType);
            }
        }
        Context.ProcDecl.prototype.endParse.call(this);
    },
    __handleSuperCall: function(){
        if (!this.__methodId)
            throw new Errors.Error("SUPER can be used only in methods");

        var baseType = this.__boundType.baseType();
        if (!baseType)
            throw new Errors.Error(
                  "'" + this.__boundType.name()
                + "' has no base type - SUPER cannot be used");

        var id = this.__methodId.id();
        baseType.requireMethodDefinition(id);
        return {
            symbol: new Symbol.Symbol("method", new MethodType(this.__methodType.procType(), superMethodCallGenerator)),
            code: this.__boundType.baseType().name() + ".prototype." + id + ".call"
        };
    }
});

exports.Designator = Designator;
exports.MethodHeading = MethodHeading;
exports.ProcOrMethodId = ProcOrMethodId;
exports.ProcOrMethodDecl = ProcOrMethodDecl;
exports.RecordDecl = RecordDecl;