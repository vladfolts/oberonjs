"use strict";

var Cast = require("js/Cast.js");
var Code = require("js/Code.js");
var Errors = require("js/Errors.js");
var Module = require("js/Module.js");
var op = require("js/Operator.js");
var Parser = require("parser.js");
var Procedure = require("js/Procedure.js");
var Class = require("rtl.js").Class;
var Scope = require("js/Scope.js");
var Symbol = require("js/Symbols.js");
var Type = require("js/Types.js");

var basicTypes = Type.basic();
var nullCodeGenerator = Code.nullGenerator();
var nilType = Type.nil();

var castOperations = op.castOperations();

function getSymbolAndScope(context, id){
    var s = context.findSymbol(id);
    if (!s)
        throw new Errors.Error(
            context instanceof Type.Module
                ? "identifier '" + id + "' is not exported by module '" + Type.moduleName(context) + "'"
                : "undeclared identifier: '" + id + "'");
    return s;
}

function getSymbol(context, id){
    return getSymbolAndScope(context, id).symbol();
}

function unwrapTypeId(type){
    if (!(type instanceof Type.TypeId))
        throw new Errors.Error("type name expected");
    return type;
}

function unwrapType(type){
    return unwrapTypeId(type).type();
}

function getTypeSymbol(context, id){
    return unwrapType(getSymbol(context, id).info());
}

function throwTypeMismatch(from, to){
    throw new Errors.Error("type mismatch: expected '" + to.description() +
                           "', got '" + from.description() + "'");
}

function checkTypeMatch(from, to){
    if (!Cast.areTypesMatch(from, to))
        throwTypeMismatch(from, to);
}

function checkImplicitCast(types, from, to){
    if (types.implicitCast(from, to, false, castOperations, {set: function(){}}))
        throwTypeMismatch(from, to);
}

function promoteTypeInExpression(e, type){
    var fromType = e.type();
    if (type == basicTypes.ch && fromType instanceof Type.String){
        var v;
        if (Type.stringAsChar(fromType, {set: function(value){v = value;}}))
            return Code.makeExpression(v, type);
    }
    return e;
}

function promoteExpressionType(context, left, right){
    var rightType = right.type();
    if (!left)
        return;

    var leftType = left.type();
    if (!rightType)
        return;

    checkImplicitCast(context.language().types, rightType, leftType);
}

function checkTypeCast(from, to, msg){
    if (from instanceof Type.Pointer)
        from = Type.pointerBase(from);
    if (to instanceof Type.Pointer)
        to = Type.pointerBase(to);

    var t = Type.recordBase(to);
    while (t && t != from)
        t = Type.recordBase(t);
    if (!t)
        throw new Errors.Error(msg + ": '" + to.description()
                             + "' is not an extension of '" + from.description() + "'");
}

var ChainedContext = Class.extend({
    init: function ChainedContext(parent){this.__parent = parent;},
    parent: function(){return this.__parent;},
    handleMessage: function(msg){return this.__parent.handleMessage(msg);},
    language: function(){return this.__parent.language();},
    codeGenerator: function(){return this.__parent.codeGenerator();},
    findSymbol: function(id){return this.__parent.findSymbol(id);},
    currentScope: function(s){return this.__parent.currentScope();},
    pushScope: function(scope){this.__parent.pushScope(scope);},
    popScope: function(){this.__parent.popScope();},
    setType: function(type){this.__parent.setType(type);},
    setDesignator: function(d){this.__parent.setDesignator(d);},
    handleExpression: function(e){this.__parent.handleExpression(e);},
    handleLiteral: function(s){this.__parent.handleLiteral(s);},
    handleConst: function(type, value, code){this.__parent.handleConst(type, value, code);},
    genTypeName: function(){return this.__parent.genTypeName();},
    genVarName: function(id){return this.__parent.genVarName(id);},
    qualifyScope: function(scope){return this.__parent.qualifyScope(scope);}
});

exports.Integer = ChainedContext.extend({
    init: function IntegerContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__result = "";
        this.__isHex = false;
    },
    isLexem: function(){return true;},
    handleChar: function(c){this.__result += String.fromCharCode(c);},
    handleLiteral: function(){this.__isHex = true;},
    toInt: function(s){return parseInt(this.__result, 10);},
    endParse: function(){
        var n = this.toInt();
        this.parent().handleConst(basicTypes.integer, Code.makeIntConst(n), n.toString());
    }
});

exports.HexInteger = exports.Integer.extend({
    init: function HexIntegerContext(context){
        exports.Integer.prototype.init.call(this, context);
    },
    toInt: function(s){return parseInt(this.__result, 16);}
});

exports.Real = ChainedContext.extend({
    init: function RealContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__result = "";
    },
    isLexem: function(){return true;},
    handleChar: function(c){this.__result += String.fromCharCode(c);},
    handleLiteral: function(s){
        if (s == "D") // LONGREAL
            s = "E";
        this.__result += s;
    },
    endParse: function(){
        var n = Number(this.__result);
        this.parent().handleConst(basicTypes.real, Code.makeRealConst(n), n.toString());
    }
});

function escapeString(s){
    var escapeChars = {"\\": "\\\\",
                       "\"": "\\\"",
                       "\n": "\\n",
                       "\r": "\\r",
                       "\t": "\\t",
                       "\b": "\\b",
                       "\f": "\\f"
                      };
    var result = "\"";
    for(var i = 0; i < s.length; ++i){
        var c = s[i];
        var escape = escapeChars[c];
        result += escape !== undefined ? escape : c;
    }
    return result + "\"";
}

exports.String = ChainedContext.extend({
    init: function StringContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__result = undefined;
    },
    handleString: function(s){this.__result = s;},
    toStr: function(s){return s;},
    endParse: function(){
        var s = this.toStr(this.__result);
        this.parent().handleConst(Type.makeString(s), Code.makeStringConst(s), escapeString(s));
        }
});

exports.Char = exports.String.extend({
    init: function CharContext(context){
        exports.String.prototype.init.call(this, context);
        this.__result = "";
    },
    handleChar: function(c){this.__result += String.fromCharCode(c);},
    toStr: function(s){return String.fromCharCode(parseInt(s, 16));}
});

exports.BaseType = ChainedContext.extend({
    init: function BaseTypeContext(context){
        ChainedContext.prototype.init.call(this, context);
    },
    handleSymbol: function(s){
        this.parent().setBaseType(unwrapType(s.symbol().info()));
    }
});

exports.QualifiedIdentificator = ChainedContext.extend({
    init: function QualifiedIdentificator(context){
        ChainedContext.prototype.init.call(this, context);
        this.__module = undefined;
        this.__id = undefined;
        this.__code = "";
    },
    handleIdent: function(id){
        this.__id = id;
    },
    handleLiteral: function(){
        var s = getSymbol(this, this.__id);
        if (!s.isModule())
            return false; // stop parsing
        this.__module = s.info();
        this.__code = this.__id + ".";
        return undefined;
    },
    endParse: function(){
        var s = getSymbolAndScope(this.__module ? this.__module : this, this.__id);
        var code = this.__code + this.__id;
        if (this.__module && s.symbol().isVariable())
            code += "()";
        this.parent().handleSymbol(s, code);
    }
});

