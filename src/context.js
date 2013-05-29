"use strict";

var Cast = require("cast.js");
var Code = require("code.js");
var Errors = require("errors.js");
var Lexer = require("lexer.js");
var Module = require("module.js");
var op = require("operator.js");
var Parser = require("parser.js");
var Procedure = require("procedure.js");
var ImportRTL = require("rtl.js");
var Stream = require("stream.js").Stream;
var Type = require("type.js");

var RTL = ImportRTL.RTL;
var Class = ImportRTL.Class;

var basicTypes = Type.basic;
var Symbol = Type.Symbol;

function getSymbol(context, id){
    var s = context.findSymbol(id);
    if (!s)
        throw new Errors.Error("undeclared identifier: '" + id + "'");
    return s;
}

function throwTypeMismatch(from, to){
    throw new Errors.Error("type mismatch: expected '" + to.description() +
                           "', got '" + from.description() + "'");
}

function checkTypeMatch(from, to){
    if (!Cast.areTypesMatch(from, to))
        throwTypeMismatch(from, to);
}

function checkImplicitCast(from, to){
    var result = Cast.implicit(from, to);
    if (!result)
        throwTypeMismatch(from, to);
    return result;
}

function promoteTypeInExpression(e, type){
    var fromType = e.type();
    if (type == Type.basic.char && fromType instanceof Type.String){
        var v = fromType.asChar();
        if (v !== undefined)
            return new Code.Expression(v, type);
    }
    return e;
}

function promoteExpressionType(context, left, right){
    var rightType = right.type();
    if (!left)
        return right;

    var leftType = left.type();
    if (rightType === undefined)
        return right;
    
    return checkImplicitCast(rightType, leftType)(context, right);
}

function checkTypeCast(from, to, msg){
    if (from instanceof Type.Pointer)
        from = from.baseType();

    var t = to.baseType();
    while (t && t != from)
        t = t.baseType();
    if (!t)
        throw new Errors.Error(msg + ": '" + to.description()
                             + "' is not an extension of '" + from.description() + "'");
}

var ChainedContext = Class.extend({
    init: function ChainedContext(parent){this.__parent = parent;},
    parent: function(){return this.__parent;},
    codeGenerator: function(){return this.__parent.codeGenerator();},
    findSymbol: function(id){return this.__parent.findSymbol(id);},
    addSymbol: function(s){this.__parent.addSymbol(s);},
    currentScope: function(s){return this.__parent.currentScope();},
    pushScope: function(){this.__parent.pushScope();},
    popScope: function(){this.__parent.popScope();},
    setType: function(type){this.__parent.setType(type);},
    setDesignator: function(d){this.__parent.setDesignator(d);},
    handleExpression: function(e){this.__parent.handleExpression(e);},
    handleLiteral: function(s){this.__parent.handleLiteral(s);},
    handleConst: function(type, value, code){this.__parent.handleConst(type, value, code);},
    genTypeName: function(){return this.__parent.genTypeName();},
    genVarName: function(id){return this.__parent.genVarName(id);},
    rtl: function(){return this.__parent.rtl();}
});

exports.Integer = ChainedContext.extend({
    init: function IntegerContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__result = "";
        this.__isHex = false;
    },
    isLexem: function(){return true;},
    handleChar: function(c){this.__result += c;},
    handleLiteral: function(){this.__isHex = true;},
    toInt: function(s){return parseInt(this.__result);},
    endParse: function(){
        var n = this.toInt();
        this.parent().handleConst(basicTypes.int, n, n.toString());
    }
});

exports.HexInteger = exports.Integer.extend({
    init: function HexIntegerContext(context){
        exports.Integer.prototype.init.bind(this)(context);
    },
    toInt: function(s){return parseInt(this.__result, 16);}
});

exports.Real = ChainedContext.extend({
    init: function RealContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__result = "";
    },
    isLexem: function(){return true;},
    handleChar: function(c){this.__result += c;},
    handleLiteral: function(s){
        if (s == "D") // LONGREAL
            s = "E";
        this.__result += s;
    },
    endParse: function(){
        var n = Number(this.__result);
        this.parent().handleConst(basicTypes.real, n, n.toString());
    }
});

function escapeString(s){
    var result = "\"";
    for(var i = 0; i < s.length; ++i){
        var c = s[i];
        if (c == '"')
            result += "\\\"";
        else
            result += s[i];
    }
    return result + "\"";
}

exports.String = ChainedContext.extend({
    init: function StringContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__result = undefined;
    },
    handleString: function(s){this.__result = s;},
    toStr: function(s){return s;},
    endParse: function(){
        var s = this.toStr(this.__result);
        this.parent().handleConst(new Type.String(s), s, escapeString(s));
        }
});

exports.Char = exports.String.extend({
    init: function CharContext(context){
        exports.String.prototype.init.bind(this)(context);
        this.__result = "";
    },
    handleChar: function(c){this.__result += c;},
    toStr: function(s){return String.fromCharCode(parseInt(s, 16));}
});

exports.BaseType = ChainedContext.extend({
    init: function BaseTypeContext(context){
        ChainedContext.prototype.init.bind(this)(context);
    },
    setIdent: function(id){this.parent().setBaseType(id);}
});

var DesignatorInfo = Class.extend({
    init: function(code, refCode, type, info){
        this.__code = code;
        this.__refCode = refCode;
        this.__type = type;
        this.__info = info;
    },
    code: function(){return this.__code;},
    refCode: function(){return this.__refCode(this.__code);},
    type: function(){return this.__type;},
    info: function(){return this.__info;}
});

