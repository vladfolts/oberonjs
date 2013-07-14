"use strict";

var Cast = require("cast.js");
var Code = require("code.js");
var Errors = require("errors.js");
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
var divFloat = makeBinary(function(x, y){return x / y;}, " / ", precedence.mulDivMod);

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

    var leftCode = left.code();
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

    var castOperation = Cast.implicit(rightType, leftType);
    if (!castOperation)
        throw new Errors.Error("type mismatch: '" + leftCode
                             + "' is '" + leftType.description()
                             + "' and cannot be assigned to '" + rightType.description() + "' expression");

    if (isArray && rightType instanceof Type.Array)
        if (leftType.length() === undefined)
            throw new Errors.Error("'" + leftCode
                                 + "' is open '" + leftType.description()
                                 + "' and cannot be assigned");
        else if (rightType.length() === undefined)
            throw new Errors.Error("'" + leftCode
                                 + "' cannot be assigned to open '"
                                 + rightType.description() + "'");
        else if (leftType.length() != rightType.length())
            throw new Errors.Error("array size mismatch: '" + leftCode
                                 + "' has size " + leftType.length()
                                 + " and cannot be copied to the array with size "
                                 + rightType.length());
    
    if (isArray || rightType instanceof Type.Record)
        return context.rtl().copy(rightCode, leftCode);

    var castCode = castOperation(context, right.deref()).code();
    rightCode = castCode ? castCode : rightCode;
    return leftCode + (info.isVar() ? ".set(" + rightCode + ")"
                                    : " = " + rightCode);
}

function makeInplace(code, altOp){
    return function(left, right){
        var info = left.designator().info();
        if (info.isVar())
            return assign(left, altOp(left, right));
        return left.code() + code + right.deref().code();
    };
}

var operators = {
    add: makeBinary(function(x, y){return x + y;}, " + ", precedence.addSub),
    sub: makeBinary(function(x, y){return x - y;}, " - ", precedence.addSub),
    mul: mul,
    div: makeBinary(
            function(x, y){return (x / y) | 0;},
            function(x, y){return x + " / " + y + " | 0";},
            precedence.mulDivMod,
            precedence.bitOr),
    divFloat:   divFloat,
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
    notEqual:   makeBinary(function(x, y){return x != y;}, " != ", precedence.equal),
    less:       makeBinary(function(x, y){return x < y;}, " < ", precedence.relational),
    greater:    makeBinary(function(x, y){return x > y;}, " > ", precedence.relational),
    eqLess:     makeBinary(function(x, y){return x <= y;}, " <= ", precedence.relational),
    eqGreater:  makeBinary(function(x, y){return x >= y;}, " >= ", precedence.relational),

    not:        makeUnary(function(x){return !x;}, "!"),
    negate:     makeUnary(function(x){return -x;}, "-"),
    unaryPlus:  makeUnary(function(x){return x;}, ""),
    setComplement: makeUnary(function(x){return ~x;}, "~"),

    lsl:        makeBinary(function(x, y){return x << y;}, " << ", precedence.shift),
    asr:        makeBinary(function(x, y){return x >> y;}, " >> ", precedence.shift),
    ror:        makeBinary(function(x, y){return x >>> y;}, " >>> ", precedence.shift),

    assign:     assign,
    mulInplace: makeInplace(" *= ", mul),
    divInplace: makeInplace(" /= ", divFloat),
    
    pow2:       pow2,
    log2:       log2
};

for(var p in operators)
    exports[p] = operators[p];
exports.precedence = precedence;