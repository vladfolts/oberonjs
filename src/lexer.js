"use strict";

var Errors = require("errors.js");
var Stream = require("oberon.js/Stream.js");

function isDigit(c) {return c >= '0' && c <= '9';}

exports.digit = function(stream, context){
    if (Stream.eof(stream))
        return false;

    var c = Stream.getChar(stream);
    if (!isDigit(c))
        return false;
    context.handleChar(c);
    return true;
};

exports.hexDigit = function(stream, context){
    var c = Stream.getChar(stream);
    if (!isDigit(c) && (c < 'A' || c > 'F'))
        return false;
    context.handleChar(c);
    return true;
};

exports.point = function(stream, context){
    if (Stream.eof(stream) 
        || Stream.getChar(stream) != '.'
        || (!Stream.eof(stream) && Stream.peekChar(stream) == '.')) // not a diapason ".."
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
    if (Stream.eof(stream))
        return false;

    var c = Stream.getChar(stream);
    if (c != '"')
        return false;

    var result = "";
    var parsed = false;
    Stream.read(stream, function(c){
        if (c == '"'){
            parsed = true;
            return false;
        }
        result += c;
        return true;
    });
    if (!parsed)
        throw new Errors.Error("unexpected end of string");

    Stream.next(stream, 1);
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
       "void", "while", "with",
       "Math" // Math is used in generated code for some functions so it is reserved word from code generator standpoint
       ];

exports.ident = function(stream, context){
    if (Stream.eof(stream) || !isLetter(Stream.peekChar(stream)))
        return false;
    
    var savePos = Stream.pos(stream);
    var result = "";
    Stream.read(stream, function(c){
        if (!isLetter(c) && !isDigit(c) /*&& c != '_'*/)
            return false;
        result += c;
        return true;
    });

    if (reservedWords.indexOf(result) != -1){
        Stream.setPos(stream, savePos);
        return false;
    }
    if (jsReservedWords.indexOf(result) != -1)
        result += "$";

    context.setIdent(result);
    return true;
};

function skipComment(stream){
    if (Stream.peekStr(stream, 2) != "(*")
        return false;

    Stream.next(stream, 2);
    while (Stream.peekStr(stream, 2) != "*)"){
        if (Stream.eof(stream))
            throw new Errors.Error("comment was not closed");
        if (!skipComment(stream))
            Stream.next(stream, 1);
        }
    Stream.next(stream, 2);
    return true;
}

function readSpaces(c){return ' \t\n\r'.indexOf(c) != -1;}

exports.skipSpaces = function(stream, context){
    if (context && context.isLexem && context.isLexem())
        return;

    do {
        Stream.read(stream, readSpaces);
    }
    while (skipComment(stream));
};

exports.separator = function(stream, context){
    return Stream.eof(stream) || !isLetter(Stream.peekChar(stream));
};

exports.literal = function(s){
    return function(stream, context){
        if (Stream.peekStr(stream, s.length) != s)
            return false;
        Stream.next(stream, s.length);
        
        if ((!context.isLexem || !context.isLexem())
            && isLetter(s[s.length - 1])
            && !Stream.eof(stream)
           ){
            var next = Stream.peekChar(stream);
            if (isLetter(next) || isDigit(next))
                return false;
        }
        
        var result = context.handleLiteral(s);
        return result === undefined || result;
    };
};

exports.string = string;