exports.Designator = ChainedContext.extend({
    init: function DesignatorContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__currentType = undefined;
        this.__info = undefined;
        this.__code = new Code.SimpleGenerator();
        this.__indexExpression = undefined;
        this.__derefCode = undefined;
        this.__propCode = undefined;
    },
    setIdent: function(id){
        var t = this.__currentType;
        if ( t === undefined){
            var s = getSymbol(this.parent(), id);
            var info = s.info();
            if (s.isType())
                this.__currentType = info;
            else if (s.isVariable() || s.isConst() || s.isProcedure()){
                this.__currentType = info.type();
            }
            else
                throw new Errors.Error("variable, constant or procedure name expected");
            this.__info = info;
        }
        else if (t instanceof Type.Pointer){
            this.__handleDeref();
            this.__denote(id);
        }
        else if (!(t instanceof Type.Record)
              && !(t instanceof Module.Type)
              && !(t instanceof Module.AnyType))
            throw new Errors.Error("cannot designate '" + t.description() + "'");
        else
            this.__denote(id);

        this.__code.write(id);
    },
    codeGenerator: function(){return this.__code;},
    handleExpression: function(e){this.__indexExpression = e;},
    __handleIndexExpression: function(){
        var e = this.__indexExpression;
        var expType = e.type();
        if (expType != basicTypes.int)
            throw new Errors.Error("'INTEGER' expression expected, got '" + expType.name() + "'");

        var type = this.__currentType;
        if (!(type instanceof Type.Array))
            throw new Errors.Error("ARRAY expected, got '" + type.name() + "'");
        var value = e.constValue();
        if (value !== undefined && value >= type.length())
            throw new Errors.Error("index out of bounds: maximum possible index is "
                                 + (type.length() - 1)
                                 + ", got " + value );
        this.__currentType = type.elementsType();
        this.__info = new Type.Variable(this.__currentType, false, this.__info.isReadOnly());
    },
    handleLiteral: function(s){
        if (s == "]" || s == ","){
            this.__handleIndexExpression();
            var indexCode = this.__indexExpression.deref().code();
            this.__propCode = indexCode;
            this.__code = new Code.SimpleGenerator(this.__derefCode + "[" + indexCode + "]");
            }
        if (s == "[" || s == ","){
            this.__derefCode = this.__code.result();
            this.__code = new Code.SimpleGenerator();
        }
        else if (s == "^")
            this.__handleDeref();
    },
    __handleDeref: function(){
        if (!(this.__currentType instanceof Type.Pointer))
            throw new Errors.Error("POINTER TO type expected, got '"
                                 + this.__currentType.description() + "'");
        this.__currentType = this.__currentType.baseType();
        this.__info = new Type.Variable(this.__currentType, false, false);
    },
    handleTypeCast: function(type){
        if (!(type instanceof Type.Record))
            throw new Errors.Error(
                "invalid type cast: RECORD type expected as an argument of type guard, got '"
              + type.description() + "'");

        checkTypeCast(this.__currentType, type, "invalid type cast");

        var code = this.rtl().typeGuard(this.__code.result(), type.name());
        this.__code = new Code.SimpleGenerator(code);

        if (this.__currentType instanceof Type.Pointer)
            type = new Type.Pointer(this.genTypeName(), type);
        this.__currentType = type;
    },
    __denote: function(id){
        var t = this.__currentType;
        var fieldType = t.findSymbol(id);
        if (!fieldType)
            throw new Errors.Error("Type '" + t.name() + "' has no '" + id + "' field");
        this.__derefCode = this.__code.result();
        this.__propCode = "\"" + id + "\"";
        this.__code.write(".");
        this.__currentType = fieldType;
    },
    endParse: function(){
        var code = this.__code.result();
        this.parent().setDesignator(
            new DesignatorInfo(code, this.__makeRefCode.bind(this), this.__currentType, this.__info));
    },
    __makeRefCode: function(code){
        if (this.__derefCode)
            return this.rtl().makeRef(this.__derefCode, this.__propCode);
        if (!(this.__currentType instanceof Type.Array)
            && !(this.__currentType instanceof Type.Record)
            && this.__info instanceof Type.Variable && !this.__info.isVar())
            return "{set: function($v){" + code + " = $v;}, get: function(){return " + code + ";}}";
        return code;
    }
});

exports.Type = ChainedContext.extend({
    init: function TypeContext(context){ChainedContext.prototype.init.bind(this)(context);},
    setIdent: function(id){
        var s = this.findSymbol(id);
        if (!s)
            throw new Errors.Error("undeclared type: '" + id + "'");
        if (s instanceof Type.Type)
            throw new Errors.Error("type name expected");
        this.setType(s.info());
    }
});

exports.FormalType = exports.Type.extend({
    init: function FormatlTypeContext(context){
        exports.Type.prototype.init.bind(this)(context);
        this.__arrayDimension = 0;
    },
    setType: function(type){
        for(var i = 0; i < this.__arrayDimension; ++i)
            type = new Type.Array("ARRAY OF " + type.name()
                               , undefined
                               , type);
        this.parent().setType(type);

    },
    handleLiteral: function(s){
        if (s == "ARRAY")
            ++this.__arrayDimension;
    }
});

var ProcArg = Class.extend({
    init: function(type, isVar){
        this.type = type;
        this.isVar = isVar;
    },
    description: function(){
        return (this.isVar ? "VAR " : "") + this.type.description();
    }
});

exports.FormalParameters = ChainedContext.extend({
    init: function FormalParametersContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__arguments = [];
        this.__result = undefined;

        var parent = this.parent();
        this.__type = new Procedure.Type(parent.typeName());
        parent.setType(this.__type);
    },
    addArgument: function(name, arg){
        this.__arguments.push(arg);
    },
    setIdent: function(id){
        var parent = this.parent();
        var s = getSymbol(parent, id);
        if (!s.isType())
            throw new Errors.Error("type name expected");
        this.__result = s.info();
    },
    endParse: function(){
        this.__type.define(this.__arguments, this.__result);
    }
});

exports.FormalParametersProcDecl = exports.FormalParameters.extend({
    init: function FormalParametersProcDeclContext(context){
        exports.FormalParameters.prototype.init.bind(this)(context);
    },
    addArgument: function(name, arg){
        exports.FormalParameters.prototype.addArgument.bind(this)(name, arg);
        this.parent().addArgument(name, arg);
    },
    endParse: function(){
        exports.FormalParameters.prototype.endParse.bind(this)();
        this.parent().endParameters();
    }
});