var IdentdefInfo = Class.extend({
    init: function Context$Identdef(id, exported){
        this.__id = id;
        this.__exported = exported;
    },
    id: function(){return this.__id;},
    exported: function(){return this.__exported;}
});

exports.Identdef = ChainedContext.extend({
    init: function IdentdefContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__id = undefined;
        this.__export = false;
    },
    handleIdent: function(id){this.__id = id;},
    handleLiteral: function(){this.__export = true;},
    endParse: function(){
        this.parent().handleIdentdef(new IdentdefInfo(this.__id, this.__export));
    }
});

function castCode(type, context){
    var baseType = type instanceof Type.Pointer ? Type.pointerBase(type) : type;
    return context.qualifyScope(Type.recordScope(baseType)) + Type.recordConstructor(baseType);
}

exports.Designator = ChainedContext.extend({
    init: function Context$Designator(context){
        ChainedContext.prototype.init.call(this, context);
        this.__currentType = undefined;
        this.__info = undefined;
        this.__scope = undefined;
        this.__code = "";
        this.__lval = undefined;
        this.__indexExpression = undefined;
        this.__derefCode = undefined;
        this.__propCode = undefined;
    },
    handleSymbol: function(found, code){
        this.__scope = found.scope();
        var s = found.symbol();
        var info = s.info();
        if (info instanceof Type.Type || s.isType())
            this.__currentType = info;
        else if (s.isConst())
            this.__currentType = Type.constType(info);
        else if (s.isVariable())
            this.__currentType = info.type();
        else if (s.isProcedure())
            this.__currentType = Type.procedureType(info);
        this.__info = info;
        this.__code += code;
    },
    handleIdent: function(id){
        var t = this.__currentType;
        var pointerType;
        var isReadOnly = this.__info instanceof Type.Variable 
                      && this.__info.isReadOnly();
        if (t instanceof Type.Pointer){
            pointerType = t;
            this.__handleDeref();
            isReadOnly = false;
        }
        else if (!(t instanceof Type.Record
                || t instanceof Type.Module
                || t instanceof Module.AnyType))
            throw new Errors.Error("cannot designate '" + t.description() + "'");

        this.__denote(id, pointerType);
        this.__info = this._makeDenoteVar(this.__currentType, isReadOnly);
        this.__scope = undefined;
    },
    _makeDenoteVar: function(type, isReadOnly){
        return Type.makeVariable(type, isReadOnly);
    },
    handleExpression: function(e){this.__indexExpression = e;},
    __handleIndexExpression: function(){
        var e = this.__indexExpression;
        var expType = e.type();
        if (!Type.isInt(expType))
            throw new Errors.Error(
                Type.intsDescription() + " expression expected, got '" + expType.description() + "'");

        var index = this._indexSequence(this.__currentType, this.__info);
        var length = index.length;
        var pValue = e.constValue();
        if (pValue){
            var value = pValue.value;
            if (value < 0)
                throw new Errors.Error("index is negative: " + value);
            if (length != Type.openArrayLength && value >= length)
                throw new Errors.Error("index out of bounds: maximum possible index is "
                                     + (length - 1)
                                     + ", got " + value );
        }
        this.__currentType = index.type;
        this.__info = index.info;
    },
    _indexSequence: function(type, info){
        var isArray = type instanceof Type.Array;
        if (!isArray && !(type instanceof Type.String))
            throw new Errors.Error("ARRAY or string expected, got '" + type.description() + "'");

        var length = isArray ? Type.arrayLength(type) : Type.stringLen(type);
        if (!isArray && !length)
            throw new Errors.Error("cannot index empty string" );
        var indexType = isArray ? Type.arrayElementsType(type) : basicTypes.ch;
        return { length: length,
                 type: indexType,
                 info: Type.makeVariable(indexType, info instanceof Type.Const || info.isReadOnly())
               };
    },
    handleLiteral: function(s){
        if (s == "]" || s == ","){
            this.__handleIndexExpression();
            var indexCode = Code.derefExpression(this.__indexExpression).code();
            this.__propCode = indexCode;
            var code = this.__derefCode + "[" + indexCode + "]";
            if (this.__currentType == basicTypes.ch){
                this.__lval = code;
                code = this.__derefCode + ".charCodeAt(" + indexCode + ")";
            }
            this.__code += code;
            }
        if (s == "[" || s == ","){
            this.__derefCode = this.__code;
            this.__code = "";
        }
        else if (s == "^"){
            this.__handleDeref();
            this.__info = Type.makeVariableRef(this.__currentType, false);
        }
    },
    __handleDeref: function(){
        if (!(this.__currentType instanceof Type.Pointer))
            throw new Errors.Error("POINTER TO type expected, got '"
                                 + this.__currentType.description() + "'");
        this.__currentType = Type.pointerBase(this.__currentType);
        if (this.__currentType instanceof Type.NonExportedRecord)
            throw new Errors.Error("POINTER TO non-exported RECORD type cannot be dereferenced");
    },
    handleTypeCast: function(type){
        if (this.__currentType instanceof Type.Record){
            if (!(this.__info instanceof Type.VariableRef))
                throw new Errors.Error(
                    "invalid type cast: a value variable cannot be used in typeguard");
            if (!(type instanceof Type.Record))
                throw new Errors.Error(
                    "invalid type cast: RECORD type expected as an argument of RECORD type guard, got '"
                  + type.description() + "'");
        }
        else if (this.__currentType instanceof Type.Pointer)
            if (!(type instanceof Type.Pointer))
                throw new Errors.Error(
                    "invalid type cast: POINTER type expected as an argument of POINTER type guard, got '"
                  + type.description() + "'");

        checkTypeCast(this.__currentType, type, "invalid type cast");

        var code = this.language().rtl.typeGuard(this.__code, castCode(type, this));
        this.__code = code;

        this.__currentType = type;
    },
    __denote: function(id, pointerType){
        var t = this.__currentType;
        var fieldType = t.findSymbol(id);
        if (!fieldType){
            var typeDesc = !Type.typeName(t) && pointerType && Type.typeName(pointerType)
                ? Type.typeName(pointerType)
                : t.description();
            throw new Errors.Error("type '" + typeDesc + "' has no '" + id + "' field");
        }
        this.__derefCode = this.__code;
        this.__propCode = "\"" + id + "\"";
        this.__code += "." + id;
        this.__currentType = fieldType;
    },
    endParse: function(){
        var code = this.__code;
        var self = this;
        var refCode = function(code){return self.__makeRefCode(code);};
        this.parent().setDesignator(
            Code.makeDesignator(code, this.__lval ? this.__lval : code, refCode, this.__currentType, this.__info, this.__scope));
    },
    __makeRefCode: function(code){
        if (   this.__currentType instanceof Type.Array
            || this.__currentType instanceof Type.Record
            || this.__info instanceof Type.VariableRef)
            return code;
        if (this.__derefCode)
            return this.language().rtl.makeRef(this.__derefCode, this.__propCode);
        return "{set: function($v){" + code + " = $v;}, get: function(){return " + code + ";}}";
    }
});

exports.Type = ChainedContext.extend({
    init: function Context$Type(context){
        ChainedContext.prototype.init.call(this, context);
    },
    handleSymbol: function(s){
        this.parent().handleSymbol(s);
    }
});

