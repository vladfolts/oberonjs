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
	init: function Module$JSModule(){
		Type.Module.prototype.init.call(this);
	},
	name: function(){return "this";},
	findSymbol: function(id){
		return new Symbol.Found(new Symbol.Symbol(id, any));
	}
});

exports.AnyType = AnyType;
exports.JS = JSModule;
