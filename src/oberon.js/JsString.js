var RTL$ = require("rtl.js");
var JS = GLOBAL;
var Type = RTL$.extend({
	init: function Type(){
	}
});

function make(s/*ARRAY OF CHAR*/){
	var result = null;
	var i = 0;
	result = '';
	for (i = 0; i <= s.length - 1 | 0; ++i){
		result += JS.String.fromCharCode(s.charCodeAt(i));
	}
	return result;
}

function len(self/*Type*/){
	var result = 0;
	result = self.length;
	return result;
}

function at(self/*Type*/, pos/*INTEGER*/){
	var result = 0;
	result = self.charCodeAt(pos);
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

function appendChar(self/*Type*/, c/*CHAR*/){
	var result = null;
	result = self;
	result += JS.String.fromCharCode(c);
	return result;
}
exports.Type = Type;
exports.make = make;
exports.len = len;
exports.at = at;
exports.indexOf = indexOf;
exports.indexOfFrom = indexOfFrom;
exports.substr = substr;
exports.appendChar = appendChar;