exports.ProcDecl = ChainedContext.extend({
    init: function ProcDeclContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__name = undefined;
        this.__firstArgument = true;
        this.__type = undefined;
        this.__returnParsed = false;
        this.__outerScope = this.parent().currentScope();
    },
    setIdent: function(id){
        var gen = this.codeGenerator();
        if (this.__name === undefined){ // first call
            this.__name = id;
            gen.write("\nfunction " + id + "(");
            this.parent().pushScope();
        }
        else if (this.__name === id){
            gen.closeScope();
            this.parent().popScope();
        }
        else
            throw new Errors.Error("mismatched procedure names: '" + this.__name
                                 + "' at the begining and '" + id + "' at the end");
    },
    typeName: function(){return undefined;},
    setType: function(type){
        var procSymbol = new Symbol(this.__name, new Type.Procedure(type));
        this.__outerScope.addSymbol(procSymbol);
        this.__type = type;
    },
    addArgument: function(name, arg){
        if (name == this.__name)
            throw new Errors.Error("argument '" + name + "' has the same name as procedure");
        var readOnly = !arg.isVar && (arg.type instanceof Type.Array);
        var s = new Symbol(name, new Type.Variable(arg.type, arg.isVar, readOnly));
        this.parent().addSymbol(s);

        var code = this.codeGenerator();
        if (!this.__firstArgument)
            code.write(", ");
        else
            this.__firstArgument = false;
        code.write(name + "/*" + arg.description() + "*/");
    },
    endParameters: function(){
        var code = this.codeGenerator();
        code.write(")");
        code.openScope();
    },
    handleReturn: function(type){
        var result = this.__type.result();
        if (!result)
            throw new Errors.Error("unexpected RETURN in PROCEDURE declared with no result type");
        if (!Cast.implicit(type, result))
            throw new Errors.Error(
                "RETURN '" + result.description() + "' expected, got '"
                + type.description() + "'");
        this.__returnParsed = true;
    },
    endParse: function(){
        var result = this.__type.result();
        if (result && !this.__returnParsed)
            throw new Errors.Error("RETURN expected at the end of PROCEDURE declared with '"
                                 + result.name() + "' result type");
    }
});

exports.Return = ChainedContext.extend({
    init: function ReturnContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__type = undefined;
        this.__code = new Code.SimpleGenerator();
    },
    codeGenerator: function(){return this.__code;},
    handleExpression: function(e){
        this.__type = e.type();
        var designator = e.designator();
        if (designator)
            writeDerefDesignatorCode(designator, this.__code);
    },
    endParse: function(){
        var parent = this.parent();
        parent.codeGenerator().write("return " + this.__code.result() + ";\n");
        parent.handleReturn(this.__type);
    }
});

exports.ProcParams = ChainedContext.extend({
    init: function ProcParamsContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__isVar = false;
        this.__argNamesForType = [];
    },
    handleLiteral: function(s){
        if (s == "VAR")
            this.__isVar = true;
    },
    setIdent: function(id){ this.__argNamesForType.push(id);},
    setType: function(type){
        var names = this.__argNamesForType;
        for(var i = 0; i < names.length; ++i){
            var name = names[i];
            this.parent().addArgument(name, new Procedure.Arg(type, this.__isVar));
        }
        this.__isVar = false;
        this.__argNamesForType = [];
    }
});

exports.PointerDecl = ChainedContext.extend({
    init: function PointerDeclContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__base = undefined;
        this.__name = this.parent().genTypeName();
    },
    setType: function(type){
        if (!(type instanceof Type.ForwardRecord) && !(type instanceof Type.Record))
            throw new Errors.Error(
                "RECORD is expected as a POINTER base type, got '" + type.description() + "'");
        this.__base = type;
    },
    findSymbol: function(id){
        var existing = this.parent().findSymbol(id);
        if (existing)
            return existing;

        var resolve = function(){return getSymbol(this.__parent, id).info();};
        return new Symbol(id, new Type.ForwardRecord(resolve.bind(this)));
    },
    genTypeName: function(){
        return this.__name + "$base";
    },
    endParse: function(){
        var type = new Type.Pointer(this.__name, this.__base);
        this.parent().setType(type);
    }
});

exports.ArrayDecl = ChainedContext.extend({
    init: function ArrayDeclContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__dimensions = undefined;
    },
    handleDimensions: function(dimensions){this.__dimensions = dimensions;},
    setType: function(type){
        var initializer = type instanceof Type.Array || type instanceof Type.Record
            ? "function(){return " + type.initializer() + ";}"
            : type.initializer();
        var dimensions = "";
        for(var i = 0; i < this.__dimensions.length; ++i){
            var length = this.__dimensions[i];
            dimensions += (dimensions.length ? ", " : "") + length;
            var arrayInit = i == this.__dimensions.length - 1
                ? this.rtl().makeArray(dimensions + ", " + initializer)
                : undefined;
            type = new Type.Array("ARRAY OF " + type.name()
                               , arrayInit
                               , type
                               , length);
        }

        this.__type = type;
    },
    endParse: function(){this.parent().setType(this.__type);}
});

exports.ArrayDimensions = ChainedContext.extend({
    init: function ArrayDimensionsContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__dimensions = [];
    },
    codeGenerator: function(){return Code.nullGenerator;},
    handleExpression: function(e){
        var type = e.type();
        if (type !== basicTypes.int)
            throw new Errors.Error("'INTEGER' constant expression expected, got '" + type.name() + "'");
        var value = e.constValue();
        if (value === undefined)
            throw new Errors.Error("constant expression expected as ARRAY size");
        if (value <= 0)
            throw new Errors.Error("array size must be greater than 0, got " + value);
        this.__dimensions.push(value);
    },
    endParse: function(){
        this.parent().handleDimensions(this.__dimensions);
    }
});

var numericOpTypeCheck = {
    expect: "numeric type",
    check: function(t){return Type.numeric.indexOf(t) != -1;}
};

var intOpTypeCheck = {
    expect: "INTEGER",
    check: function(t){return t == basicTypes.int;}
};

var orderOpTypeCheck = {
    expect: "numeric type or CHAR or character array",
    check: function(t){
        return [basicTypes.int, basicTypes.real, basicTypes.char].indexOf(t) != -1
            || (t instanceof Type.Array && t.elementsType() == basicTypes.char);
    }
};

