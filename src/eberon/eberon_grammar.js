"use strict";

var Context = require("context.js");
var EbContext = require("eberon/eberon_context.js");
var Grammar = require("grammar.js");
var Parser = require("parser.js");

var and = Parser.and;
var context = Parser.context;
var optional = Parser.optional;
var or = Parser.or;
var repeat = Parser.repeat;

var ident = Grammar.ident;

var methAttributes = optional(and(",", "NEW"));

function makeProcedureHeading(formalParameters){
    return and("PROCEDURE",
               context(and(optional(and(ident, ".")), Grammar.identdef), EbContext.ProcOrMethodId),
               context(optional(formalParameters), Context.FormalParametersProcDecl),
               methAttributes);
}

function makeDesignator(selector){
    return context(
        and(or("SELF", "SUPER", Grammar.qualident), repeat(selector)), EbContext.Designator);
}

function makeProcedureDeclaration(formalParameters, procedureBody){
    var procedureHeading = makeProcedureHeading(formalParameters);
    return context(and(procedureHeading, ";",
                       procedureBody,
                       and(ident, optional(and(".", ident)))),
                   EbContext.ProcOrMethodDecl);
}

exports.grammar = Grammar.make(makeDesignator, makeProcedureDeclaration);
