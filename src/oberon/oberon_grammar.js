"use strict";

var Context = require("context.js");
var Grammar = require("grammar.js");
var Parser = require("parser.js");

var and = Parser.and;
var context = Parser.context;
var optional = Parser.optional;
var repeat = Parser.repeat;

function makeProcedureHeading(formalParameters){
    return and("PROCEDURE"
             , Grammar.identdef
             , context(optional(formalParameters), Context.FormalParametersProcDecl));
}

function makeDesignator(selector){
    return context(and(Grammar.qualident, repeat(selector)), Context.Designator);
}

function makeProcedureDeclaration(formalParameters, procedureBody){
    var procedureHeading = makeProcedureHeading(formalParameters);
    return context(and(procedureHeading, ";",
                       procedureBody,
                       Grammar.ident),
                   Context.ProcDecl);
}

exports.grammar = Grammar.make(makeDesignator, makeProcedureDeclaration);
//exports.grammar.procedureHeading = procedureHeading;