var equalOpTypeCheck = {
    expect: "numeric type or SET or BOOLEAN OR CHAR or character array or POINTER or PROCEDURE",
    check: function(t){
        return [basicTypes.int, basicTypes.real, basicTypes.set, basicTypes.bool, basicTypes.char].indexOf(t) != -1
            || (t instanceof Type.Array && t.elementsType() == basicTypes.char)
            || t instanceof Type.Pointer
            || t.isProcedure()
            || t == Type.nil;
    }
};

function assertOpType(type, check, literal){
    if (!check.check(type))
        throw new Errors.Error(
            "operator '" + literal +
            "' type mismatch: " + check.expect + " expected, got '" +
            type.description() + "'");
}

function assertNumericOp(type, literal, op){
    assertOpType(type, numericOpTypeCheck, literal);
    return op;
}

function assertIntOp(type, literal, op){
    assertOpType(type, intOpTypeCheck, literal);
    return op;
}

function useTypeInRelation(leftType, rightType){
    if (leftType instanceof Type.Pointer && rightType instanceof Type.Pointer){
        var type = Cast.findPointerBaseType(leftType, rightType);
        if (!type)
            type = Cast.findPointerBaseType(rightType, leftType);
        if (type)
            return type;
    }
    checkTypeMatch(rightType, leftType);
    return leftType;
}

function relationOp(leftType, rightType, literal){
    var o;
    var check;
    var type = useTypeInRelation(leftType, rightType);
    switch (literal){
        case "=":
            o = op.equal;
            check = equalOpTypeCheck;
            break;
        case "#":
            o = op.notEqual;
            check = equalOpTypeCheck;
            break;
        case "<":
            o = op.less;
            check = orderOpTypeCheck;
            break;
        case ">":
            o = op.greater;
            check = orderOpTypeCheck;
            break;
        case "<=":
            if (type == basicTypes.set)
                o = op.setInclL;
            else {
                o = op.eqLess;
                check = orderOpTypeCheck;
            }
            break;
        case ">=":
            if (type == basicTypes.set)
                o = op.setInclR;
            else {
                o = op.eqGreater;
                check = orderOpTypeCheck;
            }
            break;
        }
    if (check)
        assertOpType(type, check, literal);
    return o;
}

exports.AddOperator = ChainedContext.extend({
    init: function AddOperatorContext(context){
        ChainedContext.prototype.init.bind(this)(context);
    },
    handleLiteral: function(s){
        var parent = this.parent();
        var type = parent.type();
        var o;
        if (s == "+")
            o = (type == basicTypes.set) ? op.setUnion
                                         : assertNumericOp(type, s, op.add);
        else if (s == "-")
            o = (type == basicTypes.set) ? op.setDiff
                                         : assertNumericOp(type, s, op.sub);
        else if (s == "OR"){
            if (type != basicTypes.bool)
                throw new Errors.Error("BOOLEAN expected as operand of 'OR', got '"
                                     + type.name() + "'");
            o = op.or;
        }
        if (o)
            parent.handleBinaryOperator(o);
    }
});

exports.MulOperator = ChainedContext.extend({
    init: function MulOperatorContext(context){
        ChainedContext.prototype.init.bind(this)(context);
    },
    handleLiteral: function(s){
        var parent = this.parent();
        var type = parent.type();
        var o;
        if (s == "*")
            o = (type == basicTypes.set) ? op.setIntersection
                                         : assertNumericOp(type, s, op.mul);
        else if (s == "/"){
            if (type == basicTypes.set)
                o = op.setSymmetricDiff;
            else if (type == basicTypes.int)
                throw new Errors.Error("operator DIV expected for integer division");
            else
                o = assertNumericOp(type, s, op.divFloat);
        }
        else if (s == "DIV")
            o = assertIntOp(type, s, op.div);
        else if (s == "MOD")
            o = assertIntOp(type, s, op.mod);
        else if (s == "&"){
            if (type != basicTypes.bool)
                throw new Errors.Error("BOOLEAN expected as operand of '&', got '"
                                     + type.description() + "'");
            o = op.and;
        }

        if (o)
            parent.handleOperator(o);
    }
});

function writeDerefDesignatorCode(designator, code){
    var info = designator.info();
    if (info instanceof Type.Variable && info.isVar())
        code.write(".get()");
}

exports.Term = ChainedContext.extend({
    init: function TermContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__operator = undefined;
        this.__expression = undefined;
    },
    type: function(){return this.__expression.type();},
    setDesignator: function(d){
        var value;
        var info = d.info();
        if (info instanceof Type.Const)
            value = info.value();
        this.handleExpression(
            new Code.Expression(d.code(), d.type(), d, value));
    },
    handleOperator: function(o){this.__operator = o;},
    handleConst: function(type, value, code){
        this.handleExpression(new Code.Expression(
            code, type, undefined, value));
    },
    handleFactor: function(e){
        var type = e.type();
        if (!type)
            throw new Errors.Error("procedure returning no result cannot be used in an expression");
        this.handleExpression(e);
    },
    endParse: function(){this.parent().handleTerm(this.__expression);},
    handleExpression: function(e){
        e = promoteExpressionType(this, this.__expression, e);
        if (this.__operator)
            e = this.__expression ? this.__operator(this.__expression, e)
                                  : this.__operator(e);
        this.__expression = e;
    }
});

exports.Factor = ChainedContext.extend({
    init: function FactorContext(context){
        ChainedContext.prototype.init.bind(this)(context);
    },
    type: function(){return this.parent().type();},
    handleLiteral: function(s){
        var parent = this.parent();
        if (s == "NIL")
            parent.handleConst(Type.nil, undefined, "null");
        else if (s == "TRUE")
            parent.handleConst(basicTypes.bool, true, "true");
        else if (s == "FALSE")
            parent.handleConst(basicTypes.bool, false, "false");
        else if (s == "~"){
            parent.setType(basicTypes.bool);
            parent.handleOperator(op.not);
        }
    },
    handleFactor: function(e){this.parent().handleFactor(e);}
});