var HandleSymbolAsType = ChainedContext.extend({
    init: function Context$HandleSymbolAsType(context){
        ChainedContext.prototype.init.call(this, context);
    },
    handleSymbol: function(s){
        this.setType(unwrapType(s.symbol().info()));
    }
});

exports.FormalType = HandleSymbolAsType.extend({
    init: function FormalType(context){
        HandleSymbolAsType.prototype.init.call(this, context);
        this.__arrayDimension = 0;
    },
    setType: function(type){           
        for(var i = 0; i < this.__arrayDimension; ++i)
            type = Type.makeArray("ARRAY OF " + Type.typeName(type),
                                  undefined,
                                  type,
                                  0);
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

function AddArgumentMsg(name, arg){
    this.name = name;
    this.arg = arg;
}

exports.FormalParameters = ChainedContext.extend({
    init: function FormalParametersContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__arguments = [];
        this.__result = undefined;

        var parent = this.parent();
        var name = parent.typeName();
        if (name === undefined)
            name = "";
        this.__type = new Procedure.make(name);
        parent.setType(this.__type);
    },
    handleMessage: function(msg){
        if (msg instanceof AddArgumentMsg){
            this.__arguments.push(msg.arg);
            return undefined;
        }
        return ChainedContext.prototype.handleMessage.call(this, msg);
    },
    handleSymbol: function(s){
        var resultType = unwrapType(s.symbol().info());
        if (resultType instanceof Type.Array)
            throw new Errors.Error("the result type of a procedure cannot be an ARRAY");
        if (resultType instanceof Type.Record)
            throw new Errors.Error("the result type of a procedure cannot be a RECORD");
        this.__result = resultType;
    },
    endParse: function(){
        this.__type.define(this.__arguments, this.__result);
    }
});

function endParametersMsg(){}

exports.FormalParametersProcDecl = exports.FormalParameters.extend({
    init: function FormalParametersProcDeclContext(context){
        exports.FormalParameters.prototype.init.call(this, context);
    },
    handleMessage: function(msg){
        var result = exports.FormalParameters.prototype.handleMessage.call(this, msg);
        if (msg instanceof AddArgumentMsg)
            this.parent().handleMessage(msg);
        return result;
    },
    endParse: function(){
        exports.FormalParameters.prototype.endParse.call(this);
        this.handleMessage(endParametersMsg);
    }
});

exports.ProcDecl = ChainedContext.extend({
    init: function ProcDeclContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__id = undefined;
        this.__firstArgument = true;
        this.__type = undefined;
        this.__returnParsed = false;
        this.__outerScope = this.parent().currentScope();
        this.__stdSymbols = this.language().stdSymbols;
    },
    handleIdentdef: function(id){
        this.__id = id;
        this.codeGenerator().write(this._prolog());
        this.parent().pushScope(Scope.makeProcedure(this.__stdSymbols));
    },
    handleIdent: function(id){
        if (this.__id.id() != id)
            throw new Errors.Error("mismatched procedure names: '" + this.__id.id()
                                 + "' at the begining and '" + id + "' at the end");
        this.codeGenerator().closeScope("");
        this.parent().popScope();
    },
    _prolog: function(){return "\nfunction " + this.__id.id() + "(";},
    typeName: function(){return undefined;},
    setType: function(type){
        var procSymbol = Symbol.makeSymbol(
            this.__id.id(), 
            Type.makeProcedure(type));
        this.__outerScope.addSymbol(procSymbol, this.__id.exported());
        this.__type = type;
    },
    __addArgument: function(name, arg){
        if (name == this.__id.id())
            throw new Errors.Error("argument '" + name + "' has the same name as procedure");
        var readOnly = !arg.isVar && (arg.type instanceof Type.Array);
        var v = arg.isVar ? Type.makeVariableRef(arg.type)
                          : Type.makeVariable(arg.type, readOnly);
        var s = Symbol.makeSymbol(name, v);
        this.currentScope().addSymbol(s);

        var code = this.codeGenerator();
        if (!this.__firstArgument)
            code.write(", ");
        else
            this.__firstArgument = false;
        code.write(name + "/*" + arg.description() + "*/");
    },
    handleMessage: function(msg){
        if (msg == endParametersMsg){
            var code = this.codeGenerator();
            code.write(")");
            code.openScope();
            return undefined;
        }
        if (msg instanceof AddArgumentMsg)
            return this.__addArgument(msg.name, msg.arg);
        return ChainedContext.prototype.handleMessage.call(this, msg);
    },
    handleReturn: function(type){
        var result = this.__type.result();
        if (!result)
            throw new Errors.Error("unexpected RETURN in PROCEDURE declared with no result type");
        if (this.language().types.implicitCast(type, result, false, castOperations, {set: function(){}}))
            throw new Errors.Error(
                "RETURN '" + result.description() + "' expected, got '"
                + type.description() + "'");
        this.__returnParsed = true;
    },
    endParse: function(){
        var result = this.__type.result();
        if (result && !this.__returnParsed)
            throw new Errors.Error("RETURN expected at the end of PROCEDURE declared with '"
                                 + Type.typeName(result) + "' result type");
    }
});

exports.Return = ChainedContext.extend({
    init: function Context$Return(context){
        ChainedContext.prototype.init.call(this, context);
        this.__expr = undefined;
    },
    codeGenerator: function(){return nullCodeGenerator;},
    handleExpression: function(e){this.__expr = e;},
    endParse: function(){
        var parent = this.parent();
        parent.codeGenerator().write("return " + Code.derefExpression(this.__expr).code() + ";\n");
        parent.handleReturn(this.__expr.type());
    }
});

exports.ProcParams = HandleSymbolAsType.extend({
    init: function Context$ProcParams(context){
        HandleSymbolAsType.prototype.init.call(this, context);
        this.__isVar = false;
        this.__argNamesForType = [];
    },
    handleLiteral: function(s){
        if (s == "VAR")
            this.__isVar = true;
    },
    handleIdent: function(id){ this.__argNamesForType.push(id);},
    setType: function(type){
        var names = this.__argNamesForType;
        for(var i = 0; i < names.length; ++i){
            var name = names[i];
            this.handleMessage(
                new AddArgumentMsg(name, Type.makeProcedureArgument(type, this.__isVar)));
        }
        this.__isVar = false;
        this.__argNamesForType = [];
    }
});

exports.PointerDecl = ChainedContext.extend({
    init: function Context$PointerDecl(context){
        ChainedContext.prototype.init.call(this, context);
    },
    handleSymbol: function(s){
        var typeId = unwrapTypeId(s.symbol().info());
        this.__setTypeId(typeId);
    },
    __setTypeId: function(typeId){
        if (!(typeId instanceof Type.ForwardTypeId)){
            var type = typeId.type();
            if (!(type instanceof Type.Record))
                throw new Errors.Error(
                    "RECORD is expected as a POINTER base type, got '" + type.description() + "'");
        }

        var parent = this.parent();
        var name = parent.isAnonymousDeclaration() 
            ? ""
            : parent.genTypeName();
        var pointerType = Type.makePointer(name, typeId);
        parent.setType(pointerType);
    },
    setType: function(type){
        var typeId = Type.makeTypeId(type);
        this.currentScope().addFinalizer(function(){typeId.strip();});
        this.__setTypeId(typeId);
    },
    findSymbol: function(id){
        var parent = this.parent();
        var existing = parent.findSymbol(id);
        if (existing)
            return existing;

        var scope = this.currentScope();
        Scope.addUnresolved(scope, id);
        var resolve = function(){return getSymbol(parent, id).info().type();};

        return Symbol.makeFound(
            Symbol.makeSymbol(id, Type.makeForwardTypeId(resolve)),
            scope
            );
    },
    isAnonymousDeclaration: function(){return true;},
    exportField: function(field){
        throw new Errors.Error( "cannot export anonymous RECORD field: '" + field + "'");
    }
});

exports.ArrayDecl = HandleSymbolAsType.extend({
    init: function Context$ArrayDecl(context){
        HandleSymbolAsType.prototype.init.call(this, context);
        this.__dimensions = undefined;
    },
    handleDimensions: function(dimensions){this.__dimensions = dimensions;},
    setType: function(type){
        var initializer = type instanceof Type.Array || type instanceof Type.Record
            ? "function(){return " + type.initializer(this) + ";}"
            : type.initializer(this);
        var isCharArray = (type == basicTypes.ch);
        var dimensions = "";
        for(var i = this.__dimensions.length; i-- ;){
            var length = this.__dimensions[i];
            dimensions = length + (dimensions.length ? ", " + dimensions : "");
            var rtl = this.language().rtl;
            var arrayInit = !i
                ? isCharArray ? rtl.makeCharArray(dimensions)
                              : rtl.makeArray(dimensions + ", " + initializer)
                : undefined;
            type = Type.makeArray("ARRAY OF " + Type.typeName(type),
                                  arrayInit,
                                  type,
                                  length);
        }

        this.__type = type;
    },
    isAnonymousDeclaration: function(){return true;},
    endParse: function(){this.parent().setType(this.__type);}
});

exports.ArrayDimensions = ChainedContext.extend({
    init: function ArrayDimensionsContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__dimensions = [];
    },
    codeGenerator: function(){return nullCodeGenerator;},
    handleExpression: function(e){
        var type = e.type();
        if (type !== basicTypes.integer)
            throw new Errors.Error("'INTEGER' constant expression expected, got '" + type.description() + "'");
        var value = e.constValue();
        if (!value)
            throw new Errors.Error("constant expression expected as ARRAY size");
        if (value.value <= 0)
            throw new Errors.Error("array size must be greater than 0, got " + value.value);
        this.__dimensions.push(value.value);
    },
    endParse: function(){
        this.parent().handleDimensions(this.__dimensions);
    }
});

