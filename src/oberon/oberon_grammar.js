"use strict";

var Cast = require("js/Cast.js");
var CodeGenerator = require("js/CodeGenerator.js");
var Context = require("context.js");
var ContextExpression = require("js/ContextExpression.js");
var Grammar = require("grammar.js");
var ObContext = require("oberon/oberon_context.js");
var ObRtl = require("js/OberonRtl.js");
var ObRtlCode = require("rtl.js");
var Operator = require("js/Operator.js");
var Parser = require("parser.js");
var Symbols = require("js/OberonSymbols.js");
var Types = require("js/Types.js");

var and = Parser.and;
var context = Parser.context;
var optional = Parser.optional;
var or = Parser.or;
var repeat = Parser.repeat;

function makeStrucType(base){
    return base;
}

function makeStatement(base){
    return base;
}

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

function makeFieldListSequence(base){
    return base;
}

function makeForInit(ident, expression, assignment){
    return and(ident, assignment);
}

function makeArrayDimensions(constExpression){
    return context(and(constExpression, repeat(and(",", constExpression))), 
                   Context.ArrayDimensions);
}

function makeFormalArray(){
    return and("ARRAY", "OF");
}

function makeFormalResult(base){
    return base;
}

function makeReturn(base){return base;}

exports.language = {
    grammar: Grammar.make(
        makeIdentdef,
        makeDesignator,
        makeStrucType,
        makeStatement,
        makeProcedureHeading,
        makeProcedureDeclaration,
        makeFieldList,
        makeFieldListSequence,
        makeForInit,
        makeArrayDimensions,
        makeFormalArray,
        makeFormalResult,
        makeReturn,
        {
            constDeclaration:   Context.ConstDecl, 
            typeDeclaration:    Context.TypeDeclaration,
            recordDecl:         ObContext.RecordDecl,
            variableDeclaration: ObContext.VariableDeclaration,
            ArrayDecl:          Context.ArrayDecl,
            Factor:             ContextExpression.Factor,
            FormalParameters:   Context.FormalParameters,
            FormalType:         Context.FormalType,
            Term:               ContextExpression.Term,
            AddOperator:        Context.AddOperator,
            MulOperator:        Context.MulOperator,
            SimpleExpression:   Context.SimpleExpression, 
            Expression:         Context.Expression,
            For:                Context.For,
            While:              Context.While,
            If:                 Context.If,
            CaseLabel:          Context.CaseLabel,
            Repeat:             Context.Repeat,
            Return:             Context.Return,
            ModuleDeclaration:  Context.ModuleDeclaration
        },
        Grammar.reservedWords
        ),
    stdSymbols: Symbols.makeStd(),
    types: {
        implicitCast: function(from, to, toVar, op){
            return Cast.implicit(from, to, toVar, Operator.castOperations(), op);
        },
        typeInfo: function(type){return Types.generateTypeInfo(type);},
        StaticArray: Types.StaticArray,
        OpenArray: Types.OpenArray
    },
    codeGenerator: {
        make: CodeGenerator.makeGenerator,
        nil: CodeGenerator.nullGenerator()
    },
    rtl: {
        base: ObRtl.Type,
        methods: ObRtlCode.rtl.methods,
        dependencies: ObRtlCode.rtl.dependencies,
        nodejsModule: ObRtlCode.rtl.nodejsModule
    }
};