exports.Set = ChainedContext.extend({
    init: function SetContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__value = 0;
        this.__expr = "";
    },
    handleElement: function(from, fromValue, to, toValue){
        if (fromValue !== undefined && (!to || toValue !== undefined))
            if (to)
                for(var i = fromValue; i <= toValue; ++i)
                    this.__value |= 1 << i;
            else
                this.__value |= 1 << fromValue;
        else{
            if (this.__expr.length)
                this.__expr += ", ";
            if (to)
                this.__expr += "[" + from + ", " + to + "]";
            else
                this.__expr += from;
        }
    },
    endParse: function(){
        var parent = this.parent();
        if (!this.__expr.length)
            parent.handleConst(basicTypes.set, this.__value, this.__value.toString());
        else{
            var code = this.rtl().makeSet(this.__expr);
            if (this.__value)
                code += " | " + this.__value;
            var e = new Code.Expression(code, basicTypes.set);
            parent.handleFactor(e);
        }
    }
});

exports.SetElement = ChainedContext.extend({
    init: function SetElementContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__from = undefined;
        this.__fromValue = undefined;
        this.__to = undefined;
        this.__toValue = undefined;
        this.__expr = new Code.SimpleGenerator();
    },
    codeGenerator: function(){return this.__expr;},
    handleExpression: function(e){
        var value = e.constValue();
        if (!this.__from)
            {
            this.__from = this.__expr.result();
            this.__fromValue = value;
            this.__expr = new Code.SimpleGenerator();
            }
        else{
            this.__to = this.__expr.result();
            this.__toValue = value;
        }
    },
    endParse: function(){
        this.parent().handleElement(this.__from, this.__fromValue, this.__to, this.__toValue);
    }
});

function constValueCode(value){
    if (typeof value == "string")
        return escapeString(value);
    return value.toString();
}

exports.SimpleExpression = ChainedContext.extend({
    init: function SimpleExpressionContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__unaryOperator = undefined;
        this.__binaryOperator = undefined;
        this.__type = undefined;
        this.__exp = undefined;
    },
    handleTerm: function(e){
        var type = e.type();
        this.setType(type);

        var o;
        switch(this.__unaryOperator){
            case "-":
                o = (type == basicTypes.set) ? op.setComplement
                                             : assertNumericOp(type, this.__unaryOperator, op.negate);
                break;
            case "+":
                o = assertNumericOp(type, this.__unaryOperator, op.unaryPlus);
                break;
            }
        if (o){
            this.__exp = o(e);
            this.__unaryOperator = undefined;
        }
        else
            this.__exp = this.__exp ? this.__binaryOperator(this.__exp, e) : e;
    },
    handleLiteral: function(s){this.__unaryOperator = s;},
    type: function(){return this.__type;},
    setType: function(type){
        if (type === undefined || this.__type === undefined)
            this.__type = type;
        else
            checkImplicitCast(type, this.__type);
    },
    handleBinaryOperator: function(o){this.__binaryOperator = o;},
    endParse: function(){
        this.parent().handleSimpleExpression(this.__exp);
    }
});

exports.Expression = ChainedContext.extend({
    init: function ExpressionContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__relation = undefined;
        this.__expression = undefined;
    },
    handleSimpleExpression: function(e){
        if (!this.__expression){
            this.__expression = e;
            return;
        }

        var leftExpression = this.__expression;
        var leftType = leftExpression.type();
        var leftCode = leftExpression.code();
        var rightExpression = e;
        var rightType = rightExpression.type();
        var rightCode = rightExpression.code();
        var code;

        if (this.__relation == "IN"){
            if (leftType != basicTypes.int)
                throw new Errors.Error("'INTEGER' expected as an element of SET, got '" + leftType.name() + "'");
            checkImplicitCast(rightType, basicTypes.set);

            code = "1 << " + leftCode + " & " + rightCode;
        }
        else if (this.__relation == "IS"){
            if (!(leftType instanceof Type.Pointer))
                throw new Errors.Error("POINTER to type expected before 'IS'");
            else if (!(rightType instanceof Type.Record))
                throw new Errors.Error("RECORD type expected after 'IS'");
            else
                checkTypeCast(leftType, rightType, "invalid type test");

            var designator = e.designator();
            if (!designator || !(designator.info() instanceof Type.Type))
                throw new Errors.Error("type name expected");
            code = leftCode + " instanceof " + rightCode;
        }
        else {
            leftExpression = promoteTypeInExpression(leftExpression, rightType);
            rightExpression = promoteTypeInExpression(rightExpression, leftType);
            leftCode = leftExpression.code();
            rightCode = rightExpression.code();
            //checkImplicitCast(rightExpression.type(), leftExpression.type());
        }

        var value;
        if (!code){
            var o = relationOp(leftExpression.type(), rightExpression.type(), this.__relation);
            var oResult = o(leftExpression, rightExpression, this);
            code = oResult.code();
            value = oResult.constValue();
        }

        this.__expression = new Code.Expression(code, basicTypes.bool, undefined, value);
    },
    handleLiteral: function(relation){
        this.__relation = relation;
    },
    endParse: function(){
        var parent = this.parent();
        parent.codeGenerator().write(this.__expression.code());
        parent.handleExpression(this.__expression);
    }
});

function handleIfExpression(e){
    var type = e.type();
    if (type !== basicTypes.bool)
        throw new Errors.Error("'BOOLEAN' expression expected, got '" + type.name() + "'");
}

var IfContextBase = ChainedContext.extend({
    init: function(context){
        ChainedContext.prototype.init.call(this, context);
    },
    endParse: function(){
        var gen = this.codeGenerator();
        gen.write(")");
        gen.openScope();
    },
    handleExpression: handleIfExpression
});

exports.If = IfContextBase.extend({
    init: function IfContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.codeGenerator().write("if (");
    }
});

exports.ElseIf = IfContextBase.extend({
    init: function ElseIfContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        var gen = this.codeGenerator();
        gen.closeScope();
        gen.write("else if (");
    }
});

exports.Else = ChainedContext.extend({
    init: function ElseContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        var gen = this.codeGenerator();
        gen.closeScope();
        gen.write("else ");
        gen.openScope();
    }
});

exports.emitEndStatement = function(context){
    context.codeGenerator().write(";\n");
};

exports.emitIfEnd = function(context){
    context.codeGenerator().closeScope();
};

