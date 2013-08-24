"use strict";

var Errors = require("errors.js");

function isDigit(c) {return c >= '0' && c <= '9';}

exports.digit = function(stream, context){
    var c = stream.getChar();
    if (!isDigit(c))
        return false;
    context.handleChar(c);
    return true;
};

exports.hexDigit = function(stream, context){
    var c = stream.getChar();
    if (!isDigit(c) && (c < 'A' || c > 'F'))
        return false;
    context.handleChar(c);
    return true;
};

exports.point = function(stream, context){
    if (stream.getChar() != '.'
        || stream.peekChar() == '.') // not a diapason ".."
        return false;
    context.handleLiteral(".");
    return true;
};

exports.character = function(stream, context){
    var c = stream.getChar();
    if (c == '"')
        return false;
    context.handleChar(c);
    return true;
};

function string(stream, context){
    var c = stream.getChar();
    if (c != '"')
        return false;

    var result = "";
    var parsed = false;
    stream.read(function(c){
        if (c == '"'){
            parsed = true;
            return false;
        }
        result += c;
        return true;
    });
    if (!parsed)
        throw new Errors.Error("unexpected end of string");

    stream.next(1);
    context.handleString(result);
    return true;
}

function isLetter(c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');}

var reservedWords
    = ["ARRAY", "IMPORT", "THEN", "BEGIN", "IN", "TO", "BY", "IS",
       "TRUE", "CASE", "MOD", "TYPE", "CONST", "MODULE", "UNTIL", "DIV",
       "NIL", "VAR", "DO", "OF", "WHILE", "ELSE", "OR", "ELSIF", "POINTER",
       "END", "PROCEDURE", "FALSE", "RECORD", "FOR", "REPEAT", "IF", "RETURN"
      ];
var jsReservedWords 
    = ["break", "case", "catch", "continue", "debugger", "default", "delete",
       "do", "else", "finally", "for", "function", "if", "in", "instanceof",
       "new", "return", "switch", "this", "throw", "try", "typeof", "var",
       "void", "while", "with"];

exports.ident = function(stream, context){
    if (!isLetter(stream.peekChar()))
        return false;
    
    var savePos = stream.pos();
    var result = "";
    stream.read(function(c){
        if (!isLetter(c) && !isDigit(c) /*&& c != '_'*/)
            return false;
        result += c;
        return true;
    });

    if (reservedWords.indexOf(result) != -1){
        stream.setPos(savePos);
        return false;
    }
    if (jsReservedWords.indexOf(result) != -1)
        result += "$";

    context.setIdent(result);
    return true;
};

function skipComment(stream){
    if (stream.peekStr(2) != "(*")
        return false;

    stream.next(2);
    while (stream.peekStr(2) != "*)"){
        if (stream.eof())
            throw new Errors.Error("comment was not closed");
        if (!skipComment(stream))
            stream.next(1);
        }
    stream.next(2);
    return true;
}

function readSpaces(c){return ' \t\n\r'.indexOf(c) != -1;}

exports.skipSpaces = function(stream, context){
    if (context && context.isLexem && context.isLexem())
        return;

    do {
        stream.read(readSpaces);
    }
    while (skipComment(stream));
};

exports.separator = function(stream, context){
    return !isLetter(stream.peekChar());
};

exports.literal = function(s){
    return function(stream, context){
        if (stream.str(s.length) != s)
            return false;
        stream.next(s.length);
        
        if ((!context.isLexem || !context.isLexem()) && isLetter(s[s.length - 1])){
            var next = stream.peekChar();
            if (isLetter(next) || isDigit(next))
                return false;
        }
        
        var result = context.handleLiteral(s);
        return result === undefined || result;
    };
};

exports.string = string;