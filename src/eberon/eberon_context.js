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

var ProcOrMethodId = Context.Chained.extend({
    init: function EberonContext$ProcOrMethodId(parent){
        Context.Chained.prototype.init.call(this, parent);
        this.__maybeTypeId = undefined;
        this.__type = undefined;
    },
    handleIdent: function(id){this.__maybeTypeId = id;},
    handleLiteral: function(s){
        var type = Context.getTypeSymbol(this, this.__maybeTypeId);
        if (!(type instanceof Type.Record))
            throw new Errors.Error(
                  "RECORD type expected in method declaration, got '"
                + type.description() + "'");
        this.__type = type;
    },
    handleIdentdef: function(id){
        this.parent().handleMethodOrProc(id, this.__type);
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
        if (msg == getMethodSelf)
            return this.__selfSymbol;
        if (msg == getMethodSuper){
            if (this.__isNew)
                throw new Errors.Error("there is no super method in base type(s)");
            return {
                symbol: new Symbol.Symbol("method", new MethodType(this.__methodType.procType(), superMethodCallGenerator)),
                code: this.__boundType.baseType().name() + ".prototype." + this.__methodId.id() + ".call"
            };
        }
        return Context.ProcDecl.prototype.handleMessage.call(this, msg);
    },
    handleMethodOrProc: function(id, type){
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
            var id = this.__methodId.id();
            var boundType = this.__selfSymbol.info();
            var existingField = boundType.findSymbol(id);
            if (existingField)
                throw new Errors.Error(
                      existingField instanceof MethodType
                    ?   "base record already has method '" + id 
                      + "' (unwanted NEW attribute?)"
                    : "cannot declare method, record already has field '" + id + "'");

            boundType.addField(this.__methodId, this.__methodType);
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
                var base = boundType.baseType();
                var id = this.__methodId.id();
                var existing = base ? base.findSymbol(id) : undefined;
                if (!existing){
                    throw new Errors.Error(
                          "there is no method '" + id 
                        + "' to override in base type(s) of '" 
                        + boundType.name() + "' (NEW attribute is missed?)");
                }
                if (!Cast.areProceduresMatch(existing, this.__methodType))
                    throw new Errors.Error(
                          "overridden method '" + id + "' signature mismatch: should be '"
                        + existing.description() + "', got '" 
                        + this.__methodType.description() + "'");
            }
        }
        Context.ProcDecl.prototype.endParse.call(this);
    }
});

exports.Designator = Designator;
exports.ProcOrMethodId = ProcOrMethodId;
exports.ProcOrMethodDecl = ProcOrMethodDecl;