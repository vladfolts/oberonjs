"use strict";

var Context = require("context.js");
var Grammar = require("grammar.js");
var ObContext = require("oberon/oberon_context.js");
var Parser = require("parser.js");

var and = Parser.and;
var context = Parser.context;
var optional = Parser.optional;
var repeat = Parser.repeat;

function makeProcedureHeading(ident, identdef, formalParameters){
    return and("PROCEDURE"
             , identdef
             , context(optional(formalParameters), Context.FormalParametersProcDecl));
}

function makeDesignator(qualident, selector){
    return context(and(qualident, repeat(selector)), Context.Designator);
}

function makeProcedureDeclaration(ident, procedureHeading, procedureBody){
    return context(and(procedureHeading, ";",
                       procedureBody,
                       ident),
                   Context.ProcDecl);
}

function makeFieldList(identdef, identList, type){
    return context(and(identList, ":", type), Context.FieldListDeclaration);
}

exports.grammar = Grammar.make(
    makeDesignator,
    makeProcedureHeading,
    makeProcedureDeclaration,
    makeFieldList,
    ObContext.RecordDecl,
    Grammar.reservedWords
    );