var numericOpTypeCheck = {
    expect: "numeric type",
    check: function(t){return Type.numeric().indexOf(t) != -1;}
};

var numericOrSetOpTypeCheck = {
    expect: numericOpTypeCheck.expect + " or SET",
    check: function(t){return numericOpTypeCheck.check(t) || t == basicTypes.set;}
};

var intOpTypeCheck = {
    expect: Type.intsDescription(),
    check: Type.isInt
};

function throwOperatorTypeMismatch(op, expect, type){
    throw new Errors.Error(
        "operator '" + op +
        "' type mismatch: " + expect + " expected, got '" +
        type.description() + "'");
}

function assertOpType(type, check, literal){
    if (!check.check(type))
        throwOperatorTypeMismatch(literal, check.expect, type);
}

function assertNumericOp(type, literal, op, intOp){
    assertOpType(type, numericOpTypeCheck, literal);
    return (intOp && Type.isInt(type))
           ? intOp : op;
}

function assertNumericOrSetOp(type, literal, op, intOp, setOp){
    assertOpType(type, numericOrSetOpTypeCheck, literal);
    return Type.isInt(type) ? intOp : type == basicTypes.set ? setOp : op;
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

    // special case for strings
    var isStrings = Type.isString(leftType) && Type.isString(rightType);
    if (!isStrings)
        checkTypeMatch(rightType, leftType);

    return leftType;
}

function useIntOrderOp(t){
    return Type.isInt(t) || t == basicTypes.ch;
}

function useIntEqOp(t){
    return Type.isInt(t)
        || t == basicTypes.bool
        || t == basicTypes.ch
        || t instanceof Type.Pointer
        || t instanceof Type.Procedure
        || t == nilType;
}

var RelationOps = Class.extend({
    init: function RelationOps(){
    },
    eq: function(type){
        return useIntEqOp(type)         ? op.equalInt 
             : Type.isString(type)      ? op.equalStr
             : type == basicTypes.real  ? op.equalReal
             : type == basicTypes.set   ? op.equalSet
                                        : undefined;
    },
    notEq: function(type){
        return useIntEqOp(type)         ? op.notEqualInt 
             : Type.isString(type)      ? op.notEqualStr
             : type == basicTypes.real  ? op.notEqualReal
             : type == basicTypes.set   ? op.notEqualSet
                                        : undefined;
    },
    less: function(type){
        return useIntOrderOp(type) ?    op.lessInt
             : Type.isString(type)      ? op.lessStr 
             : type == basicTypes.real  ? op.lessReal
                                        : undefined;
    },
    greater: function(type){
        return useIntOrderOp(type) ?    op.greaterInt
             : Type.isString(type)      ? op.greaterStr 
             : type == basicTypes.real  ? op.greaterReal
                                        : undefined;
    },
    lessEq: function(type){
        return useIntOrderOp(type) ?    op.eqLessInt
             : Type.isString(type)      ? op.eqLessStr 
             : type == basicTypes.real  ? op.eqLessReal
             : type == basicTypes.set   ? op.setInclL
                                        : undefined;
    },
    greaterEq: function(type){
        return useIntOrderOp(type)      ? op.eqGreaterInt
             : Type.isString(type)      ? op.eqGreaterStr 
             : type == basicTypes.real  ? op.eqGreaterReal
             : type == basicTypes.set   ? op.setInclR
                                        : undefined;
    },
    eqExpect: function(){return "numeric type or SET or BOOLEAN or CHAR or character array or POINTER or PROCEDURE";},
    strongRelExpect: function(){return "numeric type or CHAR or character array";},
    relExpect: function(){return "numeric type or SET or CHAR or character array";}
});

var relationOps = new RelationOps();

function relationOp(leftType, rightType, literal, ops){
    var type = useTypeInRelation(leftType, rightType);
    var o;
    var mismatch;
    switch (literal){
        case "=":
            o = ops.eq(type);
            if (!o)
                mismatch = ops.eqExpect();
            break;
        case "#":
            o = ops.notEq(type);
            if (!o)
                mismatch = ops.eqExpect();
            break;
        case "<":
            o = ops.less(type);
            if (!o)
                mismatch = ops.strongRelExpect();
            break;
        case ">":
            o = ops.greater(type);
            if (!o)
                mismatch = ops.strongRelExpect();
            break;
        case "<=":
            o = ops.lessEq(type);
            if (!o)
                mismatch = ops.relExpect();
            break;
        case ">=":
            o = ops.greaterEq(type);
            if (!o)
                mismatch = ops.relExpect();
            break;
        }
    if (mismatch)
        throwOperatorTypeMismatch(literal, mismatch, type);
    return o;
}

