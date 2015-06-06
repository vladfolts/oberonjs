"use strict";

var Context = require("context.js");
var ContextExpression = require("js/ContextExpression.js");
var Lexer = require("js/Lexer.js");
var Parser = require("parser.js");
var Class = require("rtl.js").Class;

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

var qualident = context(and(optional(context(and(ident, "."), Context.QualifiedIdentificatorModule)), ident),
                        Context.QualifiedIdentificator);
var identdef = makeIdentdef(ident);

var selector = or(and(point, ident)
                // break recursive declaration of expList
                , and("[", function(stream, context){return expList(stream, context);}, "]")
                , "^"
                , context(and("(", qualident, ")"), Context.TypeCast)
                );
var designator = makeDesignator(
        ident,
        qualident, 
        selector,
        // break recursive declaration of actualParameters
        function(stream, context){return actualParameters(stream, context);}
        );
var type = or(context(qualident, Context.Type),
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
var expression = context(and(simpleExpression, optional(and(relation, simpleExpression)))
                       , contexts.Expression);
var constExpression = expression;

var element = context(and(expression, optional(and("..", expression))), ContextExpression.SetElement);
var set = and("{", context(optional(and(element, repeat(and(",", element)))), ContextExpression.Set)
            , "}");

var expList = and(expression, repeat(and(",", expression)));
var actualParameters = and("(", context(optional(expList), Context.ActualParameters), ")");

var assignment = and(context(or(":=", "="), Context.CheckAssignment),
                     required(expression, "expression expected"));

// break recursive declaration of statement
var forwardStatement = function(stream, context){return statement(stream, context);};
var statementSequence = and(forwardStatement, repeat(and(";", forwardStatement)));

var ifStatement = and("IF", context(and(expression, required("THEN", "THEN expected"), statementSequence,
                                        repeat(and("ELSIF", expression, required("THEN", "THEN expected"), statementSequence)),
                                        optional(and("ELSE", statementSequence)),
                                        "END"), 
                                    contexts.If));

var label = or(integer, string, ident);
var labelRange = context(and(label, optional(and("..", label))), Context.CaseRange);
var caseLabelList = context(and(labelRange, repeat(and(",", labelRange))), Context.CaseLabelList);
var caseParser = optional(context(and(caseLabelList, ":", statementSequence), contexts.CaseLabel));
var caseStatement = and("CASE", context(and(expression
                      , "OF", caseParser, repeat(and("|", caseParser)), "END")
                      , Context.Case));

var whileStatement = and("WHILE", 
                         context(and(expression, "DO", statementSequence, 
                                     repeat(and("ELSIF", expression, "DO", statementSequence)),
                                     "END"),
                                 contexts.While));
var repeatStatement = and("REPEAT", 
                          context(and(statementSequence, 
                                      "UNTIL", 
                                      context(expression, Context.Until)), 
                                  contexts.Repeat));

var forStatement = and("FOR", 
                       context(and(makeForInit(ident, expression, assignment), "TO", expression
                                 , optional(and("BY", constExpression))
                                 , emit("DO", Context.emitForBegin)
                                 , statementSequence, required("END", "END expected (FOR)"))
                             , contexts.For));

var statement = optional(
    makeStatement(or( emit(designator.assignmentOrProcedureCall(assignment, expression), Context.emitEndStatement),
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

var baseType = context(qualident, Context.BaseType);
var recordType = and("RECORD", context(and(optional(and("(", baseType, ")")), optional(fieldListSequence)
                                     , "END"), contexts.recordDecl));

var pointerType = and("POINTER", "TO", context(type, Context.PointerDecl));

var formalType = context(and(repeat(makeFormalArray()), qualident), contexts.FormalType);
var fpSection = and(optional("VAR"), ident, repeat(and(",", ident)), ":", formalType);
var formalParameters = and(
          "("
        , optional(context(and(fpSection, repeat(and(";", fpSection))), Context.ProcParams))
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
          optional(and("TYPE", context(repeat(and(typeDeclaration, required(";"))), Context.TypeSection))),
          optional(and("VAR", repeat(and(variableDeclaration, required(";"))))),
          repeat(and(result.procedureDeclaration, ";")));
result.procedureBody
    = and(result.declarationSequence,
          optional(and("BEGIN", statementSequence)),
          optional(context(makeReturn(and("RETURN", expression)), contexts.Return)),
          required("END", "END expected (PROCEDURE)"));
result.module
    = context(and("MODULE", ident, ";",
                  context(optional(and(importList, ";")), Context.ModuleImport),
                  result.declarationSequence,
                  optional(and("BEGIN", statementSequence)),
                  required("END", "END expected (MODULE)"), ident, point),
              contexts.ModuleDeclaration);
return result;
}

exports.make = make;
exports.reservedWords = reservedWords;
