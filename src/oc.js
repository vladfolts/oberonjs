var Code = require("code.js");
var Context = require("context.js")
var Errors = require("errors.js");
var Grammar = require("grammar.js");
var Lexer = require("lexer.js");
var Stream = require("stream.js").Stream;

exports.compile = function(text, handleErrors){
	var stream = new Stream(text);
	var context = new Context.Context();
	try {
		if (!Grammar.module(stream, context))
			throw new Errors.Error("syntax error");
	}
	catch (x) {
		if (x instanceof Errors.Error) {
			//console.log(context.getResult());
			if (handleErrors){
				handleErrors(stream.describePosition() + ": " + x);
				return undefined;
			}
		}
		throw x;
	}
	Lexer.skipSpaces(stream, context);	
	if (!stream.eof())
		throw new Errors.Error("text beyond module end");
	return context.getResult();
}
