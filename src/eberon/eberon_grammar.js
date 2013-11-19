"use strict";

var Context = require("context.js");
var EbContext = require("eberon/eberon_context.js");
var Grammar = require("grammar.js");
var Parser = require("parser.js");

var and = Parser.and;
var context = Parser.context;
var optional = Parser.optional;

var procedureHeading = and("PROCEDURE",
                           context(and(optional(and(Grammar.ident, ".")), Grammar.identdef), EbContext.MethodId),
                           context(optional(Grammar.formalParameters), Context.FormalParametersProcDecl));

function makeProcedureDeclaration(procedureBody){
    return Grammar.makeProcedureDeclaration(procedureHeading, procedureBody);
}

exports.grammar = Grammar.make(makeProcedureDeclaration);
exports.grammar.procedureHeading = procedureHeading;
