var Procedure = require("procedure.js");
var Type = require("type.js");

var AnyType = Type.Basic.extend({
	init: function AnyType(){
		Type.Basic.prototype.init.call(this, "ANY");
	},
	findSymbol: function(){return this;},
	callGenerator: function(codegenerator, id){
		return new Procedure.CallGenerator(codegenerator, id);
	}
});

var any = new AnyType();

var Module = Type.Basic.extend({
	init: function(){
		Type.Basic.prototype.init.call(this, "MODULE");
	}
});

var JSModule = Module.extend({
	init: function(){
		Module.prototype.init.call(this);
	},
	findSymbol: function(id){
		return any;
	}
});

exports.AnyType = AnyType;
exports.JS = JSModule;
exports.Type = Module;