exports.AddOperator = ChainedContext.extend({
    init: function AddOperatorContext(context){
        ChainedContext.prototype.init.call(this, context);
    },
    handleLiteral: function(s){
        var parent = this.parent();
        var type = parent.type();
        var o = this.__matchOperator(s, type);
        if (o)
            parent.handleBinaryOperator(o);
    },
    __matchOperator: function(s, type){
        var result;
        switch (s){
            case "+":
                result = this._matchPlusOperator(type);
                if (!result)
                    throwOperatorTypeMismatch(s, this._expectPlusOperator(), type);
                break;
            case "-":
                return assertNumericOrSetOp(type, s, op.subReal, op.subInt, op.setDiff);
            case "OR":
                if (type != basicTypes.bool)
                    throw new Errors.Error("BOOLEAN expected as operand of 'OR', got '"
                                         + type.description() + "'");
                return op.or;
            }
        return result;
    },
    _matchPlusOperator: function(type){
        if (type == basicTypes.set)
            return op.setUnion;
        if (Type.isInt(type))
            return op.addInt;
        if (type == basicTypes.real)
            return op.addReal;
        return undefined;
    },
    _expectPlusOperator: function(){return "numeric type or SET";}
});

exports.MulOperator = ChainedContext.extend({
    init: function MulOperatorContext(context){
        ChainedContext.prototype.init.call(this, context);
    },
    handleLiteral: function(s){
        var parent = this.parent();
        var type = parent.type();
        var o;
        if (s == "*")
            o = assertNumericOrSetOp(type, s, op.mulReal, op.mulInt, op.setIntersection);
        else if (s == "/"){
            if (Type.isInt(type))
                throw new Errors.Error("operator DIV expected for integer division");
            o = assertNumericOrSetOp(type, s, op.divReal, undefined, op.setSymmetricDiff);
        }
        else if (s == "DIV")
            o = assertIntOp(type, s, op.divInt);
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

exports.Term = ChainedContext.extend({
    init: function TermContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__logicalNot = false;
        this.__operator = undefined;
        this.__expression = undefined;
    },
    type: function(){return this.__expression.type();},
    setDesignator: function(d){
        var value;
        var info = d.info();
        if (info instanceof Type.Const)
            value = Type.constValue(info);
        this.handleExpression(
            Code.makeExpression(d.code(), d.type(), d, value));
    },
    handleLogicalNot: function(){
        this.__logicalNot = !this.__logicalNot;
        this.setType(basicTypes.bool);
    },
    handleOperator: function(o){this.__operator = o;},
    handleConst: function(type, value, code){
        this.handleExpression(Code.makeExpression(
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
        promoteExpressionType(this, this.__expression, e);
        if (this.__logicalNot){
            e = op.not(e);
            this.__logicalNot = false;
        }
        if (this.__operator)
            e = this.__expression ? this.__operator(this.__expression, e)
                                  : this.__operator(e);
        this.__expression = e;
    }
});

exports.Factor = ChainedContext.extend({
    init: function FactorContext(context){
        ChainedContext.prototype.init.call(this, context);
    },
    type: function(){return this.parent().type();},
    handleLiteral: function(s){
        var parent = this.parent();
        if (s == "NIL")
            parent.handleConst(nilType, undefined, "null");
        else if (s == "TRUE")
            parent.handleConst(basicTypes.bool, Code.makeIntConst(1), "true");
        else if (s == "FALSE")
            parent.handleConst(basicTypes.bool, Code.makeIntConst(0), "false");
        else if (s == "~")
            parent.handleLogicalNot();
    },
    handleFactor: function(e){this.parent().handleFactor(e);},
    handleLogicalNot: function(){this.parent().handleLogicalNot();}
});

exports.Set = ChainedContext.extend({
    init: function SetContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__value = 0;
        this.__expr = "";
    },
    handleElement: function(from, fromValue, to, toValue){
        if (fromValue && (!to || toValue)){
            if (to)
                for(var i = fromValue.value; i <= toValue.value; ++i)
                    this.__value |= 1 << i;
            else
                this.__value |= 1 << fromValue.value;
        }
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
            parent.handleConst(basicTypes.set, Code.makeSetConst(this.__value), this.__value.toString());
        else{
            var code = this.language().rtl.makeSet(this.__expr);
            if (this.__value)
                code += " | " + this.__value;
            var e = Code.makeExpression(code, basicTypes.set);
            parent.handleFactor(e);
        }
    }
});

exports.SetElement = ChainedContext.extend({
    init: function SetElementContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__from = undefined;
        this.__fromValue = undefined;
        this.__to = undefined;
        this.__toValue = undefined;
        this.__expr = Code.makeSimpleGenerator();
    },
    codeGenerator: function(){return this.__expr;},
    handleExpression: function(e){
        var value = e.constValue();
        if (!this.__from)
            {
            this.__from = this.__expr.result();
            this.__fromValue = value;
            this.__expr = Code.makeSimpleGenerator();
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
        ChainedContext.prototype.init.call(this, context);
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
                o = assertNumericOrSetOp(type, this.__unaryOperator, op.negateReal, op.negateInt, op.setComplement);
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
            checkImplicitCast(this.language().types, type, this.__type);
    },
    handleBinaryOperator: function(o){this.__binaryOperator = o;},
    endParse: function(){
        this.parent().handleSimpleExpression(this.__exp);
    }
});

exports.Expression = ChainedContext.extend({
    init: function ExpressionContext(context, relOps){
        ChainedContext.prototype.init.call(this, context);
        this.__relOps = relOps || relationOps;
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
        var resultExpression;
        var code;

        if (this.__relation == "IN"){
            if (!Type.isInt(leftType))
                throw new Errors.Error(
                    Type.intsDescription() + " expected as an element of SET, got '" + Type.typeName(leftType) + "'");
            checkImplicitCast(this.language().types, rightType, basicTypes.set);

            code = "1 << " + leftCode + " & " + rightCode;
        }
        else if (this.__relation == "IS"){
            var pointerExpected = leftType instanceof Type.Pointer;
            if (!pointerExpected && !(leftType instanceof Type.Record))
                throw new Errors.Error("POINTER to type or RECORD expected before 'IS'");

            rightType = unwrapType(rightType);
            if (!pointerExpected && !(rightType instanceof Type.Record))
                throw new Errors.Error("RECORD type expected after 'IS'");
            if (pointerExpected && !(rightType instanceof Type.Pointer))
                throw new Errors.Error("POINTER to type expected after 'IS'");

            checkTypeCast(leftType, rightType, "invalid type test");
            //rightExpression = , rightType);
            resultExpression = op.is(leftExpression, Code.makeExpression(castCode(rightType, this)));
            code = resultExpression.code();
            //code = leftCode + " instanceof " + castCode(rightType, this);
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
            var o = relationOp(leftExpression.type(), rightExpression.type(), this.__relation, this.__relOps);
            var oResult = o(leftExpression, rightExpression, this.language().rtl);
            code = oResult.code();
            value = oResult.constValue();
        }

        this.__expression = resultExpression 
                          ? resultExpression
                          : Code.makeExpression(code, basicTypes.bool, undefined, value);
    },
    handleLiteral: function(relation){
        this.__relation = relation;
    },
    codeGenerator: function(){return nullCodeGenerator;},
    endParse: function(){
        var parent = this.parent();
        parent.codeGenerator().write(this.__expression.code());
        parent.handleExpression(this.__expression);
    }
});

function handleIfExpression(e){
    var type = e.type();
    if (type !== basicTypes.bool)
        throw new Errors.Error("'BOOLEAN' expression expected, got '" + type.description() + "'");
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
        ChainedContext.prototype.init.call(this, context);
        this.codeGenerator().write("if (");
    }
});

exports.ElseIf = IfContextBase.extend({
    init: function ElseIfContext(context){
        ChainedContext.prototype.init.call(this, context);
        var gen = this.codeGenerator();
        gen.closeScope("");
        gen.write("else if (");
    }
});

exports.Else = ChainedContext.extend({
    init: function ElseContext(context){
        ChainedContext.prototype.init.call(this, context);
        var gen = this.codeGenerator();
        gen.closeScope("");
        gen.write("else ");
        gen.openScope();
    }
});

exports.emitEndStatement = function(context){
    context.codeGenerator().write(";\n");
};

exports.emitIfEnd = function(context){
    context.codeGenerator().closeScope("");
};

exports.Case = ChainedContext.extend({
    init: function CaseContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__type = undefined;
        this.__firstCase = true;
        this.genVarName("$c");
        this.codeGenerator().write("$c = ");
    },
    handleExpression: function(e){
        var type = e.type();
        var gen = this.codeGenerator();
        if (type instanceof Type.String){
            var v;
            if (Type.stringAsChar(type, {set: function(value){v = value;}})){
                gen.write(v);
                type = basicTypes.ch;
            }
        }
        if (!Type.isInt(type) && type != basicTypes.ch)
            throw new Errors.Error(
                Type.intsDescription() + " or 'CHAR' expected as CASE expression");
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
        if (!Cast.areTypesMatch(type, this.__type))
            throw new Errors.Error(
                "label must be '" + Type.typeName(this.__type) + "' (the same as case expression), got '"
                + Type.typeName(type) + "'");
    }
});

