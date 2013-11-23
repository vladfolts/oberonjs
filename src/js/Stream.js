var RTL$ = require("rtl.js");
var JsString = require("js/JsString.js");
var Type = RTL$.extend({
	init: function Type(){
		this.s = null;
		this.pos = 0;
	}
});

function make(text/*Type*/){
	var result = null;
	result = new Type();
	result.s = text;
	return result;
}

function eof(self/*Type*/){
	return self.pos == JsString.len(self.s);
}

function pos(self/*Type*/){
	return self.pos;
}

function setPos(self/*Type*/, pos/*INTEGER*/){
	RTL$.assert(pos <= JsString.len(self.s));
	self.pos = pos;
}

function next(self/*Type*/, n/*INTEGER*/){
	RTL$.assert((self.pos + n | 0) <= JsString.len(self.s));
	self.pos = self.pos + n | 0;
}

function peekChar(self/*Type*/){
	RTL$.assert(!eof(self));
	return JsString.at(self.s, self.pos);
}

function getChar(self/*Type*/){
	var result = 0;
	RTL$.assert(!eof(self));
	result = JsString.at(self.s, self.pos);
	++self.pos;
	return result;
}

function peekStr(self/*Type*/, s/*ARRAY OF CHAR*/){
	var result = false;
	var i = 0;
	if (s.length <= (JsString.len(self.s) - self.pos | 0)){
		while (true){
			if (i < s.length && s.charCodeAt(i) == JsString.at(self.s, self.pos + i | 0)){
				++i;
			} else break;
		}
		result = i == s.length;
	}
	return result;
}

function read(self/*Type*/, f/*ReaderProc*/){
	while (true){
		if (!eof(self) && f(peekChar(self))){
			next(self, 1);
		} else break;
	}
	return !eof(self);
}

function lineNumber(self/*Type*/){
	var line = 0;
	var lastPos = 0;
	lastPos = JsString.indexOf(self.s, 10);
	while (true){
		if (lastPos != -1 && lastPos < self.pos){
			++line;
			lastPos = JsString.indexOfFrom(self.s, 10, lastPos + 1 | 0);
		} else break;
	}
	return line + 1 | 0;
}
exports.Type = Type;
exports.make = make;
exports.eof = eof;
exports.pos = pos;
exports.setPos = setPos;
exports.next = next;
exports.peekChar = peekChar;
exports.getChar = getChar;
exports.peekStr = peekStr;
exports.read = read;
exports.lineNumber = lineNumber;
