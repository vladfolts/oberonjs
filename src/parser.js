"use strict";

var assert = require("assert.js").ok;
var Errors = require("errors.js");
var Lexer = require("oberon.js/lexer.js");
var Stream = require("oberon.js/Stream.js");

function literal(s){
	var l = Lexer.makeLiteral(s);
	return function(stream, context){
		return Lexer.literal(l, stream, context);
	};
}

function implicitParser(p){
	return typeof p === "string" ? literal(p) : p;
}

function argumentsToParsers(args){
	var parsers = Array.prototype.slice.call(args);
	for(var i = 0; i < parsers.length; ++i)
		parsers[i] = implicitParser(parsers[i]);
	return parsers;
}

exports.and = function(/*...*/){
	assert(arguments.length >= 2);
	var parsers = argumentsToParsers(arguments);

	return function(stream, context){
		for(var i = 0; i < parsers.length; ++i){
			if (i)
				Lexer.skipSpaces(stream, context);
			
			var p = parsers[i];
			if (!p(stream, context))
				return false;
		}
		return true;
	};
};

exports.or = function(/*...*/){
	assert(arguments.length >= 2);
	var parsers = argumentsToParsers(arguments);

	return function(stream, context){
		for(var i = 0; i < parsers.length; ++i){
			var p = parsers[i];
			var savePos = Stream.pos(stream);
			if (p(stream, context))
				return true;
			Stream.setPos(stream, savePos);
		}
		return false;
	};
};

exports.repeat = function(p){
	return function(stream, context){
			var savePos = Stream.pos(stream);
			while (!Stream.eof(stream) && p(stream, context)){
				Lexer.skipSpaces(stream, context);
				savePos = Stream.pos(stream);
			}
			Stream.setPos(stream, savePos);
			return true;
		};
};

exports.optional = function(parser){
	assert(arguments.length == 1);
	var p = implicitParser(parser);

	return function(stream, context){
		var savePos = Stream.pos(stream);
		if ( !p(stream, context))
			Stream.setPos(stream, savePos);
		return true;
		};
};

exports.required = function(parserOrString, error){
	var parser = implicitParser(parserOrString);
	
	return function(stream, context){
		if (!parser(stream, context))
			throw new Errors.Error(error 
					? error 
					: ("'" + parserOrString + "' expected"));
		return true;
	};
};

exports.context = function(parser, ContextFactory){
	return function(stream, child){
		var context = new ContextFactory(child);
		if (!parser(stream, context))
			return false;
		if (context.endParse)
			return context.endParse() !== false;
		return true;
	};
};

exports.emit = function(parser, action){
	assert(action);
	var p = implicitParser(parser);

	return function(stream, context){
		if (!p(stream, context))
			return false;
		action(context);
		return true;
	};
};

exports.literal = literal;