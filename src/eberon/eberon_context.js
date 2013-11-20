"use strict";

var Context = require("context.js");
var Errors = require("js/Errors.js");
var Type = require("type.js");

var ProcOrMethodId = Context.Chained.extend({
    init: function EberonContext$ProcOrMethodId(parent){
        Context.Chained.prototype.init.call(this, parent);
        this.__maybeTypeId = undefined;
        this.__type = undefined;
    },
    handleIdent: function(id){this.__maybeTypeId = id;},
    handleLiteral: function(){
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

var ProcOrMethodDecl = Context.ProcDecl.extend({
    init: function EberonContext$ProcOrMethodDecl(parent){
        Context.ProcDecl.prototype.init.call(this, parent);
        this.__boundType = undefined;
        this.__endingId = undefined;
    },
    handleMethodOrProc: function(id, type){
        this.__boundType = type;
        Context.ProcDecl.prototype.handleIdentdef.call(
            this,
            type ? new Context.IdentdefInfo(type.name() + "." + id.id(), id.exported()) : id
            );
    },
    handleIdent: function(id){
        if (this.__boundType){
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
        if (this.__boundType && this.__endingId)
            // shoulf throw
            Context.ProcDecl.prototype.handleIdent.call(this, this.__endingId);
        Context.ProcDecl.prototype.endParse.call(this);
    }
});

exports.ProcOrMethodId = ProcOrMethodId;
exports.ProcOrMethodDecl = ProcOrMethodDecl;