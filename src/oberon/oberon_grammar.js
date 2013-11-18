"use strict";

var Context = require("context.js");
var Grammar = require("grammar.js");
var Parser = require("parser.js");

var and = Parser.and;
var context = Parser.context;
var optional = Parser.optional;

var procedureHeading = and("PROCEDURE"
                         , Grammar.identdef
                         , context(optional(Grammar.formalParameters), Context.FormalParametersProcDecl));

function makeProcedureDeclaration(procedureBody){
    return Grammar.makeProcedureDeclaration(procedureHeading, procedureBody);
}

exports.grammar = Grammar.make(makeProcedureDeclaration);
exports.grammar.procedureHeading = procedureHeading;

