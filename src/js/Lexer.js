var RTL$ = require("rtl.js");
var Context = require("js/Context.js");
var JS = GLOBAL;
var JsString = require("js/JsString.js");
var Errors = require("js/Errors.js");
var Stream = require("js/Stream.js");
var quote = "\"";
var commentBegin = "(*";
var commentEnd = "*)";
var jsReservedWords = "break case catch continue debugger default delete do else finally for function if in instanceof new return switch this throw try typeof var void while with false true null class enum export extends import super implements interface let package private protected public static yield Math";
var Literal = RTL$.extend({
	init: function Literal(){
		this.s = RTL$.makeCharArray(1);
	}
});

function isDigit(c/*CHAR*/){
	return c >= 48 && c <= 57;
}

function isLetter(c/*CHAR*/){
	return c >= 97 && c <= 122 || c >= 65 && c <= 90;
}

function digit(stream/*Type*/, context/*Type*/){
	var result = false;
	var c = 0;
	if (!Stream.eof(stream)){
		c = Stream.getChar(stream);
		if (isDigit(c)){
			context.handleChar(c);
			result = true;
		}
	}
	return result;
}

function hexDigit(stream/*Type*/, context/*Type*/){
	var result = false;
	var c = 0;
	c = Stream.getChar(stream);
	if (isDigit(c) || c >= 65 && c <= 70){
		context.handleChar(c);
		result = true;
	}
	return result;
}

function handleLiteral(context/*Type*/, s/*ARRAY OF CHAR*/){
	var result = false;
	var r = context.handleLiteral(JsString.make(s)); result = (r === undefined || r);
	return result;
}

function point(stream/*Type*/, context/*Type*/){
	var result = false;
	if (!Stream.eof(stream) && Stream.getChar(stream) == 46 && (Stream.eof(stream) || Stream.peekChar(stream) != 46)){
		result = handleLiteral(context, ".");
	}
	return result;
}

function string(stream/*Type*/, context/*Type*/){
	var result = false;
	var c = 0;
	var s = null;
	if (!Stream.eof(stream)){
		c = Stream.getChar(stream);
		if (c == 34){
			if (!Stream.eof(stream)){
				s = JsString.make("");
				c = Stream.getChar(stream);
				while (true){
					if (c != 34 && !Stream.eof(stream)){
						if (c != 34){
							s = JsString.appendChar(s, c);
						}
						c = Stream.getChar(stream);
					} else break;
				}
			}
			if (s == null || c != 34){
				Errors.raise(JsString.make("unexpected end of string"));
			}
			context.handleString(s);
			result = true;
		}
	}
	return result;
}

function isReservedWorld(s/*Type*/, words/*ARRAY OF CHAR*/){
	var i = 0;var w = 0;
	while (true){
		if (w < words.length && i < JsString.len(s) && words.charCodeAt(w) == JsString.at(s, i) && (i != 0 || w == 0 || words.charCodeAt(w - 1 | 0) == 32)){
			++w;
			++i;
		}
		else if (w < words.length && (i < JsString.len(s) || words.charCodeAt(w) != 32)){
			++w;
			i = 0;
		} else break;
	}
	return i == JsString.len(s);
}

function ident(stream/*Type*/, context/*Type*/, reservedWords/*ARRAY OF CHAR*/){
	var result = false;
	var c = 0;
	var s = null;
	if (!Stream.eof(stream)){
		c = Stream.getChar(stream);
		if (isLetter(c)){
			s = JsString.make("");
			while (true){
				if (!Stream.eof(stream) && (isLetter(c) || isDigit(c))){
					s = JsString.appendChar(s, c);
					c = Stream.getChar(stream);
				} else break;
			}
			if (isLetter(c) || isDigit(c)){
				s = JsString.appendChar(s, c);
			}
			else {
				Stream.next(stream, -1);
			}
			if (!isReservedWorld(s, reservedWords)){
				if (isReservedWorld(s, jsReservedWords)){
					s = JsString.appendChar(s, 36);
				}
				context.handleIdent(s);
				result = true;
			}
		}
	}
	return result;
}

function skipComment(stream/*Type*/, context/*Type*/){
	var result = false;
	if (Stream.peekStr(stream, commentBegin)){
		Stream.next(stream, commentBegin.length);
		while (true){
			if (!Stream.peekStr(stream, commentEnd)){
				if (!skipComment(stream, context)){
					Stream.next(stream, 1);
					if (Stream.eof(stream)){
						Errors.raise(JsString.make("comment was not closed"));
					}
				}
			} else break;
		}
		Stream.next(stream, commentEnd.length);
		result = true;
	}
	return result;
}

function readSpaces(c/*CHAR*/){
	return c == 32 || c == 8 || c == 9 || c == 10 || c == 13;
}

function skipSpaces(stream/*Type*/, context/*Type*/){
	if (context.isLexem == null || !context.isLexem()){
		while (true){
			if (Stream.read(stream, readSpaces) && skipComment(stream, context)){
			} else break;
		}
	}
}

function separator(stream/*Type*/, context/*Type*/){
	return Stream.eof(stream) || !isLetter(Stream.peekChar(stream));
}

function makeLiteral(s/*ARRAY OF CHAR*/){
	var result = null;
	result = new Literal();
	result.s = s;
	return result;
}

function literal(l/*Literal*/, stream/*Type*/, context/*Type*/){
	var result = false;
	if (Stream.peekStr(stream, l.s)){
		Stream.next(stream, l.s.length);
		if (context.isLexem != null && context.isLexem() || !isLetter(l.s.charCodeAt(l.s.length - 1 | 0)) || Stream.eof(stream) || !isLetter(Stream.peekChar(stream)) && !isDigit(Stream.peekChar(stream))){
			result = handleLiteral(context, l.s);
		}
	}
	return result;
}
exports.digit = digit;
exports.hexDigit = hexDigit;
exports.point = point;
exports.string = string;
exports.ident = ident;
exports.skipSpaces = skipSpaces;
exports.separator = separator;
exports.makeLiteral = makeLiteral;
exports.literal = literal;
