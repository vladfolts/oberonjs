var RTL$ = require("rtl.js");
var JsString = require("js/JsString.js");
var OberonRtl = require("js/OberonRtl.js");
var Object = require("js/Object.js");
var ScopeBase = require("js/ScopeBase.js");
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
exports.Type = Type;
