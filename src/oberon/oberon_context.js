"use strict";

var Context = require("context.js");
var Errors = require("js/Errors.js");
var Type = require("js/Types.js");

var RecordDecl = Context.RecordDecl.extend({
    init: function OberonContext$RecordDecl(context){
        Context.RecordDecl.prototype.init.call(this, context, Type.makeRecord);
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

exports.RecordDecl = RecordDecl;
exports.VariableDeclaration = VariableDeclaration;
