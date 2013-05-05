var assert = require("assert.js").ok;
var Errors = require("errors.js");
var Lexer = require("lexer.js");

exports.and = function(/*...*/){
	var args = arguments;
	assert(args.length >= 2);

	return function(stream, context){
		for(var i = 0; i < args.length; ++i){
			if (i != 0)
				Lexer.skipSpaces(stream, context);
			
			var p = args[i];
			if (typeof p == "string")
				p = Lexer.literal(p);
			
			if (!p(stream, context))
				return false;
		}
	 	return true;
	}
}

exports.or = function(/*...*/){
	var args = arguments;
	assert(args.length >= 2);

	return function(stream, context){
		for(var i = 0; i < args.length; ++i){
			var p = args[i];
			if (typeof p == "string")
				p = Lexer.literal(p);
			
			var savePos = stream.pos();
			if (p(stream, context))
				return true;
			stream.setPos(savePos);
		}
		return false;
	}
}

exports.repeat = function(p){
	return function(stream, context){
			var savePos = stream.pos();
			while (!stream.eof() && p(stream, context)){
				Lexer.skipSpaces(stream, context);
				savePos = stream.pos();
			}
			stream.setPos(savePos);
			return true;
		}
}

exports.optional = function(p){
	assert(arguments.length == 1);
	if (typeof(p) === "string")
		p = Lexer.literal(p);
	return function(stream, context){
		var savePos = stream.pos();
		if ( !p(stream, context))
			stream.setPos(savePos);
		return true;
		}
}

exports.required = function(parser, error){
	if (typeof(parser) === "string")
		parser = Lexer.literal(parser);
	return function(stream, context){
		if (!parser(stream, context))
			throw new Errors.Error(error);
		return true;
	}
}

exports.context = function(parser, contextFactory){
	return function(stream, context){
		var context = new contextFactory(context);
		if (!parser(stream, context))
			return false;
		if (context.endParse)
			return context.endParse() !== false;
		return true;
	}
}

exports.emit = function(parser, action){
	assert(action);
	if (typeof(parser) === "string")
		parser = Lexer.literal(parser);
	return function(stream, context){
		if (!parser(stream, context))
			return false;
		action(context);
		return true;
	}
}
