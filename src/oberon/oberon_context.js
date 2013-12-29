"use strict";

var Type = require("js/Types.js");
var Context = require("context.js");

var RecordDecl = Context.RecordDecl.extend({
    init: function OberonContext$RecordDecl(context){
        Context.RecordDecl.prototype.init.call(this, context, Type.makeRecord);
    }
});

exports.RecordDecl = RecordDecl;