exports.CaseLabelList = ChainedContext.extend({
    init: function CaseLabelListContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__glue = "";
    },
    handleLabelType: function(type){this.parent().handleLabelType(type);},
    handleRange: function(from, to){
        if (!this.__glue)
            this.parent().caseLabelBegin();

        var cond = to === undefined
            ? "$c === " + from.value
            : "($c >= " + from.value + " && $c <= " + to.value + ")";
        this.codeGenerator().write(this.__glue + cond);
        this.__glue = " || ";
    },
    endParse: function(){this.parent().caseLabelEnd();}
});

exports.CaseLabel = ChainedContext.extend({
    init: function CaseLabelContext(context){
        ChainedContext.prototype.init.call(this, context);
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
    endParse: function(){this.codeGenerator().closeScope("");}
});

exports.CaseRange = ChainedContext.extend({
    init: function CaseRangeContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__from = undefined;
        this.__to = undefined;
    },
    codeGenerator: function(){return nullCodeGenerator;}, // suppress any output
    handleLabel: function(type, v){
        this.parent().handleLabelType(type);
        if (this.__from === undefined )
            this.__from = v;
        else
            this.__to = v;
    },
    handleConst: function(type, value){
        if (type instanceof Type.String){
            if (!Type.stringAsChar(type, {set: function(v){value = v;}}))
                throw new Errors.Error("single-character string expected");
            type = basicTypes.ch;
            value = Code.makeIntConst(value);
        }
        this.handleLabel(type, value);
    },
    handleIdent: function(id){
        var s = getSymbol(this.parent(), id);
        if (!s.isConst())
            throw new Errors.Error("'" + id + "' is not a constant");
        
        var type = Type.constType(s.info());
        if (type instanceof Type.String)
            this.handleConst(type, undefined);
        else
            this.handleLabel(type, Type.constValue(s.info()));
    },
    endParse: function(){this.parent().handleRange(this.__from, this.__to);}
});

exports.While = ChainedContext.extend({
    init: function WhileContext(context){
        ChainedContext.prototype.init.call(this, context);
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
    gen.closeScope("");
};

exports.Repeat = ChainedContext.extend({
    init: function RepeatContext(context){
        ChainedContext.prototype.init.call(this, context);
        var gen = context.codeGenerator();
        gen.write("do ");
        gen.openScope();
    }
});

exports.Until = ChainedContext.extend({
    init: function UntilContext(context){
        ChainedContext.prototype.init.call(this, context);
        var gen = context.codeGenerator();
        gen.closeScope(" while (");
    },
    handleExpression: handleIfExpression,
    endParse: function(){this.codeGenerator().write(");\n");}
});

exports.For = ChainedContext.extend({
    init: function ForContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__var = undefined;
        this.__initExprParsed = false;
        this.__toExpr = Code.makeSimpleGenerator();
        this.__toParsed = false;
        this.__by_parsed = false;
        this.__by = undefined;
    },
    handleIdent: function(id){
        var s = getSymbol(this.parent(), id);
        if (!s.isVariable())
            throw new Errors.Error("'" + s.id() + "' is not a variable");
        var type = s.info().type();
        if (type !== basicTypes.integer)
            throw new Errors.Error(
                  "'" + s.id() + "' is a '" 
		+ type.description() + "' variable, 'FOR' control variable must be 'INTEGER'");
        this.codeGenerator().write("for (" + id + " = ");
        this.__var = id;
    },
    handleExpression: function(e){
        var type = e.type();
        var value = e.constValue();
        if (type !== basicTypes.integer)
            throw new Errors.Error(
                !this.__initExprParsed
                    ? "'INTEGER' expression expected to assign '" + this.__var
                      + "', got '" + type.description() + "'"
                    : !this.__toParsed
                    ? "'INTEGER' expression expected as 'TO' parameter, got '" + type.description() + "'"
                    : "'INTEGER' expression expected as 'BY' parameter, got '" + type.description() + "'"
                    );
        if (!this.__initExprParsed)
            this.__initExprParsed = true;
        else if (!this.__toParsed)
            this.__toParsed = true;
        else if ( value === undefined )
            throw new Errors.Error("constant expression expected as 'BY' parameter");
        else
            this.__by = value.value;
    },
    codeGenerator: function(){
        if (this.__initExprParsed && !this.__toParsed)
            return this.__toExpr;
        if (this.__toParsed && !this.__by_parsed)
            return nullCodeGenerator; // suppress output for BY expression
        
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
    endParse: function(){this.codeGenerator().closeScope("");}
});

exports.emitForBegin = function(context){context.handleBegin();};

exports.CheckAssignment = ChainedContext.extend({
    init: function Context$CheckAssignment(context){
        ChainedContext.prototype.init.call(this, context);
    },
    handleLiteral: function(s){
        if (s == "=")
            throw new Errors.Error("did you mean ':=' (statement expected, got expression)?");
    }
});

exports.Assignment = ChainedContext.extend({
    init: function AssignmentContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__left = undefined;
    },
    codeGenerator: function(){return nullCodeGenerator;},
    setDesignator: function(d){
        this.__left = Code.makeExpression(d.code(), d.type(), d);
    },
    handleExpression: function(e){
        this.parent().codeGenerator().write(op.assign(this.__left, e, this.language()));
    }
});

exports.ConstDecl = ChainedContext.extend({
    init: function ConstDeclContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__id = undefined;
        this.__type = undefined;
        this.__value = undefined;
    },
    handleIdentdef: function(id){
        this.__id = id;
        this.codeGenerator().write("var " + id.id() + " = ");
    },
    handleExpression: function(e){
        var value = e.constValue();
        if (!value)
            throw new Errors.Error("constant expression expected");
        this.__type = e.type();
        this.__value = value;
    },
    endParse: function(){
        var c = Type.makeConst(this.__type, this.__value);
        this.currentScope().addSymbol(Symbol.makeSymbol(this.__id.id(), c), this.__id.exported());
        this.codeGenerator().write(";\n");
    }
});

