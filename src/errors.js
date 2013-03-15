var Class = require("rtl.js").Class;

exports.Error = Class.extend({
	init: function CompileError(msg) {this.__msg = msg;},
	toString: function(){return this.__msg;}
});
