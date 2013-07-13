"use strict";

var Procedure = require("procedure.js");
var Symbol = require("symbol.js");
var Type = require("type.js");

var AnyType = Type.Basic.extend({
	init: function AnyType(){
		Type.Basic.prototype.init.call(this, "ANY");
	},
	findSymbol: function(){return this;},
	callGenerator: function(context, id){
		return new Procedure.CallGenerator(context, id);
	}
});

var any = new AnyType();

var JSModule = Type.Module.extend({
	init: function(){
		Type.Module.prototype.init.call(this);
	},
	findSymbol: function(id){
		return new Symbol.Found(new Symbol.Symbol("JS." + id, any));
	}
});

exports.AnyType = AnyType;
exports.JS = JSModule;
