"use strict";

var Context = require("context.js");
var EbContext = require("eberon/eberon_context.js");
var Grammar = require("grammar.js");
var Parser = require("parser.js");

var and = Parser.and;
var context = Parser.context;
var optional = Parser.optional;

var ident = Grammar.ident;

var methAttributes = optional(and(",", "NEW"));
var procedureHeading = and("PROCEDURE",
                           context(and(optional(and(ident, ".")), Grammar.identdef), EbContext.ProcOrMethodId),
                           context(optional(Grammar.formalParameters), Context.FormalParametersProcDecl),
                           methAttributes);

function makeProcedureDeclaration(procedureBody){
    return context(and(procedureHeading, ";",
                       procedureBody,
                       and(ident, optional(and(".", ident)))),
                   EbContext.ProcOrMethodDecl);
}

exports.grammar = Grammar.make(makeProcedureDeclaration);
exports.grammar.procedureHeading = procedureHeading;
