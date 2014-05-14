"use strict";

var Cast = require("js/EberonCast.js");
var Context = require("context.js");
var EbContext = require("eberon/eberon_context.js");
var Grammar = require("grammar.js");
var Parser = require("parser.js");
var Symbols = require("js/EberonSymbols.js");

var and = Parser.and;
var context = Parser.context;
var optional = Parser.optional;
var or = Parser.or;
var repeat = Parser.repeat;
var required = Parser.required;

function makeProcedureHeading(ident, identdef, formalParameters){
    return and("PROCEDURE",
               context(and(optional(and(ident, ".")), identdef), EbContext.ProcOrMethodId),
               context(optional(formalParameters), Context.FormalParametersProcDecl)
               );
}

function makeAssignmentOrProcedureCall(ident, designator, assignment, expression){
    return or(
        context(and(ident, "<-", required(expression, "initialization expression expected")), EbContext.TemplValueInit),
        context(and(designator, optional(assignment)), EbContext.AssignmentOrProcedureCall)
        );
}

function makeIdentdef(ident){
    return context(and(ident, optional(or("*", "-"))), EbContext.Identdef);
}

function makeDesignator(ident, qualident, selector, actualParameters){
    var designator = context(
        and(or("SELF", "SUPER", qualident), repeat(or(selector, actualParameters))), EbContext.Designator);
    return { 
        factor: context(designator, EbContext.ExpressionProcedureCall),
        assignmentOrProcedureCall: function(assignment, expression){
            return makeAssignmentOrProcedureCall(ident, designator, assignment, expression);
        }
    };
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

exports.language = {
    grammar: Grammar.make(
        makeIdentdef,
        makeDesignator,
        makeProcedureHeading,
        makeProcedureDeclaration,
        makeFieldList, 
        { 
            constDeclaration:   EbContext.ConstDecl, 
            typeDeclaration:    EbContext.TypeDeclaration,
            recordDecl:         EbContext.RecordDecl,
            variableDeclaration: EbContext.VariableDeclaration,
            Term:               EbContext.Term,
            AddOperator:        EbContext.AddOperator,
            Expression:         EbContext.Expression,
            For:                EbContext.For,
            While:              EbContext.While,
            If:                 EbContext.If,
            CaseLabel:          EbContext.CaseLabel,
            Repeat:             EbContext.Repeat
        },
        Grammar.reservedWords + " SELF SUPER"
        ),
    stdSymbols: Symbols.makeStd(),
    types: {
        implicitCast: Cast.implicit
    }
};