exports.Case = ChainedContext.extend({
    init: function CaseContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__type = undefined;
        this.__firstCase = true;
        this.genVarName("$c");
        this.codeGenerator().write("$c = ");
    },
    handleExpression: function(e){
        var type = e.type();
        var gen = this.codeGenerator();
        if (type instanceof Type.String){
            var v = type.asChar();
            if (v !== undefined){
                gen.write(v);
                type = basicTypes.char;
            }
        }
        if (type != basicTypes.int && type != basicTypes.char)
            throw new Errors.Error("'INTEGER' or 'CHAR' expected as CASE expression");
        this.__type = type;
        gen.write(";\n");
    },
    beginCase: function(){
        if (this.__firstCase)
            this.__firstCase = false;
        else
            this.codeGenerator().write("else ");
    },
    handleLabelType: function(type){
        if (type !== this.__type)
            throw new Errors.Error(
                "label must be '" + this.__type.name() + "' (the same as case expression), got '"
                + type.name() + "'");
    }
});

exports.CaseLabelList = ChainedContext.extend({
    init: function CaseLabelListContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__glue = "";
    },
    handleLabelType: function(type){this.parent().handleLabelType(type);},
    handleRange: function(from, to){
        if (!this.__glue)
            this.parent().caseLabelBegin();

        var cond = to === undefined
            ? "$c === " + from
            : "($c >= " + from + " && $c <= " + to + ")";
        this.codeGenerator().write(this.__glue + cond);
        this.__glue = " || ";
    },
    endParse: function(){this.parent().caseLabelEnd();}
});

exports.CaseLabel = ChainedContext.extend({
    init: function CaseLabelContext(context){
        ChainedContext.prototype.init.bind(this)(context);
    },
    caseLabelBegin: function(){
        this.parent().beginCase();
        this.codeGenerator().write("if (");
    },
    caseLabelEnd: function(){
        var gen = this.codeGenerator();
        gen.write(")");
        gen.openScope();
    },
    handleLabelType: function(type){this.parent().handleLabelType(type);},
    handleRange: function(from, to){this.parent().handleRange(from, to);},
    endParse: function(){this.codeGenerator().closeScope();}
});

exports.CaseRange = ChainedContext.extend({
    init: function CaseRangeContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__from = undefined;
        this.__to = undefined;
    },
    codeGenerator: function(){return Code.nullGenerator;}, // suppress any output
    handleLabel: function(type, v){
        this.parent().handleLabelType(type);
        if (this.__from === undefined )
            this.__from = v;
        else
            this.__to = v;
    },
    handleConst: function(type, value){
        if (type instanceof Type.String){
            value = type.asChar();
            if (value === undefined)
                throw new Errors.Error("single-character string expected");
            type = basicTypes.char;
        }
        this.handleLabel(type, value);
    },
    setIdent: function(id){
        var s = getSymbol(this.parent(), id);
        if (!s.isConst())
            throw new Errors.Error("'" + id + "' is not a constant");
        
        var type = s.info().type();
        if (type instanceof Type.String)
            this.handleConst(type, undefined);
        else
            this.handleLabel(type, s.info().value());
    },
    endParse: function(){this.parent().handleRange(this.__from, this.__to);}
});

exports.While = ChainedContext.extend({
    init: function WhileContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        var gen = this.codeGenerator();
        gen.write("while (true)");
        gen.openScope();
        gen.write("if (");
    },
    handleExpression: handleIfExpression,
    endParse: function(){
        var gen = this.codeGenerator();
        gen.write(")");
        gen.openScope();
    }
});

exports.emitWhileEnd = function(context){
    var gen = context.codeGenerator();
    gen.closeScope(" else break;\n");
    gen.closeScope();
};

exports.Repeat = ChainedContext.extend({
    init: function RepeatContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        var gen = context.codeGenerator();
        gen.write("do ");
        gen.openScope();
    }
});

exports.Until = ChainedContext.extend({
    init: function UntilContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        var gen = context.codeGenerator();
        gen.closeScope(" while (");
    },
    handleExpression: handleIfExpression,
    endParse: function(){this.codeGenerator().write(");\n");}
});

exports.For = ChainedContext.extend({
    init: function ForContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__var = undefined;
        this.__initExprParsed = false;
        this.__toExpr = new Code.SimpleGenerator();
        this.__toParsed = false;
        this.__by_parsed = false;
        this.__by = undefined;
    },
    setIdent: function(id){
        var s = getSymbol(this.parent(), id);
        if (!s.isVariable())
            throw new Errors.Error("'" + s.id() + "' is not a variable");
        if (s.info().type() !== basicTypes.int)
            throw new Errors.Error(
                "'" + s.id() + "' is a 'BOOLEAN' variable, 'FOR' control variable must be 'INTEGER'");
        this.codeGenerator().write("for (" + id + " = ");
        this.__var = id;
    },
    handleExpression: function(e){
        var type = e.type();
        var value = e.constValue();
        if (type !== basicTypes.int)
            throw new Errors.Error(
                !this.__initExprParsed
                    ? "'INTEGER' expression expected to assign '" + this.__var
                      + "', got '" + type.name() + "'"
                    : !this.__toParsed
                    ? "'INTEGER' expression expected as 'TO' parameter, got '" + type.name() + "'"
                    : "'INTEGER' expression expected as 'BY' parameter, got '" + type.name() + "'"
                    );
        if (!this.__initExprParsed)
            this.__initExprParsed = true;
        else if (!this.__toParsed)
            this.__toParsed = true;
        else if ( value === undefined )
            throw new Errors.Error("constant expression expected as 'BY' parameter");
        else
            this.__by = value;
    },
    codeGenerator: function(){
        if (this.__initExprParsed && !this.__toParsed)
            return this.__toExpr;
        if (this.__toParsed && !this.__by_parsed)
            return Code.nullGenerator; // suppress output for BY expression
        
        return this.parent().codeGenerator();
    },
    handleBegin: function(){
        this.__by_parsed = true;

        var relation = this.__by < 0 ? " >= " : " <= ";
        var step = this.__by === undefined
                            ? "++" + this.__var
                            : this.__var + (this.__by < 0
                                    ? " -= " + -this.__by
                                    : " += " +  this.__by);
        var s = "; " + this.__var + relation + this.__toExpr.result() + "; " + step + ")";
        var gen = this.codeGenerator();
        gen.write(s);
        gen.openScope();
    },
    endParse: function(){this.codeGenerator().closeScope();}
});

