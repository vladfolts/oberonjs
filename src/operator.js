"use strict";

var Cast = require("cast.js");
var Code = require("code.js");
var Errors = require("js/Errors.js");
var Type = require("type.js");

var precedence = {
    unary: 4,
    mulDivMod: 5,
    addSub: 6,
    shift: 7,
    relational: 8,
    equal: 9,
    bitAnd: 10,
    bitXor: 11,
    bitOr: 12,
    and: 13,
    or: 14,
    conditional: 15,
    assignment: 17
};

function makeBinary(op, code, precedence, resultPrecedence){
    return function(left, right, context){
        var leftValue = left.constValue();
        var rightValue = right.constValue();
        var value = (leftValue !== undefined && rightValue !== undefined)
            ? op(leftValue, rightValue) : undefined;

        var leftCode = Code.adjustPrecedence(left.deref(), precedence);

        // right code needs parentheses even if it has the same percedence
        var rightCode = Code.adjustPrecedence(right.deref(), precedence - 1);
        var expCode = (typeof code == "function")
                    ? code(leftCode, rightCode, context)
                    : leftCode + code + rightCode;
        return new Code.Expression(expCode, left.type(), undefined, value, resultPrecedence ? resultPrecedence : precedence);
    };
}

function makeUnary(op, code){
    return function(e){
        var type = e.type();
        var value = e.constValue();
        if (value !== undefined)
            value = op(value, type) ;
        var expCode = code + Code.adjustPrecedence(e.deref(), precedence.unary);
        return new Code.Expression(expCode, type, undefined, value);
    };
}

var mul = makeBinary(function(x, y){return x * y;}, " * ", precedence.mulDivMod);
var div = makeBinary(function(x, y){return x / y;}, " / ", precedence.mulDivMod);

var openArrayChar = new Type.Array(undefined, undefined, Type.basic.ch);

function castToStr(e, context){
    var type = e.type();
    var opCast = Cast.implicit(type, openArrayChar);
    return opCast(context, e).code();
}

function makeStrCmp(op){
    return function(left, right, context){
        return new Code.Expression(
            context.rtl().strCmp(castToStr(left, context),
                                 castToStr(right, context))
                + op + "0",
            Type.basic.bool
        );
    };
}

function pow2(e){
    return new Code.Expression("Math.pow(2, " + e.deref().code() + ")",
                               Type.basic.real);
}

function log2(e){
    return new Code.Expression("(Math.log(" + e.deref().code() + ") / Math.LN2) | 0",
                               Type.basic.integer, undefined, undefined, precedence.bitOr);
}

function assign(left, right, context){
    var info = left.designator().info();
    if (!(info instanceof Type.Variable) || info.isReadOnly())
        throw new Errors.Error("cannot assign to " + info.idType());

    var leftCode = left.lval();
    var leftType = left.type();
    var rightCode = right.code();
    var rightType = right.type();

    var isArray = leftType instanceof Type.Array;
    if (isArray
        && leftType.elementsType() == Type.basic.ch
        && rightType instanceof Type.String){
        if (leftType.length() === undefined)
            throw new Errors.Error("string cannot be assigned to open " + leftType.description());
        if (rightType.length() > leftType.length())
            throw new Errors.Error(
                leftType.length() + "-character ARRAY is too small for "
                + rightType.length() + "-character string");
        return context.rtl().assignArrayFromString(leftCode, rightCode);
    }

    var castOperation = Cast.implicit(rightType, leftType, exports);
    if (!castOperation)
        throw new Errors.Error("type mismatch: '" + leftCode
                             + "' is '" + leftType.description()
                             + "' and cannot be assigned to '" + rightType.description() + "' expression");

    if (isArray && rightType instanceof Type.Array){
        if (leftType.length() === undefined)
            throw new Errors.Error("'" + leftCode
                                 + "' is open '" + leftType.description()
                                 + "' and cannot be assigned");
    }
    
    if (isArray || rightType instanceof Type.Record)
        return context.rtl().copy(rightCode, leftCode);

    var castCode = castOperation(context, right.deref()).code();
    rightCode = castCode ? castCode : rightCode;
    return leftCode + (info instanceof Type.VariableRef 
                      ? ".set(" + rightCode + ")"
                      : " = " + rightCode);
}