function checkIfFieldCanBeExported(name, idents, hint){
    for(var i = 0; i < idents.length; ++i){
        var id = idents[i];
        if (!id.exported())
            throw new Errors.Error(
                "field '" + name + "' can be exported only if " + hint + " '" +
                id.id() + "' itself is exported too");
    }
}

exports.VariableDeclaration = HandleSymbolAsType.extend({
    init: function Context$VariableDeclaration(context){
        HandleSymbolAsType.prototype.init.call(this, context);
        this.__idents = [];
        this.__type = undefined;
    },
    handleIdentdef: function(id){this.__idents.push(id);},
    exportField: function(name){
        checkIfFieldCanBeExported(name, this.__idents, "variable");
    },
    setType: function(type){this.__type = type;},
    type: function(){return this.__type;},
    typeName: function(){return undefined;},
    isAnonymousDeclaration: function(){return true;},
    checkExport: function(){},
    endParse: function(){
        var v = Type.makeVariable(this.__type, false);
        var idents = this.__idents;
        var gen = this.codeGenerator();
        for(var i = 0; i < idents.length; ++i){
            var id = idents[i];
            var varName = id.id();
            if (id.exported())
                this.checkExport(varName);
            this.currentScope().addSymbol(Symbol.makeSymbol(varName, v), id.exported());
            var t = v.type();
            gen.write("var " + varName + " = " + t.initializer(this) + ";");
        }

        gen.write("\n");
    }
});

exports.FieldListDeclaration = HandleSymbolAsType.extend({
    init: function Context$FieldListDeclaration(context){
        HandleSymbolAsType.prototype.init.call(this, context);
        this.__idents = [];
        this.__type = undefined;
    },
    typeName: function(){return undefined;},
    handleIdentdef: function(id) {this.__idents.push(id);},
    exportField: function(name){
        checkIfFieldCanBeExported(name, this.__idents, "field");
    },
    setType: function(type) {this.__type = type;},
    isAnonymousDeclaration: function(){return true;},
    endParse: function(){
        var idents = this.__idents;
        var parent = this.parent();
        for(var i = 0; i < idents.length; ++i)
            parent.addField(idents[i], this.__type);
    }
});

function assertProcType(d){
    var type = d.type();
    var unexpected;
    if ( !type )
        unexpected = d.info().idType();
    else if (!(type instanceof Type.Procedure) && !(type instanceof Module.AnyType))
        unexpected = type.description();
    if (unexpected)
        throw new Errors.Error("PROCEDURE expected, got '" + unexpected + "'");
    return type;
}

exports.ActualParameters = ChainedContext.extend({
    init: function ActualParametersContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.parent().hasActualParameters();
    }
});

var ProcedureCall = ChainedContext.extend({
    init: function ProcedureCallContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__type = undefined;
        this.__procCall = undefined;
        this.__code = Code.makeSimpleGenerator();
    },
    setDesignator: function(d){
        this.__type = assertProcType(d);
        var l = this.language();
        this.__procCall = this.__type.callGenerator(
              { 
                types: l.types
              , rtl: l.rtl
              , qualifyScope: this.qualifyScope.bind(this)
              }
            , d.code());
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
        ProcedureCall.prototype.init.call(this, context);
    },
    endParse: function(){
        ProcedureCall.prototype.endParse.call(this);
        var e = this.callExpression();
        var type = e.type();
        if  (type && !(type instanceof Module.AnyType ))
            throw new Errors.Error("procedure returning a result cannot be used as a statement");
        this.parent().codeGenerator().write(e.code());
    }
});

exports.ExpressionProcedureCall = ProcedureCall.extend({
    init: function ExpressionProcedureCall(context){
        ProcedureCall.prototype.init.call(this, context);
        this.__designator = undefined;
        this.__hasActualParameters = false;
    },
    setDesignator: function(d){
        this.__designator = d;
    },
    hasActualParameters: function(){
        ProcedureCall.prototype.setDesignator.call(this, this.__designator);
        this.__hasActualParameters = true;
    },
    endParse: function(){
        var parent = this.parent();
        if (this.__hasActualParameters){
            ProcedureCall.prototype.endParse.call(this);
            parent.handleFactor(this.callExpression());
        }
        else{
            var d = this.__designator;
            var info = d.info();
            if (info instanceof Type.ProcedureId){
                var proc = Type.procedureType(info);
                if (proc instanceof Procedure.Std)
                    throw new Errors.Error(proc.description() + " cannot be referenced");
                var scope = d.scope();
                if (scope instanceof Scope.Procedure)
                    throw new Errors.Error("local procedure '" + d.code() + "' cannot be referenced");
            }
            parent.setDesignator(d);
        }
    }
});

function isTypeRecursive(type, base){
    if (type == base)
        return true;
    if (type instanceof Type.Record){
        if (isTypeRecursive(Type.recordBase(type), base))
            return true;
        var fields = Type.recordOwnFields(type);
        for(var fieldName in fields){
            if (isTypeRecursive(fields[fieldName], base))
                return true;
        }
    }
    else if (type instanceof Type.Array)
        return isTypeRecursive(Type.arrayElementsType(type), base);
    return false;
}

exports.RecordDecl = ChainedContext.extend({
    init: function RecordDeclContext(context, makeRecord){
        ChainedContext.prototype.init.call(this, context);
        var parent = this.parent();
        var cons = parent.genTypeName();
        var name = parent.isAnonymousDeclaration() ? "" : cons;
        this.__type = makeRecord(name, cons, context.currentScope());
        parent.setType(this.__type);
        parent.codeGenerator().write("var " + cons + " = ");
    },
    type: function(){return this.__type;},
    addField: function(field, type){
        if (isTypeRecursive(type, this.__type))
            throw new Errors.Error("recursive field definition: '"
                + field.id() + "'");
        this.__type.addField(field, type);
        if (field.exported())
            this.parent().exportField(field.id());
    },
    setBaseType: function(type){
        if (!(type instanceof Type.Record))
            throw new Errors.Error(
                "RECORD type is expected as a base type, got '"
                + type.description()
                + "'");
        if (isTypeRecursive(type, this.__type))
            throw new Errors.Error("recursive inheritance: '"
                + Type.typeName(this.__type) + "'");
        Type.setRecordBase(this.__type, type);
    },
    endParse: function(){
        var type = this.__type;
        var baseType = Type.recordBase(type);
        var gen = this.codeGenerator();
        var qualifiedBase = baseType ? this.qualifyScope(Type.recordScope(baseType)) + Type.typeName(baseType) : undefined; 
        gen.write((baseType ? qualifiedBase + ".extend" 
                            : this.language().rtl.extendId())
                + "(");
        gen.openScope();
        gen.write("init: function " + Type.recordConstructor(this.__type) + "()");
        gen.openScope();
        if (baseType)
            gen.write(qualifiedBase + ".prototype.init.call(this);\n");
        var ownFields = Type.recordOwnFields(type);
        for(var f in ownFields)
            gen.write("this." + f + " = " + ownFields[f].initializer(this) + ";\n");

        gen.closeScope("");
        gen.closeScope(");\n");
    }
});

