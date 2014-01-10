"use strict";
var Code = require("js/Code.js");
var Type = require("js/Types.js");
var ArrayType = Type.Array;
var PointerType = Type.Pointer;
var ProcedureType = Type.Procedure;

var basicTypes = Type.basic();

function doNoting(context, e){return e;}

function findBaseType(base, type){
    while (type && type != base)
        type = Type.recordBase(type);
    return type;
}

function findPointerBaseType(pBase, pType){
    if (!findBaseType(Type.pointerBase(pBase), Type.pointerBase(pType)))
        return undefined;
    return pBase;
}

function matchesToNIL(t){
    return t instanceof PointerType || t instanceof ProcedureType;
}

function areTypesExactlyMatch(t1, t2){
    if (t1 == t2)
        return true;
    if (t1 instanceof ArrayType && t2 instanceof ArrayType)
        return Type.arrayLength(t1) == Type.arrayLength(t2) 
            && areTypesMatch(Type.arrayElementsType(t1), Type.arrayElementsType(t2));
    if (t1 instanceof PointerType && t2 instanceof PointerType)
        return areTypesMatch(Type.pointerBase(t1), Type.pointerBase(t2));
    if (t1 instanceof ProcedureType && t2 instanceof ProcedureType)
        return areProceduresMatch(t1, t2);
    return false;
}

function areTypesMatch(t1, t2){
    return areTypesExactlyMatch(t1, t2)
        || (Type.isInt(t1) && Type.isInt(t2))
        || (t1 == Type.nil && matchesToNIL(t2)
            || t2 == Type.nil && matchesToNIL(t1))
        ;
}

function areProceduresMatch(p1, p2){
    var args1 = p1.args();
    var args2 = p2.args();
    if (args1.length != args2.length)
        return false;

    for(var i = 0; i < args1.length; ++i){
        var a1 = args1[i];
        var a2 = args2[i];
        if (a1.isVar != a2.isVar)
            return false;
        if (a1.type != p1 && a2.type != p2
            &&!areTypesExactlyMatch(a1.type, a2.type))
            return false;
    }

    var r1 = p1.result();
    var r2 = p2.result();
    if (r1 == p1 && r2 == p2)
        return true;
    return areTypesExactlyMatch(r1, r2);
}

function implicitCast(from, to, ops){
    if (from == to)
        return doNoting;

    if (from == basicTypes.uint8 && to == basicTypes.integer)
        return doNoting;

    if (from == basicTypes.integer && to == basicTypes.uint8)
        return function(context, e){
            return ops.setIntersection(e, Code.makeExpression("0xFF", basicTypes.integer, null, 0xFF));
        };

    if (from instanceof Type.String){
        if (to === basicTypes.ch){
            var v;
            if (Type.stringAsChar(from, {set: function(value){v = value;}}))
                return function(){return Code.makeExpression(v, to);};
        }
        else if (to instanceof Type.Array && Type.arrayElementsType(to) == basicTypes.ch)
            return doNoting;
    }
    else if (from instanceof ArrayType && to instanceof ArrayType)
        return (Type.arrayLength(to) == Type.openArrayLength || Type.arrayLength(to) == Type.arrayLength(from))
            ? implicitCast(Type.arrayElementsType(from), Type.arrayElementsType(to))
            : undefined;
    else if (from instanceof PointerType && to instanceof PointerType){
        if (findPointerBaseType(to, from))
            return doNoting;
    }
    else if (from instanceof Type.Record && to instanceof Type.Record){
        if (findBaseType(to, from))
            return doNoting;
    }
    else if (from == Type.nil && matchesToNIL(to))
        return doNoting;
    else if (from instanceof ProcedureType && to instanceof ProcedureType){
        if (areProceduresMatch(from, to))
            return doNoting;
    }
    return undefined;
}

exports.areProceduresMatch = areProceduresMatch;
exports.areTypesMatch = areTypesMatch;
exports.implicit = implicitCast;
exports.findPointerBaseType = findPointerBaseType;
