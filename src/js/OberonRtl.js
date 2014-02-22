var RTL$ = require("rtl.js");
var JsString = require("js/JsString.js");
var Type = RTL$.extend({
	init: function Type(){
		this.copy = null;
		this.strCmp = null;
		this.assignArrayFromString = null;
		this.setInclL = null;
		this.setInclR = null;
		this.assertId = null;
	}
});
exports.Type = Type;