exports.TypeDeclaration = ChainedContext.extend({
    init: function TypeDeclarationContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__id = undefined;
        this.__symbol = undefined;
    },
    handleIdentdef: function(id){
        var typeId = Type.makeLazyTypeId();
        var symbol = Symbol.makeSymbol(id.id(), typeId);
        this.currentScope().addSymbol(symbol, id.exported());
        if (!id.exported())
            this.currentScope().addFinalizer(function(){typeId.strip();});
        this.__id = id;
        this.__symbol = symbol;
    },
    setType: function(type){
        Type.defineTypeId(this.__symbol.info(), type);
        Scope.resolve(this.currentScope(), this.__symbol);
    },
    typeName: function(){return this.__id.id();},
    genTypeName: function(){return this.__id.id();},
    isAnonymousDeclaration: function(){return false;},
    type: function(){return this.parent().type();},
    exportField: function(name){
        checkIfFieldCanBeExported(name, [this.__id], "record");
    }
});

exports.TypeSection = ChainedContext.extend({
    init: function TypeSection(context){
        ChainedContext.prototype.init.call(this, context);
    },
    endParse: function(){
        var unresolved = Scope.unresolved(this.currentScope());
        if (unresolved.length)
            throw new Errors.Error("no declaration found for '" + unresolved.join("', '") + "'");
    }
});

exports.TypeCast = ChainedContext.extend({
    init: function TypeCastContext(context){
        ChainedContext.prototype.init.call(this, context);
        this.__type = undefined;
    },
    handleSymbol: function(s){
        s = s.symbol();
        if (!s.isType())
            return; // this is not a type cast, may be procedure call
        this.__type = s.info().type();
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
        ChainedContext.prototype.init.call(this, context);
        this.__name = undefined;
        this.__imports = {};
        this.__moduleScope = undefined;
        this.__moduleGen = undefined;
        this.__stdSymbols = this.language().stdSymbols;
    },
    handleIdent: function(id){
        var parent = this.parent();
        if (this.__name === undefined ) {
            this.__name = id;
            this.__moduleScope = Scope.makeModule(id, this.__stdSymbols);
            parent.pushScope(this.__moduleScope);
        }
        else if (id === this.__name){
            var scope = parent.currentScope();
            scope.close();
            var exports = Scope.moduleExports(scope);
            Scope.defineExports(Scope.moduleSymbol(scope).info(), exports);
            this.codeGenerator().write(this.__moduleGen.epilog(exports));
        }
        else
            throw new Errors.Error("original module name '" + this.__name + "' expected, got '" + id + "'" );
    },
    findModule: function(name){
        if (name == this.__name)
            throw new Errors.Error("module '" + this.__name + "' cannot import itself");
        return this.parent().findModule(name);
    },
    handleImport: function(modules){
        var scope = this.currentScope();
        var moduleAliases = {};
        for(var i = 0; i < modules.length; ++i){
            var s = modules[i];
            var name = Type.moduleName(s.info());
            this.__imports[name] = s;
            scope.addSymbol(s);
            moduleAliases[name] = s.id();
        }
        this.__moduleGen = this.parent().makeModuleGenerator(
                this.__name,
                moduleAliases);
        this.codeGenerator().write(this.__moduleGen.prolog());
    },
    qualifyScope: function(scope){
        if (scope != this.__moduleScope && scope instanceof Scope.Module){
            var id = Scope.moduleSymbol(scope).id();
            return this.__imports[id].id() + ".";
        }
        return "";
    }
});

var ModuleImport = ChainedContext.extend({
    init: function ModuleImport(context){
        ChainedContext.prototype.init.call(this, context);
        this.__import = {};
        this.__currentModule = undefined;
        this.__currentAlias = undefined;
    },
    handleIdent: function(id){
        this.__currentModule = id;
    },
    handleLiteral: function(s){
        if (s == ":=")
            this.__currentAlias = this.__currentModule;
        else if (s == ",")
            this.__handleImport();
    },
    endParse: function(){
        if (this.__currentModule)
            this.__handleImport();

        var modules = [];
        var unresolved = [];
        for(var alias in this.__import){
            var moduleName = this.__import[alias];
            var module = this.parent().findModule(moduleName);
            if (!module)
                unresolved.push(moduleName);
            else
                modules.push(Symbol.makeSymbol(alias, module));
        }
        if (unresolved.length)
            throw new Errors.Error("module(s) not found: " + unresolved.join(", "));
        
        this.parent().handleImport(modules);
    },
    __handleImport: function(){
        var alias = this.__currentAlias;
        if (!alias)
            alias = this.__currentModule;
        else
            this.__currentAlias = undefined;
        
        for(var a in this.__import){
            if (a == alias)
                throw new Errors.Error("duplicated alias: '" + alias +"'");
            if (this.__import[a] == this.__currentModule)
                throw new Errors.Error("module already imported: '" + this.__currentModule +"'");
        }
        this.__import[alias] = this.__currentModule;
    }
});
exports.ModuleImport = ModuleImport;

exports.Context = Class.extend({
    init: function Context(language){
        this.__language = language;
        this.__scopes = [];
        this.__gen = 0;
        this.__vars = [];
    },
    language: function(){return this.__language;},
    genTypeName: function(){
        ++this.__gen;
        return "anonymous$" + this.__gen;
    },
    genVarName: function(id){
        if (this.__vars.indexOf(id) === -1) {
            this.codeGenerator().write("var " + id + ";\n");
            this.__vars.push(id);
        }
    },
    findSymbol: function(ident){
        for(var i = this.__scopes.length; i--;){
            var scope = this.__scopes[i];
            var s = scope.findSymbol(ident);

            if (s)
                return Symbol.makeFound(s, scope);
        }
        return undefined;
    },
    currentScope: function(){return this.__scopes[this.__scopes.length - 1];},
    pushScope: function(scope){this.__scopes.push(scope);},
    popScope: function(){
        var scope = this.__scopes.pop();
        scope.close();
    },
    handleExpression: function(){},
    handleLiteral: function(){},
    codeGenerator: function(){return this.__language.codeGenerator;},
    makeModuleGenerator: function(name, imports){
        return this.__language.moduleGenerator(name, imports);
    },
    findModule: function(name){
        if (name == "JS"){
            return Module.makeJS();
        }
        return this.__language.moduleResolver ? this.__language.moduleResolver(name) : undefined;
    }
});

exports.AddArgumentMsg = AddArgumentMsg;
exports.Chained = ChainedContext;
exports.endParametersMsg = endParametersMsg;
exports.getSymbolAndScope = getSymbolAndScope;
exports.unwrapType = unwrapType;
exports.IdentdefInfo = IdentdefInfo;
exports.RelationOps = RelationOps;
