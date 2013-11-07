var RTL$ = require("rtl.js");
var JS = GLOBAL;
var JsString = require("JsString.js");
var Stream = require("Stream.js");
var quote = "\"";
var commentBegin = "(*";
var commentEnd = "*)";
var Context = RTL$.extend({
	init: function Context(){
		this.handleChar = null;
		this.handleLiteral = null;
		this.handleString = null;
		this.handleIdent = null;
		this.isLexem = null;
		this.raiseException = null;
	}
});
var Literal = RTL$.extend({
	init: function Literal(){
		this.s = RTL$.makeArray(1, 0);
	}
});
var reservedWords = null;
var jsReservedWords = null;

function isDigit(c/*CHAR*/){
	return c >= 48 && c <= 57;
}

function isLetter(c/*CHAR*/){
	return c >= 97 && c <= 122 || c >= 65 && c <= 90;
}

function digit(stream/*Type*/, context/*Context*/){
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

function hexDigit(stream/*Type*/, context/*Context*/){
	var result = false;
	var c = 0;
	c = Stream.getChar(stream);
	if (isDigit(c) || c >= 65 && c <= 70){
		context.handleChar(c);
		result = true;
	}
	return result;
}

function handleLiteral(context/*Context*/, s/*ARRAY OF CHAR*/){
	var result = false;
	var r = context.handleLiteral(JsString.make(s)); result = (r === undefined || r);
	return result;
}

function point(stream/*Type*/, context/*Context*/){
	var result = false;
	if (!Stream.eof(stream) && Stream.getChar(stream) == 46 && (Stream.eof(stream) || Stream.peekChar(stream) != 46)){
		result = handleLiteral(context, RTL$.strToArray("."));
	}
	return result;
}

function string(stream/*Type*/, context/*Context*/){
	var result = false;
	var c = 0;
	var s = null;
	if (!Stream.eof(stream)){
		c = Stream.getChar(stream);
		if (c == 34){
			if (!Stream.eof(stream)){
				s = JsString.make(RTL$.strToArray(""));
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
				context.raiseException(RTL$.strToArray("unexpected end of string"));
			}
			context.handleString(s);
			result = true;
		}
	}
	return result;
}

function isReservedWorld(s/*Type*/, words/*Type*/){
	var i = 0;var w = 0;
	while (true){
		if (w < JsString.len(words) && i < JsString.len(s) && JsString.at(words, w) == JsString.at(s, i) && (i != 0 || w == 0 || JsString.at(words, w - 1 | 0) == 32)){
			++w;
			++i;
		}
		else if (w < JsString.len(words) && (i < JsString.len(s) || JsString.at(words, w) != 32)){
			++w;
			i = 0;
		} else break;
	}
	return i == JsString.len(s);
}

function ident(stream/*Type*/, context/*Context*/){
	var result = false;
	var c = 0;
	var s = null;
	if (!Stream.eof(stream)){
		c = Stream.getChar(stream);
		if (isLetter(c)){
			s = JsString.make(RTL$.strToArray(""));
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

function skipComment(stream/*Type*/, context/*Context*/){
	var result = false;
	if (Stream.peekStr(stream, RTL$.strToArray(commentBegin))){
		Stream.next(stream, commentBegin.length);
		while (true){
			if (!Stream.peekStr(stream, RTL$.strToArray(commentEnd))){
				if (!skipComment(stream, context)){
					Stream.next(stream, 1);
					if (Stream.eof(stream)){
						context.raiseException(RTL$.strToArray("comment was not closed"));
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

function skipSpaces(stream/*Type*/, context/*Context*/){
	if (context.isLexem == null || !context.isLexem()){
		while (true){
			if (Stream.read(stream, readSpaces) && skipComment(stream, context)){
			} else break;
		}
	}
}

function separator(stream/*Type*/, context/*Context*/){
	return Stream.eof(stream) || !isLetter(Stream.peekChar(stream));
}

function makeLiteral(s/*ARRAY OF CHAR*/){
	var result = null;
	result = new Literal();
	result.s = s;
	return result;
}

function literal(l/*Literal*/, stream/*Type*/, context/*Context*/){
	var result = false;
	if (Stream.peekStr(stream, l.s)){
		Stream.next(stream, l.s.length);
		if (context.isLexem != null && context.isLexem() || !isLetter(l.s[l.s.length - 1 | 0]) || Stream.eof(stream) || !isLetter(Stream.peekChar(stream)) && !isDigit(Stream.peekChar(stream))){
			result = handleLiteral(context, l.s);
		}
	}
	return result;
}
reservedWords = JsString.make(RTL$.strToArray("ARRAY IMPORT THEN BEGIN IN TO BY IS TRUE CASE MOD TYPE CONST MODULE UNTIL DIV NIL VAR DO OF WHILE ELSE OR ELSIF POINTER END PROCEDURE FALSE RECORD FOR REPEAT IF RETURN"));
jsReservedWords = JsString.make(RTL$.strToArray("break case catch continue debugger default delete do else finally for function if in instanceof new return switch this throw try typeof var void while with Math"));
exports.digit = digit;
exports.hexDigit = hexDigit;
exports.point = point;
exports.string = string;
exports.ident = ident;
exports.skipSpaces = skipSpaces;
exports.separator = separator;
exports.makeLiteral = makeLiteral;
exports.literal = literal;
