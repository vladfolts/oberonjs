var RTL$ = require("rtl.js");
var JsString = require("js/JsString.js");
var Object = require("js/Object.js");
var Scope = RTL$.extend({
	init: function Scope(){
	}
});
var Rtl = RTL$.extend({
	init: function Rtl(){
		this.copy = null;
		this.strCmp = null;
		this.assignArrayFromString = null;
		this.setInclL = null;
		this.setInclR = null;
		this.assertId = null;
	}
});
var Type = RTL$.extend({
	init: function Type(){
		this.handleChar = null;
		this.handleLiteral = null;
		this.handleString = null;
		this.handleIdent = null;
		this.isLexem = null;
		this.qualifyScope = null;
		this.rtl = null;
	}
});
exports.Scope = Scope;
exports.Rtl = Rtl;
exports.Type = Type;
