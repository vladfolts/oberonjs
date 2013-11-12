var RTL$ = require("rtl.js");
var JS = GLOBAL;
var JsString = require("JsString.js");
var Error = RTL$.extend({
	init: function Error(){
	}
});

function raise(msg/*Type*/){
	throw new Error(msg);
}
Error = function(msg){this.__msg = msg;};
Error.prototype.toString = function(){return this.__msg;};;
exports.Error = Error;
exports.raise = raise;
