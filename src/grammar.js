"use strict";

var Context = require("context.js");
var Lexer = require("js/Lexer.js");
var Parser = require("parser.js");
var Class = require("rtl.js").Class;

var literal = Parser.literal;
var digit = Lexer.digit;
var hexDigit = Lexer.hexDigit;
var point = Lexer.point;
var separator = Lexer.separator;

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
              makeProcedureHeading, 
              makeProcedureDeclaration,
              makeFieldList,
              contexts,
              reservedWords
              ){
var result = {};

var ident = function(stream, context){
    return Lexer.ident(stream, context, reservedWords);
};

var ModuleDeclContext = Context.ModuleDeclaration.extend({
    init: function Grammar$ModuleDeclContext(context){
        Context.ModuleDeclaration.prototype.init.call(this, context);
    }
});

var qualident = context(and(optional(and(ident, ".")), ident),
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

var integer = or(context(and(digit, repeat(hexDigit), "H", separator), Context.HexInteger)
               , context(and(digit, repeat(digit), separator), Context.Integer));

var scaleFactor = and(or("E", "D"), optional(or("+", "-")), digit, repeat(digit));
var real = context(and(digit, repeat(digit), point, repeat(digit), optional(scaleFactor))
                 , Context.Real);

var number = or(real, integer);

var string = or(context(Lexer.string, Context.String)
              , context(and(digit, repeat(hexDigit), "X"), Context.Char));

var factor = context(
    or(string, number, "NIL", "TRUE", "FALSE"
     , function(stream, context){return set(stream, context);} // break recursive declaration of set
     , designator.factor
     , and("(", function(stream, context){return expression(stream, context);}
         , required(")", "no matched ')'"))
     , and("~", function(stream, context){
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

var element = context(and(expression, optional(and("..", expression))), Context.SetElement);
var set = and("{", context(optional(and(element, repeat(and(",", element)))), Context.Set)
            , "}");

var expList = and(expression, repeat(and(",", expression)));
var actualParameters = and("(", context(optional(expList), Context.ActualParameters), ")");

var assignment = and(context(or(":=", "="), Context.CheckAssignment),
                     required(expression, "expression expected"));

var statement = optional(or(
                   emit(designator.assignmentOrProcedureCall(assignment, expression), Context.emitEndStatement)
                   // break recursive declaration of ifStatement/caseStatement/whileStatement/repeatStatement
                 , function(stream, context){return ifStatement(stream, context);}
                 , function(stream, context){return caseStatement(stream, context);}
                 , function(stream, context){return whileStatement(stream, context);}
                 , function(stream, context){return repeatStatement(stream, context);}
                 , function(stream, context){return forStatement(stream, context);}
                 ));
var statementSequence = and(statement, repeat(and(";", statement)));

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
                       context(and(ident, ":=", expression, "TO", expression
                                 , optional(and("BY", constExpression))
                                 , emit("DO", Context.emitForBegin)
                                 , statementSequence, required("END", "END expected (FOR)"))
                             , contexts.For));

var fieldList = makeFieldList(
        identdef,
        identList,
        type,
        function(stream, context){return formalParameters(stream, context);}
        );
var fieldListSequence = and(fieldList, repeat(and(";", fieldList)));

var arrayType = and("ARRAY", context(and(
                        context(and(constExpression, repeat(and(",", constExpression)))
                              , Context.ArrayDimensions)
                  , "OF", type), Context.ArrayDecl));

var baseType = context(qualident, Context.BaseType);
var recordType = and("RECORD", context(and(optional(and("(", baseType, ")")), optional(fieldListSequence)
                                     , "END"), contexts.recordDecl));

var pointerType = and("POINTER", "TO", context(type, Context.PointerDecl));

var formalType = context(and(repeat(and("ARRAY", "OF")), qualident), Context.FormalType);
var fpSection = and(optional(literal("VAR")), ident, repeat(and(",", ident)), ":", formalType);
var formalParameters = and(
          "("
        , optional(context(and(fpSection, repeat(and(";", fpSection))), Context.ProcParams))
        , required( ")" )
        , optional(and(":", qualident)));

var procedureType = and("PROCEDURE"
                      , context(optional(formalParameters), Context.FormalParameters)
                        );
var strucType = or(arrayType, recordType, pointerType, procedureType);
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
          optional(context(and("RETURN", expression), Context.Return)),
          required("END", "END expected (PROCEDURE)"));
result.module
    = context(and("MODULE", ident, ";",
                  context(optional(and(importList, ";")), Context.ModuleImport),
                  result.declarationSequence,
                  optional(and("BEGIN", statementSequence)),
                  required("END", "END expected (MODULE)"), ident, point),
              ModuleDeclContext);
return result;
}

exports.make = make;
exports.reservedWords = reservedWords;
