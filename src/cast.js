"use strict";
var Code = require("code.js");
var Type = require("type.js");
var ArrayType = Type.Array;
var PointerType = Type.Pointer;
var ProcedureType = Type.Procedure;

function doNoting(context, e){return e;}

function findBaseType(base, type){
    while (type && type != base)
        type = type.baseType();
    return type;
}

function findPointerBaseType(pBase, pType){
    if (!findBaseType(pBase.baseType(), pType.baseType()))
        return undefined;
    return pBase;
}

function matchesToNIL(t){
    return t instanceof PointerType || t instanceof ProcedureType;
}

function areTypesMatch(t1, t2){
    if (t1 == t2)
        return true;
    if (t1 instanceof PointerType && t2 instanceof PointerType)
        return areTypesMatch(t1.baseType(), t2.baseType());
    if (t1 instanceof ProcedureType && t2 instanceof ProcedureType)
        return areProceduresMatch(t1, t2);
    if (t1 == Type.nil && matchesToNIL(t2)
        || t2 == Type.nil && matchesToNIL(t1))
        return true;
    return false;
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
            &&!areTypesMatch(a1.type, a2.type))
            return false;
    }

    var r1 = p1.result();
    var r2 = p2.result();
    if (r1 == p1 && r2 == p2)
        return true;
    return areTypesMatch(r1, r2);
}

function implicitCast(from, to){
    if (from === to)
        return doNoting;

    if (from instanceof Type.String){
        if (to === Type.basic.ch){
            var v = from.asChar();
            if (v !== undefined)
                return function(){return new Code.Expression(v, to);};
        }
        else if (to instanceof Type.Array && to.elementsType() == Type.basic.ch)
            return function(context, e){
                return new Code.Expression(context.rtl().strToArray(e.code()), to);
            };
    }
    else if (from instanceof ArrayType && to instanceof ArrayType)
        return implicitCast(from.elementsType(), to.elementsType());
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

exports.areTypesMatch = areTypesMatch;
exports.implicit = implicitCast;
exports.findPointerBaseType = findPointerBaseType;
