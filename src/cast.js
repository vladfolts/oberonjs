var Class = require("rtl.js").Class;
var Type = require("type.js");
var ArrayType = Type.Array;
var PointerType = Type.Pointer;

var Operation = Class.extend({
	init: function Operation(convert){this.__convert = convert;},
	code: function(context, code){return this.__convert ? this.__convert(context, code) : code;}
});

var doNoting = new Operation();

function implicitCast(from, to){
	if (from === to)
		return doNoting;

	//if (from instanceof VarParameter)
	//	return implicitCast(from.type(), (to instanceof VarParameter) ? to.type() : to);
	
	if (from instanceof Type.String){
		if (to === Type.basic.char){
			var v = from.asChar();
			if (v !== undefined)
				return new Operation(function(){return v;});
		}
		else if (to instanceof Type.Array && to.elementsType() == Type.basic.char)
			return new Operation(function(context, code){return context.rtl().strToArray(code);});
	}
	else if (from instanceof ArrayType && to instanceof ArrayType)
		return implicitCast(from.elementsType(), to.elementsType());
	else if ((from instanceof PointerType && to instanceof PointerType)
		|| (from instanceof Type.Record && to instanceof Type.Record)){
		var toR = to instanceof PointerType ? to.baseType() : to;
		var fromR = from.baseType();
		while (fromR && fromR != toR)
			fromR = fromR.baseType();
		if (fromR)
			return doNoting;
	}
	else if (from == Type.nil
		&& (to instanceof PointerType || to.isProcedure()))
		return doNoting;
	else if (from.isProcedure() && to.isProcedure()){
		var fromArgs = from.arguments();
		var toArgs = to.arguments();
		if (fromArgs.length == toArgs.length){
			for(var i = 0; i < fromArgs.length; ++i){
				var fromArg = fromArgs[i];
				var toArg = toArgs[i];
				if (toArg.isVar != fromArg.isVar)
					return undefined;
				if ((toArg.type != to || fromArg.type != from)
					&& !implicitCast(fromArg.type, toArg.type))
					return undefined;
			}

			var fromResult = from.result();
			var toResult = to.result();
			if (toResult == to && fromResult == from)
				return doNoting;
			if (implicitCast(fromResult, toResult))
				return doNoting;
		}
	}
	return undefined;
}

exports.implicit = implicitCast;
exports.Operation = Operation;