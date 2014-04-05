"use strict";

var Cast = require("js/Cast.js");
var Context = require("context.js");
var Grammar = require("grammar.js");
var ObContext = require("oberon/oberon_context.js");
var Parser = require("parser.js");
var Symbols = require("js/OberonSymbols.js");

var and = Parser.and;
var context = Parser.context;
var optional = Parser.optional;
var or = Parser.or;
var repeat = Parser.repeat;

function makeProcedureHeading(ident, identdef, formalParameters){
    return and("PROCEDURE"
             , identdef
             , context(optional(formalParameters), Context.FormalParametersProcDecl));
}

function makeAssignmentOrProcedureCall(designator, actualParameters, assignment){
    return or(context(and(designator, assignment), 
                      ObContext.Assignment),
              context(and(designator, optional(actualParameters)), 
                      ObContext.StatementProcedureCall)
              );
}

function makeIdentdef(ident){
    return context(and(ident, optional("*")), Context.Identdef);
}

function makeDesignator(ident, qualident, selector, actualParameters){
    var designator = context(and(qualident, repeat(selector)), Context.Designator);
    return { 
        factor: context(and(designator, optional(actualParameters)), ObContext.ExpressionProcedureCall),
        assignmentOrProcedureCall: function(assignment){
            return makeAssignmentOrProcedureCall(designator, actualParameters, assignment);
        }
    };
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

exports.language = {
    grammar: Grammar.make(
        makeIdentdef,
        makeDesignator,
        makeProcedureHeading,
        makeProcedureDeclaration,
        makeFieldList,
        {
            constDeclaration:   Context.ConstDecl, 
            typeDeclaration:    Context.TypeDeclaration,
            recordDecl:         ObContext.RecordDecl,
            variableDeclaration: ObContext.VariableDeclaration,
            addOperator:        Context.AddOperator,
            expression:         Context.Expression
        },
        Grammar.reservedWords
        ),
    stdSymbols: Symbols.makeStd(),
    types: {
        implicitCast: Cast.implicit
    }
};


