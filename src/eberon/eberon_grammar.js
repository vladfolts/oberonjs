"use strict";

var Cast = require("js/EberonCast.js");
var EbArray = require("js/EberonArray.js");
var CodeGenerator = require("js/CodeGenerator.js");
var ContextType = require("js/ContextType.js");
var EberonContext = require("js/EberonContext.js");
var EberonContextCase = require("js/EberonContextCase.js");
var EberonContextDesignator = require("js/EberonContextDesignator.js");
var EberonContextExpression = require("js/EberonContextExpression.js");
var EberonContextIdentdef = require("js/EberonContextIdentdef.js");
var EberonContextIf = require("js/EberonContextIf.js");
var EberonContextInPlace = require("js/EberonContextInPlace.js");
var EberonContextLoop = require("js/EberonContextLoop.js");
var EberonContextProcedure = require("js/EberonContextProcedure.js");
var EberonContextType = require("js/EberonContextType.js");
var EberonContextVar = require("js/EberonContextVar.js");
var Grammar = require("grammar.js");
var EbRtl = require("js/EberonRtl.js");
var EbRtlCode = require("eberon/eberon_rtl.js");
var EbOperator = require("js/EberonOperator.js");
var Parser = require("parser.js");
var Symbols = require("js/EberonSymbols.js");

var and = Parser.and;
var context = Parser.context;
var optional = Parser.optional;
var or = Parser.or;
var repeat = Parser.repeat;
var required = Parser.required;

function makeStrucType(base, type){
    var mapType = context(and("MAP", "OF", type), EberonContextType.Map);
    return or(base, mapType);
}

function makeStatement(base, statementSequence, ident, expression){
    return or(context(and("FOR", ident, ",", ident, "IN", expression, "DO", 
                          statementSequence, required("END", "END expected (FOR)")), 
                      EberonContextLoop.ForEach),
              base
              );
}

function makeProcedureHeading(ident, identdef, formalParameters){
    return and("PROCEDURE",
               context(and(optional(and(ident, ".")), identdef), EberonContextProcedure.ProcOrMethodId),
               context(optional(formalParameters), EberonContextProcedure.FormalParametersProcDecl)
               );
}

function makeInPlaceInit(ident, expression, inPlaceContext){
    return context(and(ident, "<-", required(expression, "initialization expression expected")), inPlaceContext);
}

function makeAssignmentOrProcedureCall(ident, designator, assignment, expression){
    return or(
        makeInPlaceInit(ident, expression, EberonContextInPlace.VariableInit),
        context(and(designator, optional(assignment)), EberonContextDesignator.AssignmentOrProcedureCall)
        );
}

function makeIdentdef(ident){
    return context(and(ident, optional(or("*", "-"))), EberonContextIdentdef.Type);
}

function makeDesignator(ident, qualident, selector, actualParameters){
    var self = and("SELF", optional(and("(", "POINTER", ")")));
    var operatorNew = and("NEW", context(and(qualident, actualParameters), EberonContextDesignator.OperatorNew));
    var designator = context(
        and(or(self, "SUPER", operatorNew, qualident), 
            repeat(or(selector, actualParameters))), EberonContextDesignator.Type);
    return { 
        factor: context(designator, EberonContextDesignator.ExpressionProcedureCall),
        assignmentOrProcedureCall: function(assignment, expression){
            return makeAssignmentOrProcedureCall(ident, designator, assignment, expression);
        }
    };
}

function makeProcedureDeclaration(ident, procedureHeading, procedureBody){
    return context(and(procedureHeading, ";",
                       procedureBody,
                       optional(and(ident, optional(and(".", ident))))),
                   EberonContextProcedure.ProcOrMethodDeclaration);
}

function makeMethodHeading(identdef, formalParameters){
    return context(
        and("PROCEDURE",
            identdef,
            context(optional(formalParameters), EberonContextProcedure.FormalParametersProcDecl)),
        EberonContextType.MethodHeading);
}

function makeFieldList(identdef, identList, type, formalParameters){
    return context(
        or(makeMethodHeading(identdef, formalParameters),
               and(identList, ":", type)),
        ContextType.FieldList);
}

function makeFieldListSequence(base){
    return and(base, optional(";"));
}

function makeForInit(ident, expression, assignment){
    return or(makeInPlaceInit(ident, expression, EberonContextInPlace.VariableInitFor), 
              and(ident, assignment));
}

function makeArrayDimensions(constExpression){
    var oneDimension = or("*", constExpression);
    return context(and(oneDimension, repeat(and(",", oneDimension))), 
                   EberonContextType.ArrayDimensions);
}

function makeFormalArray(){
    return and("ARRAY", optional("*"), "OF");
}

function makeFormalResult(base, ident, actualParameters){
    var initField = and(ident, actualParameters);
    var followingFields = repeat(and(",", initField));
    return or(base, 
              context(and("|", or(and("SUPER", actualParameters, followingFields),
                                  and(initField, followingFields))), 
                      EberonContextProcedure.BaseInit));
}

function makeReturn(base){
    return and(base, optional(";"));
}

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
            constDeclaration:   EberonContext.ConstDeclaration, 
            typeDeclaration:    EberonContextType.Declaration,
            recordDecl:         EberonContextType.Record,
            variableDeclaration: EberonContextVar.Declaration,
            ArrayDecl:          EberonContextType.Array,
            Factor:             EberonContextExpression.Factor,
            FormalParameters:   EberonContextProcedure.FormalParameters,
            FormalType:         EberonContextType.FormalType,
            Term:               EberonContextExpression.Term,
            AddOperator:        EberonContextExpression.AddOperator,
            MulOperator:        EberonContextExpression.MulOperator,
            SimpleExpression:   EberonContextExpression.SimpleExpression, 
            Expression:         EberonContextExpression.ExpressionNode,
            For:                EberonContextLoop.For,
            While:              EberonContextLoop.While,
            If:                 EberonContextIf.Type,
            CaseLabel:          EberonContextCase.Label,
            Repeat:             EberonContextLoop.Repeat,
            ModuleDeclaration:  EberonContextProcedure.ModuleDeclaration
        },
        Grammar.reservedWords + " SELF SUPER MAP"
        ),
    stdSymbols: Symbols.makeStd(),
    types: {
        implicitCast: function(from, to, toVar, op){
            return Cast.implicit(from, to, toVar, EbOperator.castOperations(), op);
        },
        typeInfo: function(type){return EbOperator.generateTypeInfo(type);},
        isRecursive: function(type, base){return EberonContextType.isTypeRecursive(type, base);},
        makeStaticArray: function(type, init, length){ return new EbArray.StaticArray(init, type, length); },
        makeOpenArray: function(type){return new EbArray.OpenArray(type); }
    },
    codeGenerator: {
        make: function(){ return new CodeGenerator.Generator(); },                                                                                                                                                                                          
        nil: CodeGenerator.nullGenerator()
    },                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      
    rtl: {
        base: EbRtl.Type,
        methods: EbRtlCode.rtl.methods,
        dependencies: EbRtlCode.rtl.dependencies,
        nodejsModule: EbRtlCode.rtl.nodejsModule
    }
};