function makeInplace(code, altOp){
    return function(left, right){
        var info = left.designator().info();
        if (info instanceof Type.VariableRef)
            return assign(left, altOp(left, right));
        return left.code() + code + right.deref().code();
    };
}

function promoteToWideIfNeeded(op){
    return function(){
        var result = op.apply(this, arguments);
        if (result.type() == Type.basic.uint8)
            result = new Code.Expression(
                result.code(),
                Type.basic.integer,
                result.designator(),
                result.constValue(),
                result.maxPrecedence());
        return result;
    };
}

function makeBinaryInt(op, code, prec){
    return promoteToWideIfNeeded(makeBinary(
            function(x, y){return op(x, y) | 0;},
            function(x, y){return x + code + y + " | 0";},
            prec,
            precedence.bitOr));
}

var operators = {
    add:    makeBinary(   function(x, y){return x + y;}, " + ", precedence.addSub),
    addInt: makeBinaryInt(function(x, y){return x + y;}, " + ", precedence.addSub),
    sub:    makeBinary(   function(x, y){return x - y;}, " - ", precedence.addSub),
    subInt: makeBinaryInt(function(x, y){return x - y;}, " - ", precedence.addSub),
    mul:    mul,
    mulInt: makeBinaryInt(function(x, y){return x * y;}, " * ", precedence.mulDivMod),
    div:    div,
    divInt: makeBinaryInt(function(x, y){return x / y;}, " / ", precedence.mulDivMod),
    mod:        makeBinary(function(x, y){return x % y;}, " % ", precedence.mulDivMod),
    setUnion:   makeBinary(function(x, y){return x | y;}, " | ", precedence.bitOr),
    setDiff:    makeBinary(function(x, y){return x & ~y;}, " & ~", precedence.bitAnd),
    setIntersection: makeBinary(function(x, y){return x & y;}, " & ", precedence.bitAnd),
    setSymmetricDiff: makeBinary(function(x, y){return x ^ y;}, " ^ ", precedence.bitXor),
    setInclL:   makeBinary(
            function(x, y){return (x & y) == x;},
            function(x, y, context){return context.rtl().setInclL(x, y);}),
    setInclR:   makeBinary(
            function(x, y){return (x & y) == y;},
            function(x, y, context){return context.rtl().setInclR(x, y);}),

    or:         makeBinary(function(x, y){return x || y;}, " || ", precedence.or),
    and:        makeBinary(function(x, y){return x && y;}, " && ", precedence.and),

    equal:      makeBinary(function(x, y){return x == y;}, " == ", precedence.equal),
    equalStr:   makeStrCmp(" == "),
    notEqual:   makeBinary(function(x, y){return x != y;}, " != ", precedence.equal),
    notEqualStr: makeStrCmp(" != "),
    less:       makeBinary(function(x, y){return x < y;}, " < ", precedence.relational),
    lessStr:    makeStrCmp(" < "),
    greater:    makeBinary(function(x, y){return x > y;}, " > ", precedence.relational),
    greaterStr: makeStrCmp(" > "),
    eqLess:     makeBinary(function(x, y){return x <= y;}, " <= ", precedence.relational),
    eqLessStr:  makeStrCmp(" <= "),
    eqGreater:  makeBinary(function(x, y){return x >= y;}, " >= ", precedence.relational),
    eqGreaterStr: makeStrCmp(" >= "),

    not:        makeUnary(function(x){return !x;}, "!"),
    negate:     promoteToWideIfNeeded(makeUnary(function(x){return -x;}, "-")),
    unaryPlus:  makeUnary(function(x){return x;}, ""),
    setComplement: makeUnary(function(x){return ~x;}, "~"),

    lsl:        makeBinary(function(x, y){return x << y;}, " << ", precedence.shift),
    asr:        makeBinary(function(x, y){return x >> y;}, " >> ", precedence.shift),
    ror:        makeBinary(function(x, y){return x >>> y;}, " >>> ", precedence.shift),

    assign:     assign,
    mulInplace: makeInplace(" *= ", mul),
    divInplace: makeInplace(" /= ", div),
    
    pow2:       pow2,
    log2:       log2
};

for(var p in operators)
    exports[p] = operators[p];
exports.precedence = precedence;