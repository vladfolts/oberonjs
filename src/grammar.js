var Context = require("context.js");
var Lexer = require("lexer.js");
var Parser = require("parser.js");
var Class = require("rtl.js").Class;

var character = Lexer.character;
var literal = Lexer.literal;
var digit = Lexer.digit;
var hexDigit = Lexer.hexDigit;
var ident = Lexer.ident;
var point = Lexer.point;
var separator = Lexer.separator;

var and = Parser.and;
var or = Parser.or;
var optional = Parser.optional;
var repeat = Parser.repeat;

var context = Parser.context;
var emit = Parser.emit;
var required = Parser.required;

var selector = or(and(point, ident)
				// break recursive declaration of expList
			    , and("[", function(stream, context){return expList(stream, context);}, "]")
				, "^"
				, context(and("(", ident, ")"), Context.TypeCast)
			    );
var designator = context(and(ident, repeat(selector)), Context.Designator);
var type = or(function(stream, context){return strucType(stream, context);} // break recursive declaration of strucType
			, context(ident, Context.Type));
var identList = and(ident, repeat(and(",", ident)));
var variableDeclaration = context(and(identList, ":", type), Context.VariableDeclaration);

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
	 , context(and(designator
				 // break recursive declaration of actualParameters
				 , optional(function(stream, context){return actualParameters(stream, context);})
				  )
			 , Context.ExpressionProcedureCall)
	 , and("~", function(stream, context){
					return factor(stream, context);}) // break recursive declaration of factor
	 )
	, Context.Factor);
var addOperator = context(or("+", "-", "OR"), Context.AddOperator);
var mulOperator = context(or("*", "/", "DIV", "MOD", "&"), Context.MulOperator);
var term = context(and(factor, repeat(and(mulOperator, factor))), Context.Term);
var simpleExpression = context(
		and(optional(or("+", "-"))
		  , term
		  , repeat(and(addOperator, term)))
	  , Context.SimpleExpression);
var relation = or("=", "#", "<=", "<", ">=", ">", "IN", "IS");
var expression = context(and(simpleExpression, optional(and(relation, simpleExpression)))
					   , Context.Expression);
var constExpression = expression;

var element = context(and(expression, optional(and("..", expression))), Context.SetElement);
var set = and("{", context(optional(and(element, repeat(and(",", element)))), Context.Set)
			, "}");

var expList = and(expression, repeat(and(",", expression)));
var actualParameters = and("(", context(optional(expList), Context.ActualParameters), ")");
var procedureCall = context(and(designator, optional(actualParameters))
						  , Context.ProcedureCall);

var assignment = context(and(designator, ":=", required(expression, "expression expected"))
					   , Context.Assignment);

var statement = or(emit(assignment, Context.emitEndStatement)
				 , emit(procedureCall, Context.emitEndStatement)
				   // break recursive declaration of ifStatement/caseStatement/whileStatement/repeatStatement
				 , function(stream, context){return ifStatement(stream, context);}
				 , function(stream, context){return caseStatement(stream, context);}
				 , function(stream, context){return whileStatement(stream, context);}
				 , function(stream, context){return repeatStatement(stream, context);}
				 , function(stream, context){return forStatement(stream, context);}
				 );
var statementSequence = and(statement, repeat(and(";", statement)));

var ifStatement = and("IF", context(expression, Context.If), "THEN", statementSequence
					, repeat(and("ELSIF", context(expression, Context.ElseIf), "THEN", statementSequence))
					, optional(and("ELSE", context(statementSequence, Context.Else)))
					, emit("END", Context.emitIfEnd));

var label = or(integer, string, ident);
var labelRange = context(and(label, optional(and("..", label))), Context.CaseRange);
var caseLabelList = context(and(labelRange, repeat(and(",", labelRange))), Context.CaseLabelList);
var caseParser = optional(context(and(caseLabelList, ":", statementSequence), Context.CaseLabel));
var caseStatement = and("CASE", context(and(expression
					  , "OF", caseParser, repeat(and("|", caseParser)), "END")
					  , Context.Case));

var whileStatement = and("WHILE", context(expression, Context.While), "DO", statementSequence
					   , repeat(and("ELSIF", context(expression, Context.ElseIf), "DO", statementSequence))
					   , emit("END", Context.emitWhileEnd)
					   );
var repeatStatement = and("REPEAT", context(statementSequence, Context.Repeat)
						, "UNTIL", context(expression, Context.Until));

var forStatement = context(and("FOR", ident, ":=", expression, "TO", expression
							 , optional(and("BY", constExpression))
							 , emit("DO", Context.emitForBegin), statementSequence, "END")
						 , Context.For);

var fieldList = context(and(identList, ":", type), Context.FieldListDeclaration);
var fieldListSequence = and(fieldList, repeat(and(";", fieldList)));

var arrayType = and("ARRAY", context(and(
						context(and(constExpression, repeat(and(",", constExpression)))
							  , Context.ArrayDimensions)
				  , "OF", type), Context.ArrayDecl));

var baseType = context(ident, Context.BaseType);
var recordType = and("RECORD", context(and(optional(and("(", baseType, ")")), optional(fieldListSequence)
									 , "END"), Context.RecordDecl));

var pointerType = and("POINTER", "TO", context(type, Context.PointerDecl));

var formalType = context(and(repeat(and("ARRAY", "OF")), ident), Context.FormalType);
var fpSection = and(optional(literal("VAR")), ident, repeat(and(",", ident)), ":", formalType);
var formalParameters = and(
		  "("
		, optional(context(and(fpSection, repeat(and(";", fpSection))), Context.ProcParams))
		, ")"
		, optional(and(":", ident)));

var procedureType = and("PROCEDURE"
					  , context(optional(formalParameters), Context.FormalParameters)
					    );
var strucType = or(arrayType, recordType, pointerType, procedureType);
var typeDeclaration = context(and(ident, "=", strucType), Context.TypeDeclaration);

var procedureHeading = and("PROCEDURE"
						 , ident
						 , context(optional(formalParameters), Context.FormalParametersProcDecl));
var procedureDeclaration = context(
	  and(procedureHeading, ";"
	      // break recursive declaration of procedureBody
	    , function(stream, context){return procedureBody(stream, context);}
	    , ident)
	, Context.ProcDecl);

var constantDeclaration = context(and(ident, "=", constExpression), Context.ConstDecl);

var declarationSequence = and(optional(and("CONST", repeat(and(constantDeclaration, ";"))))
							, optional(and("TYPE", repeat(and(typeDeclaration, ";"))))
							, optional(and("VAR", repeat(and(variableDeclaration, ";"))))
							, repeat(and(procedureDeclaration, ";")));
var procedureBody = and(declarationSequence
					  , optional(and("BEGIN", statementSequence))
					  , optional(context(and("RETURN", expression), Context.Return))
					  , "END");

var imprt = and(ident, optional(and(":=", ident)));
var importList = context(and("IMPORT", imprt, repeat(and(",", imprt))),
						 Context.ModuleImport);
var module = context(and("MODULE", ident, ";",
						 optional(and(importList, ";")),
						 declarationSequence,
						 optional(and("BEGIN", statementSequence)),
						 "END", ident, point),
					 Context.ModuleDeclaration);

exports.declarationSequence = declarationSequence;
exports.expression = expression;
exports.ident = ident;
exports.module = module;
exports.procedureBody = procedureBody;
exports.procedureDeclaration = procedureDeclaration;
exports.procedureHeading = procedureHeading;
exports.statement = statement;
exports.typeDeclaration = typeDeclaration;
exports.variableDeclaration = variableDeclaration;