"use strict";

var Type = require("type.js");
var Context = require("context.js");

var RecordDecl = Context.RecordDecl.extend({
    init: function OberonContext$RecordDecl(context){
        Context.RecordDecl.prototype.init.call(this, context, Type.Record);
    }
});

exports.RecordDecl = RecordDecl;