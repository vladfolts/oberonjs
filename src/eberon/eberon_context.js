"use strict";

var Context = require("context.js");

var MethodId = Context.Chained.extend({
    init: function EberonContext$MethodId(parent){
        Context.Chained.prototype.init.call(this, parent);
    },
    handleIdent: function(id){

    },
    handleLiteral: function(){

    },
    handleIdentdef: function(id){
        this.parent().handleIdentdef(id);
    }
});

exports.MethodId = MethodId;