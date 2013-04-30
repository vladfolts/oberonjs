var Code = require("code.js");
var Type = require("type.js");
var ArrayType = Type.Array;
var PointerType = Type.Pointer;

function doNoting(context, e){return e;}

function implicitCast(from, to){
	if (from === to)
		return doNoting;

	//if (from instanceof VarParameter)
	//	return implicitCast(from.type(), (to instanceof VarParameter) ? to.type() : to);
	
	if (from instanceof Type.String){
		if (to === Type.basic.char){
			var v = from.asChar();
			if (v !== undefined)
				return function(){return new Code.Expression(v, to);};
		}
		else if (to instanceof Type.Array && to.elementsType() == Type.basic.char)
			return function(context, e){
				return new Code.Expression(context.rtl().strToArray(e.code()), to);
			};
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
