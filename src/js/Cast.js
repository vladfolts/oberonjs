var RTL$ = require("rtl.js");
var Code = require("js/Code.js");
var Context = require("js/Context.js");
var JsArray = require("js/JsArray.js");
var JsString = require("js/JsString.js");
var Object = require("js/Object.js");
var Types = require("js/Types.js");
var CastOp = RTL$.extend({
	init: function CastOp(){
	}
});
var CastOpDoNothing = CastOp.extend({
	init: function CastOpDoNothing(){
		CastOp.prototype.init.call(this);
	}
});
var CastOpStrToChar = CastOp.extend({
	init: function CastOpStrToChar(){
		CastOp.prototype.init.call(this);
		this.c = 0;
	}
});
var Operations = RTL$.extend({
	init: function Operations(){
		this.castToUint8 = null;
	}
});
var areTypesExactlyMatch = null;
var doNothing = null;
CastOpDoNothing.prototype.make = function(c/*Type*/, e/*PExpression*/){
	return e;
}

function findBaseType(base/*PRecord*/, type/*PRecord*/){
	while (true){
		if (type != null && type != base){
			type = Types.recordBase(type);
		} else break;
	}
	return type;
}

function findPointerBaseType(base/*PPointer*/, type/*Pointer*/){
	var result = null;
	if (findBaseType(Types.pointerBase(base), Types.pointerBase(type)) != null){
		result = base;
	}
	return result;
}

function matchesToNIL(t/*Type*/){
	return t instanceof Types.Pointer || t instanceof Types.Procedure;
}

function areTypesMatch(t1/*PType*/, t2/*PType*/){
	return areTypesExactlyMatch(t1, t2) || Types.isInt(t1) && Types.isInt(t2) || (t1 == Types.nil() && matchesToNIL(t2) || t2 == Types.nil() && matchesToNIL(t1));
}

function areArgsMatch(oa1/*PType*/, oa2/*PType*/, p1/*PProcedure*/, p2/*PProcedure*/){
	var a1 = null;
	var a2 = null;
	a1 = RTL$.typeGuard(oa1, Types.ProcedureArgument);
	a2 = RTL$.typeGuard(oa2, Types.ProcedureArgument);
	return a1.isVar == a2.isVar && (a1.type == p1 && a2.type == p2 || areTypesExactlyMatch(a1.type, a2.type));
}

function areProceduresMatch(p1/*PProcedure*/, p2/*PProcedure*/){
	var result = false;
	var args1 = null;var args2 = null;
	var argsLen = 0;
	var i = 0;
	var r1 = null;var r2 = null;
	args1 = p1.args();
	args2 = p2.args();
	argsLen = JsArray.len(args1);
	if (JsArray.len(args2) == argsLen){
		while (true){
			if (i < argsLen && areArgsMatch(JsArray.at(args1, i), JsArray.at(args2, i), p1, p2)){
				++i;
			} else break;
		}
		if (i == argsLen){
			r1 = p1.result();
			r2 = p2.result();
			result = r1 == p1 && r2 == p2 || areTypesExactlyMatch(r1, r2);
		}
	}
	return result;
}

function areTypesExactlyMatchImpl(t1/*PType*/, t2/*PType*/){
	var result = false;
	if (t1 == t2){
		result = true;
	}
	else if (t1 instanceof Types.Array && t2 instanceof Types.Array){
		result = Types.arrayLength(RTL$.typeGuard(t1, Types.Array)) == Types.arrayLength(RTL$.typeGuard(t2, Types.Array)) && areTypesMatch(Types.arrayElementsType(RTL$.typeGuard(t1, Types.Array)), Types.arrayElementsType(RTL$.typeGuard(t2, Types.Array)));
	}
	else if (t1 instanceof Types.Pointer && t2 instanceof Types.Pointer){
		result = areTypesMatch(Types.pointerBase(RTL$.typeGuard(t1, Types.Pointer)), Types.pointerBase(RTL$.typeGuard(t2, Types.Pointer)));
	}
	else if (t1 instanceof Types.Procedure && t2 instanceof Types.Procedure){
		result = areProceduresMatch(RTL$.typeGuard(t1, Types.Procedure), RTL$.typeGuard(t2, Types.Procedure));
	}
	return result;
}
CastOpStrToChar.prototype.make = function(c/*Type*/, e/*PExpression*/){
	return Code.makeSimpleExpression(JsString.fromInt(this.c), Types.basic().ch);
}

function makeCastOpStrToChar(c/*CHAR*/){
	var result = null;
	result = new CastOpStrToChar();
	result.c = c;
	return result;
}

function implicit(from/*PType*/, to/*PType*/, ops/*Operations*/){
	var result = null;
	var c = 0;
	if (from == to){
		result = doNothing;
	}
	else if (from == Types.basic().uint8 && to == Types.basic().integer){
		result = doNothing;
	}
	else if (from == Types.basic().integer && to == Types.basic().uint8){
		result = ops.castToUint8;
	}
	else if (from instanceof Types.String){
		if (to == Types.basic().ch){
			if (Types.stringAsChar(RTL$.typeGuard(from, Types.String), {set: function($v){c = $v;}, get: function(){return c;}})){
				result = makeCastOpStrToChar(c);
			}
		}
		else if (to instanceof Types.Array && Types.arrayElementsType(RTL$.typeGuard(to, Types.Array)) == Types.basic().ch){
			result = doNothing;
		}
	}
	else if (from instanceof Types.Array && to instanceof Types.Array){
		if (Types.arrayLength(RTL$.typeGuard(to, Types.Array)) == Types.openArrayLength || Types.arrayLength(RTL$.typeGuard(to, Types.Array)) == Types.arrayLength(RTL$.typeGuard(from, Types.Array))){
			result = implicit(Types.arrayElementsType(RTL$.typeGuard(from, Types.Array)), Types.arrayElementsType(RTL$.typeGuard(to, Types.Array)), ops);
		}
	}
	else if (from instanceof Types.Pointer && to instanceof Types.Pointer){
		if (findPointerBaseType(RTL$.typeGuard(to, Types.Pointer), RTL$.typeGuard(from, Types.Pointer)) != null){
			result = doNothing;
		}
	}
	else if (from instanceof Types.Record && to instanceof Types.Record){
		if (findBaseType(RTL$.typeGuard(to, Types.Record), RTL$.typeGuard(from, Types.Record)) != null){
			result = doNothing;
		}
	}
	else if (from == Types.nil() && matchesToNIL(to)){
		result = doNothing;
	}
	else if (from instanceof Types.Procedure && to instanceof Types.Procedure){
		if (areProceduresMatch(RTL$.typeGuard(from, Types.Procedure), RTL$.typeGuard(to, Types.Procedure))){
			result = doNothing;
		}
	}
	return result;
}
areTypesExactlyMatch = areTypesExactlyMatchImpl;
doNothing = new CastOpDoNothing();
exports.CastOp = CastOp;
exports.Operations = Operations;
exports.findPointerBaseType = findPointerBaseType;
exports.areTypesMatch = areTypesMatch;
exports.areProceduresMatch = areProceduresMatch;
exports.implicit = implicit;
