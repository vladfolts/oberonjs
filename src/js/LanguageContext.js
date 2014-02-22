var Context = require("js/Context.js");
var Language = require("js/Language.js");
var Type = Context.Type.extend({
	init: function Type(){
		Context.Type.prototype.init.call(this);
	}
});
exports.Type = Type;
