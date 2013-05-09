var Code = require("code.js");

var precedence = {
    mulDivMod: 5,
    addSub: 6,
    shift: 7,
    equal: 9,
    bitAnd: 10,
    bitXor: 11,
    bitOr: 12,
    and: 13,
    or: 14,
    conditional: 15,
    assignment: 17
};

function make(op, code, precedence, resultPrecedence){
    return function(left, right){
        var leftValue = left.constValue();
        var rightValue = right.constValue();
        var value = (leftValue !== undefined && rightValue !== undefined)
            ? op(leftValue, rightValue) : undefined;

        var leftCode = Code.adjustPrecedence(left.deref(), precedence);
        var rightCode = Code.adjustPrecedence(right.deref(), precedence);
        var expCode = (typeof code == "function")
                    ? code(leftCode, rightCode)
                    : leftCode + code + rightCode;
        return new Code.Expression(expCode, left.type(), undefined, value, resultPrecedence ? resultPrecedence : precedence);
    };
}

var operators = {
    add: make(function(x, y){return x + y;}, " + ", precedence.addSub),
    sub: make(function(x, y){return x - y;}, " - ", precedence.addSub),
    mul: make(function(x, y){return x * y;}, " * ", precedence.mulDivMod),
    div: make(function(x, y){return (x / y) >> 0;},
              function(x, y){return x + " / " + y + " >> 0";},
              precedence.mulDivMod, precedence.shift),
    divFloat: make(function(x, y){return x / y;}, " / ", precedence.mulDivMod),
    mod: make(function(x, y){return x % y;}, " % ", precedence.mulDivMod),
    setUnion: make(function(x, y){return x | y;}, " | ", precedence.bitOr),
    setDiff: make(function(x, y){return x & ~y;}, " & ~", precedence.bitAnd),
    setIntersection: make(function(x, y){return x & y;}, " & ", precedence.bitAnd),
    setSymmetricDiff: make(function(x, y){return x ^ y;}, " ^ ", precedence.bitXor),
    or: make(function(x, y){return x || y;}, " || ", precedence.or),
    and: make(function(x, y){return x && y;}, " && ", precedence.and),
    equal: make(function(x, y){return x && y;}, " == ", precedence.equal)
};

for(var p in operators)
    exports[p] = operators[p];
exports.precedence = precedence;