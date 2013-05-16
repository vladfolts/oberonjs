"use strict";

var Code = require("code.js");

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

var operators = {
    add: makeBinary(function(x, y){return x + y;}, " + ", precedence.addSub),
    sub: makeBinary(function(x, y){return x - y;}, " - ", precedence.addSub),
    mul: makeBinary(function(x, y){return x * y;}, " * ", precedence.mulDivMod),
    div: makeBinary(
            function(x, y){return (x / y) >> 0;},
            function(x, y){return x + " / " + y + " >> 0";},
            precedence.mulDivMod,
            precedence.shift),
    divFloat:   makeBinary(function(x, y){return x / y;}, " / ", precedence.mulDivMod),
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
    setComplement: makeUnary(function(x){return ~x;}, "~")
};

for(var p in operators)
    exports[p] = operators[p];
exports.precedence = precedence;