exports.emitForBegin = function(context){context.handleBegin();};

exports.Assignment = ChainedContext.extend({
    init: function AssignmentContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__designator = undefined;
        this.__leftCode = undefined;
        this.__rightCode = undefined;
        this.__resultCode = undefined;
        this.__type = undefined;
        this.__code = new Code.SimpleGenerator();
    },
    codeGenerator: function(){return this.__code;},
    setDesignator: function(d){
        this.__designator = d;
    },
    handleLiteral: function(){
        var d = this.__designator;
        var d_info = d.info();
        if (!(d_info instanceof Type.Variable) || d_info.isReadOnly())
            throw new Errors.Error("cannot assign to " + d_info.idType());
        this.__leftCode = d.code();
        this.__code = new Code.SimpleGenerator();
        this.__type = d.type();
    },
    handleExpression: function(e){
        var type = e.type();
        var isArray = this.__type instanceof Type.Array;
        if (isArray
            && this.__type.elementsType() == basicTypes.char
            && type instanceof Type.String){
            if (this.__type.length() === undefined)
                throw new Errors.Error("string cannot be assigned to open " + this.__type.description());
            if (type.length() > this.__type.length())
                throw new Errors.Error(
                    this.__type.length() + "-character ARRAY is too small for "
                    + type.length() + "-character string");
            this.__resultCode = this.rtl().assignArrayFromString(this.__leftCode, this.__code.result());
            return;
        }

        var castOperation = Cast.implicit(type, this.__type);
        if (!castOperation)
            throw new Errors.Error("type mismatch: '" + this.__leftCode
                                 + "' is '" + this.__type.description()
                                 + "' and cannot be assigned to '" + type.description() + "' expression");

        if (isArray && type instanceof Type.Array)
            if (this.__type.length() === undefined)
                throw new Errors.Error("'" + this.__leftCode
                                     + "' is open '" + this.__type.description()
                                     + "' and cannot be assigned");
            else if (type.length() === undefined)
                throw new Errors.Error("'" + this.__leftCode
                                     + "' cannot be assigned to open '"
                                     + this.__type.description() + "'");
            else if (this.__type.length() != type.length())
                throw new Errors.Error("array size mismatch: '" + this.__leftCode
                                     + "' has size " + this.__type.length()
                                     + " and cannot be assigned to the array with size " + type.length());
        
        if (isArray || type instanceof Type.Record){
            this.__resultCode = this.rtl().copy(this.__code.result(), this.__leftCode);
            return;
        }

        var castCode = castOperation(this, e.deref()).code();
        this.__rightCode = castCode ? castCode : this.__code.result();
    },
    endParse: function(){
        var code = this.__resultCode;
        if (!code)
            code = this.__leftCode
                 + (this.__designator.info().isVar()
                    ? ".set(" + this.__rightCode + ")"
                    : " = " + this.__rightCode);

        this.parent().codeGenerator().write(code);
    }
});

exports.ConstDecl = ChainedContext.extend({
    init: function ConstDeclContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__id = undefined;
        this.__type = undefined;
        this.__value = undefined;
    },
    setIdent: function(id){
        this.__id = id;
        this.codeGenerator().write("var " + id + " = ");
    },
    handleExpression: function(e){
        var value = e.constValue();
        if (value === undefined)
            throw new Errors.Error("constant expression expected");
        this.__type = e.type();
        this.__value = value;
    },
    endParse: function(){
        var c = new Type.Const(this.__type, this.__value);
        this.addSymbol(new Symbol(this.__id, c));
        this.codeGenerator().write(";\n");
    }
});

exports.VariableDeclaration = ChainedContext.extend({
    init: function VariableDeclarationContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__idents = [];
        this.__type = undefined;
    },
    setIdent: function(id) {this.__idents.push(id);},
    setType: function(type) {this.__type = type;},
    typeName: function(){return undefined;},
    endParse: function(){
        var v = new Type.Variable(this.__type);
        var idents = this.__idents;
        var gen = this.codeGenerator();
        for(var i = 0; i < idents.length; ++i)
        {
            var varName = idents[i];
            this.addSymbol(new Symbol(varName, v));
            var t = v.type();
            gen.write("var " + varName + " = " + t.initializer() + ";");
        }

        gen.write("\n");
    }
});

exports.FieldListDeclaration = ChainedContext.extend({
    init: function FieldListDeclarationContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__idents = [];
        this.__type = undefined;
    },
    typeName: function(){return undefined;},
    setIdent: function(id) {this.__idents.push(id);},
    setType: function(type) {this.__type = type;},
    endParse: function(){
        var idents = this.__idents;
        for(var i = 0; i < idents.length; ++i){
            var fieldName = idents[i];
            var fieldType = this.__type;
            this.parent().addField(fieldName, fieldType);
        }
    }
});

function assertProcType(type){
    if (!(type instanceof Procedure.Type) && !(type instanceof Module.AnyType))
        throw new Errors.Error("PROCEDURE expected, got '" + type.name() + "'");
}

exports.ActualParameters = ChainedContext.extend({
    init: function ActualParametersContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.parent().hasActualParameters();
    },
});

var ProcedureCall = ChainedContext.extend({
    init: function ProcedureCallContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__type = undefined;
        this.__procCall = undefined;
        this.__code = new Code.SimpleGenerator();
    },
    setDesignator: function(d){
        var type = d.type();
        assertProcType(type);
        this.__type = type;
        this.__procCall = type.callGenerator(this, d.code());
        this.__callExpression = undefined;
    },
    codeGenerator: function(){return this.__code;},
    type: function(){return this.__type;},
    hasActualParameters: function(){},
    handleExpression: function(e){this.__procCall.handleArgument(e);},
    callExpression: function(){return this.__callExpression;},
    endParse: function(){this.__callExpression = this.__procCall.end();}
});

exports.StatementProcedureCall = ProcedureCall.extend({
    init: function StatementProcedureCallContext(context){
        ProcedureCall.prototype.init.bind(this)(context);
    },
    endParse: function(){
        ProcedureCall.prototype.endParse.call(this);
        var e = this.callExpression();
        if  (e.type())
            throw new Errors.Error("procedure returning a result cannot be used as a statement");
        this.parent().codeGenerator().write(e.code());
    }
});

