var RTL$ = require("rtl.js");
var JsString = require("js/JsString.js");
var Object = require("js/Object.js");
var Scope = RTL$.extend({
	init: function Scope(){
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
	}
});
exports.Scope = Scope;
exports.Type = Type;
