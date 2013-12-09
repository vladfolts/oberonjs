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

function makeProcedureHeading(formalParameters){
    return and("PROCEDURE",
               context(and(optional(and(ident, ".")), Grammar.identdef), EbContext.ProcOrMethodId),
               context(optional(formalParameters), Context.FormalParametersProcDecl)
               );
}

function makeDesignator(selector){
    return context(
        and(or("SELF", "SUPER", Grammar.qualident), repeat(selector)), EbContext.Designator);
}

function makeProcedureDeclaration(procedureHeading, procedureBody){
    return context(and(procedureHeading, ";",
                       procedureBody,
                       and(ident, optional(and(".", ident)))),
                   EbContext.ProcOrMethodDecl);
}

function makeMethodHeading(formalParameters){
    return context(
        and("PROCEDURE",
            Grammar.identdef,
            context(optional(formalParameters), Context.FormalParametersProcDecl)),
        EbContext.MethodHeading);
}

function makeFieldList(identList, type, formalParameters){
    return context(
        or(makeMethodHeading(formalParameters),
           and(identList, ":", type)),
        Context.FieldListDeclaration);
}

exports.grammar = Grammar.make(
    makeDesignator,
    makeProcedureHeading,
    makeProcedureDeclaration,
    makeFieldList,
    EbContext.RecordDecl
    );