exports.ExpressionProcedureCall = ProcedureCall.extend({
    init: function ExpressionProcedureCallContext(context){
        ProcedureCall.prototype.init.bind(this)(context);
        this.__designator = undefined;
        this.__hasActualParameters = false;
    },
    setDesignator: function(d){
        this.__designator = d;
    },
    hasActualParameters: function(){
        ProcedureCall.prototype.setDesignator.bind(this)(this.__designator);
        this.__hasActualParameters = true;
    },
    endParse: function(){
        if (this.__hasActualParameters){
            ProcedureCall.prototype.endParse.call(this);
            this.parent().handleFactor(this.callExpression());
        }
        else
            this.parent().setDesignator(this.__designator);
    }
});

exports.RecordDecl = ChainedContext.extend({
    init: function RecordDeclContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        var id = this.genTypeName();
        this.__type = new Type.Record(id);
        var gen = this.codeGenerator();
        gen.write("var " + id + " = ");
    },
    addField: function(name, type) {this.__type.addField(name, type);},
    setBaseType: function(id){
        var s = getSymbol(this.parent(), id);
        if (!s.isType())
            throw new Errors.Error("type name expected");
        this.__type.setBaseType(s.info());
    },
    endParse: function(){
        var type = this.__type;
        var baseType = type.baseType();
        var gen = this.codeGenerator();
        gen.write((baseType ? baseType.name() : this.rtl().baseClass()) + ".extend(");
        gen.openScope();
        gen.write("init: function " + type.name() + "()");
        gen.openScope();
        if (baseType)
            gen.write(baseType.name() + ".prototype.init.call(this);\n");
        var ownFields = type.ownFields();
        for(var f in ownFields)
            gen.write("this." + f + " = " + ownFields[f].initializer() + ";\n");

        this.parent().setType(type);
        gen.closeScope();
        gen.closeScope(");\n");
    }
});

exports.TypeDeclaration = ChainedContext.extend({
    init: function TypeDeclarationContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__id = undefined;
    },
    setIdent: function(id){this.__ident = id;},
    setType: function(type){
        this.addSymbol(new Symbol(this.__ident, type));
    },
    typeName: function(){return this.__ident;},
    genTypeName: function(){return this.__ident;},
    type: function(){return this.parent().type();}
});

exports.TypeCast = ChainedContext.extend({
    init: function TypeCastContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__type = undefined;
    },
    setIdent: function(id){
        var s = getSymbol(this.parent(), id);
        if (!s.isType())
            return; // this is not a type cast, may be procedure call
        this.__type = s.info();
    },
    endParse: function(){
        if (this.__type === undefined)
            return false;
        this.parent().handleTypeCast(this.__type);
        return true;
    }
});

exports.ModuleDeclaration = ChainedContext.extend({
    init: function ModuleDeclarationContext(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__name = undefined;
    },
    setIdent: function(id){
        var gen = this.codeGenerator();
        if (this.__name === undefined ) {
            this.__name = id;
            this.addSymbol(new Symbol(id, Type.module));
            gen.write("var " + id + " = function " + "(){\n");
        }
        else if (id === this.__name)
            gen.write("}();");
        else
            throw new Errors.Error("original module name '" + this.__name + "' expected, got '" + id + "'" );
    }
});

var ModuleImport = ChainedContext.extend({
    init: function ModuleImport(context){
        ChainedContext.prototype.init.bind(this)(context);
        this.__import = [];
    },
    setIdent: function(id){
        if (id != "JS")
            this.__import.push(id);
        else {
            this.rtl().supportJS();
            this.addSymbol(new Symbol("JS", new Module.JS()));
        }
    },
    handleLiteral: function(s){
        if (s == ":=")
            this.__import.pop();
    },
    endParse: function(){
        if (this.__import.length)
            throw new Errors.Error("module(s) not found: " + this.__import.join(", "));
    }
});
exports.ModuleImport = ModuleImport;

var Scope = Class.extend({
    init: function Scope(){
        var symbols = {};
        for(var t in basicTypes){
            var type = basicTypes[t];
            symbols[type.name()] = new Symbol(type.name(), type);
        }
        symbols["LONGREAL"] = new Symbol("LONGREAL", basicTypes.real);
        
        var predefined = Procedure.predefined;
        for(var i = 0; i < predefined.length; ++i){
            var s = predefined[i];
            symbols[s.id()] = s;
        }
            
        this.__symbols = symbols;
    },
    addSymbol: function(symbol){
        var id = symbol.id();
        if (this.findSymbol(id))
            throw new Errors.Error( "'" + id + "' already declared");
        this.__symbols[id] = symbol;
    },
    findSymbol: function(ident){return this.__symbols[ident];}
});

exports.Context = Class.extend({
    init: function Context(){
        this.__code = new Code.Generator();
        this.__designator = undefined;
        this.__type = undefined;
        this.__scopes = [new Scope()];
        this.__gen = 0;
        this.__vars = [];
        this.__rtl = new RTL();
    },
    setDesignator: function(d){this.__designator = d;},
    //designator: function(id){return this.__designator;},
    type: function(){return this.__type;},
    genTypeName: function(){
        ++this.__gen;
        return "anonymous$" + this.__gen;
    },
    genVarName: function(id){
        if (this.__vars.indexOf(id) === -1) {
            this.__code.write("var " + id + ";\n");
            this.__vars.push(id);
        }
    },
    addSymbol: function(symbol){this.currentScope().addSymbol(symbol);},
    findSymbol: function(ident){
        for(var i = this.__scopes.length; i--;){
            var s = this.__scopes[i].findSymbol(ident);
            if (s)
                return s;
        }
        return undefined;
    },
    currentScope: function(){return this.__scopes[this.__scopes.length - 1];},
    pushScope: function(){this.__scopes.push(new Scope());},
    popScope: function(){this.__scopes.pop();},
    handleExpression: function(){},
    handleLiteral: function(){},
    getResult: function(){
        return this.__rtl.generate() + this.__code.getResult();
    },
    codeGenerator: function(){return this.__code;},
    rtl: function(){
        return this.__rtl;
    }
});
