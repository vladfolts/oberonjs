"use strict";

var ContextAssignment = require("js/ContextAssignment.js");
var ContextCase = require("js/ContextCase.js");
var ContextDesignator = require("js/ContextDesignator.js");
var ContextExpression = require("js/ContextExpression.js");
var ContextIdentdef = require("js/ContextIdentdef.js");
var ContextLoop = require("js/ContextLoop.js");
var ContextModule = require("js/ContextModule.js");
var ContextProcedure = require("js/ContextProcedure.js");
var ContextType = require("js/ContextType.js");
var Lexer = require("js/Lexer.js");
var Parser = require("parser.js");

var literal = Parser.literal;
var point = Lexer.point;

var and = Parser.and;
var or = Parser.or;
var optional = Parser.optional;
var repeat = Parser.repeat;

var context = Parser.context;
var emit = Parser.emit;
var required = Parser.required;

var reservedWords = "ARRAY IMPORT THEN BEGIN IN TO BY IS TRUE CASE MOD TYPE CONST MODULE UNTIL DIV NIL VAR DO OF WHILE ELSE OR ELSIF POINTER END PROCEDURE FALSE RECORD FOR REPEAT IF RETURN";

function make(makeIdentdef,
              makeDesignator,
              makeExpression,
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
              contexts,
              reservedWords
              ){
var result = {};

var ident = function(stream, context){
    return Lexer.ident(stream, context, reservedWords);
};

var qualident = context(and(optional(context(and(ident, "."), ContextIdentdef.QualifiedModule)), ident),
                        ContextIdentdef.Qualified);
var identdef = makeIdentdef(ident);

var selector = or(and(point, ident)
                // break recursive declaration of expList
                , and("[", function(stream, context){return expList(stream, context);}, "]")
                , "^"
                , context(and("(", qualident, ")"), ContextDesignator.TypeCast)
                );
var designator = makeDesignator(
        ident,
        qualident, 
        selector,
        // break recursive declaration of actualParameters
        function(stream, context){return actualParameters(stream, context);}
        );
var type = or(qualident,
              function(stream, context){return strucType(stream, context);} // break recursive declaration of strucType
             );
var identList = and(identdef, repeat(and(",", identdef)));
var variableDeclaration = context(and(identList, ":", type), contexts.variableDeclaration);

var integer = context(Lexer.integer, ContextExpression.Integer);
var real = context(Lexer.real, ContextExpression.Real);
var number = or(real, integer);
var string = context(Lexer.string, ContextExpression.Str);

var factor = context(
    or(string, 
       number, 
       "NIL", 
       "TRUE", 
       "FALSE",
       function(stream, context){return set(stream, context);}, // break recursive declaration of set
       designator.factor,
       and("(", function(stream, context){return expression(stream, context);}
         , required(")", "no matched ')'")),
       and("~", function(stream, context){
                    return factor(stream, context);}) // break recursive declaration of factor
     )
    , contexts.Factor);

var addOperator = context(or("+", "-", "OR"), contexts.AddOperator);
var mulOperator = context(or("*", "/", "DIV", "MOD", "&"), contexts.MulOperator);
var term = context(and(factor, repeat(and(mulOperator, factor))), contexts.Term);
var simpleExpression = context(
        and(optional(or("+", "-"))
          , term
          , repeat(and(addOperator, term)))
      , contexts.SimpleExpression);
var relation = or("=", "#", "<=", "<", ">=", ">", "IN", "IS");
var expression = makeExpression(and(simpleExpression, optional(and(relation, required(simpleExpression, "invalid operand")))));
var constExpression = expression;

var element = context(and(expression, optional(and("..", expression))), ContextExpression.SetElement);
var set = and("{", context(optional(and(element, repeat(and(",", element)))), ContextExpression.Set)
            , "}");

var expList = and(expression, repeat(and(",", expression)));
var actualParameters = and("(", context(optional(expList), ContextDesignator.ActualParameters), ")");

var assignment = and(context(or(":=", "="), ContextAssignment.Check),
                     required(expression, "expression expected"));

// break recursive declaration of statement
var forwardStatement = function(stream, context){return statement(stream, context);};
var statementSequence = and(forwardStatement, repeat(and(";", forwardStatement)));

var ifStatement = and("IF", context(and(expression, required("THEN", "THEN expected"), statementSequence,
                                        repeat(and("ELSIF", expression, required("THEN", "THEN expected"), statementSequence)),
                                        optional(and("ELSE", statementSequence)),
                                        "END"), 
                                    contexts.If));

var label = or(integer, string, qualident);
var labelRange = context(and(label, optional(and("..", label))), ContextCase.Range);
var caseLabelList = context(and(labelRange, repeat(and(",", labelRange))), ContextCase.LabelList);
var caseParser = optional(context(and(caseLabelList, ":", statementSequence), contexts.CaseLabel));
var caseStatement = and("CASE", context(and(expression
                      , "OF", caseParser, repeat(and("|", caseParser)), "END")
                      , ContextCase.Type));

var whileStatement = and("WHILE", 
                         context(and(expression, "DO", statementSequence, 
                                     repeat(and("ELSIF", expression, "DO", statementSequence)),
                                     "END"),
                                 contexts.While));
var repeatStatement = and("REPEAT", 
                          context(and(statementSequence, 
                                      "UNTIL", 
                                      context(expression, ContextLoop.Until)), 
                                  contexts.Repeat));

var forStatement = and("FOR", 
                       context(and(makeForInit(ident, expression, assignment), "TO", expression
                                 , optional(and("BY", constExpression))
                                 , emit("DO", ContextLoop.emitForBegin)
                                 , statementSequence, required("END", "END expected (FOR)"))
                             , contexts.For));

var statement = optional(
    makeStatement(or( emit(designator.assignmentOrProcedureCall(assignment, expression), ContextAssignment.emitEnd),
                      ifStatement,
                      caseStatement,
                      whileStatement,
                      repeatStatement,
                      forStatement), 
                  statementSequence,
                  ident,
                  expression));

var fieldList = makeFieldList(
        identdef,
        identList,
        type,
        function(stream, context){return formalParameters(stream, context);}
        );
var fieldListSequence = makeFieldListSequence(and(fieldList, repeat(and(";", fieldList))));

var arrayType = and("ARRAY", 
                    context(and(makeArrayDimensions(constExpression), "OF", type), 
                            contexts.ArrayDecl));

var baseType = context(qualident, ContextType.RecordBase);
var recordType = and("RECORD", context(and(optional(and("(", baseType, ")")), optional(fieldListSequence)
                                     , "END"), contexts.recordDecl));

var pointerType = and("POINTER", "TO", context(type, ContextType.Pointer));

var formalType = context(and(repeat(makeFormalArray()), qualident), contexts.FormalType);
var fpSection = and(optional("VAR"), ident, repeat(and(",", ident)), ":", formalType);
var formalParameters = and(
          "("
        , optional(context(and(fpSection, repeat(and(";", fpSection))), ContextProcedure.DefinedParameters))
        , required( ")" )
        , optional(makeFormalResult(and(":", qualident), ident, actualParameters)));

var procedureType = and("PROCEDURE"
                      , context(optional(formalParameters), contexts.FormalParameters)
                        );
var strucType = makeStrucType(or(arrayType, recordType, pointerType, procedureType), type);
var typeDeclaration = context(and(identdef, "=", strucType), contexts.typeDeclaration);

var constantDeclaration = context(and(identdef, "=", constExpression), contexts.constDeclaration);

var imprt = and(ident, optional(and(":=", ident)));
var importList = and("IMPORT", imprt, repeat(and(",", imprt)));

result.expression = expression;
result.statement = statement;
result.typeDeclaration = typeDeclaration;
result.variableDeclaration = variableDeclaration;
var procedureHeading = makeProcedureHeading(ident, identdef, formalParameters);
result.ident = ident;
result.procedureDeclaration
    // break recursive declaration of procedureBody
    = makeProcedureDeclaration(
        ident,
        procedureHeading,
        function(stream, context){
            return result.procedureBody(stream, context);}
    );
result.declarationSequence
    = and(optional(and("CONST", repeat(and(constantDeclaration, required(";"))))),
          optional(and("TYPE", context(repeat(and(typeDeclaration, required(";"))), ContextType.Section))),
          optional(and("VAR", repeat(and(variableDeclaration, required(";"))))),
          repeat(and(result.procedureDeclaration, ";")));
result.procedureBody
    = and(result.declarationSequence,
          optional(and("BEGIN", statementSequence)),
          optional(context(makeReturn(and("RETURN", expression)), ContextProcedure.Return)),
          required("END", "END expected (PROCEDURE)"));
result.module
    = context(and("MODULE", ident, ";",
                  context(optional(and(importList, ";")), ContextModule.Import),
                  result.declarationSequence,
                  optional(and("BEGIN", statementSequence)),
                  required("END", "END expected (MODULE)"), ident, point),
              contexts.ModuleDeclaration);
return result;
}

exports.make = make;
exports.reservedWords = reservedWords;
