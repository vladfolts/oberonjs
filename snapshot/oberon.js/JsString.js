var RTL$ = require("RTL$.js").RTL$;
var JS = GLOBAL;
var Type = RTL$.extend({
	init: function Type(){
	}
});

function len(self/*Type*/){
	var result = 0;
	result = self.length;
	return result;
}

function at(self/*Type*/, pos/*INTEGER*/){
	var result = 0;
	result = self[pos];
	return result;
}

function indexOf(self/*Type*/, c/*CHAR*/){
	var result = 0;
	result = self.indexOf(JS.String.fromCharCode(c));
	return result;
}

function indexOfFrom(self/*Type*/, c/*CHAR*/, pos/*INTEGER*/){
	var result = 0;
	result = self.indexOf(JS.String.fromCharCode(c), pos);
	return result;
}

function substr(self/*Type*/, pos/*INTEGER*/, len/*INTEGER*/){
	var result = null;
	result = self.substr(pos, len);
	return result;
}
exports.Type = Type;
exports.len = len;
exports.at = at;
exports.indexOf = indexOf;
exports.indexOfFrom = indexOfFrom;
exports.substr = substr;
