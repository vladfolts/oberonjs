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

function makeProcedureHeading(ident, identdef, formalParameters){
    return and("PROCEDURE",
               context(and(optional(and(ident, ".")), identdef), EbContext.ProcOrMethodId),
               context(optional(formalParameters), Context.FormalParametersProcDecl)
               );
}

function makeDesignator(qualident, selector){
    return context(
        and(or("SELF", "SUPER", qualident), repeat(selector)), EbContext.Designator);
}

function makeProcedureDeclaration(ident, procedureHeading, procedureBody){
    return context(and(procedureHeading, ";",
                       procedureBody,
                       and(ident, optional(and(".", ident)))),
                   EbContext.ProcOrMethodDecl);
}

function makeMethodHeading(identdef, formalParameters){
    return context(
        and("PROCEDURE",
            identdef,
            context(optional(formalParameters), Context.FormalParametersProcDecl)),
        EbContext.MethodHeading);
}

function makeFieldList(identdef, identList, type, formalParameters){
    return context(
        or(makeMethodHeading(identdef, formalParameters),
           and(identList, ":", type)),
        Context.FieldListDeclaration);
}

exports.grammar = Grammar.make(
    makeDesignator,
    makeProcedureHeading,
    makeProcedureDeclaration,
    makeFieldList,
    EbContext.RecordDecl,
    Grammar.reservedWords + " SELF SUPER"
    );
