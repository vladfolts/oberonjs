var Type = require("type.js");
var ArrayType = Type.Array;
var PointerType = Type.Pointer;

function implicitCast(from, to){
	if (from == to)
		return true;

	//if (from instanceof VarParameter)
	//	return implicitCast(from.type(), (to instanceof VarParameter) ? to.type() : to);
	
	if ((to === Type.basic.char) && (from instanceof Type.String)){
		var v = from.asChar();
		if (v !== undefined)
			return true;
	}
	else if (from instanceof ArrayType && to instanceof ArrayType)
		return implicitCast(from.elementsType(), to.elementsType());
	else if (from instanceof PointerType && to instanceof PointerType){
		toR = to.baseType();
		fromR = from.baseType();
		while (fromR && fromR != toR)
			fromR = fromR.baseType();
		if (fromR)
			return true;
	}
	else if (from == Type.nil 
		&& (to instanceof PointerType || to.isProcedure()))
		return true;
	else if (from.isProcedure() && to.isProcedure()){
		var fromArgs = from.arguments();
		var toArgs = to.arguments();
		if (fromArgs.length == toArgs.length){
			for(var i = 0; i < fromArgs.length; ++i){
				var fromArg = fromArgs[i];
				var toArg = toArgs[i];
				if (toArg.isVar != fromArg.isVar)
					return false;
				if ((toArg.type != to || fromArg.type != from)
					&& !implicitCast(fromArg.type, toArg.type))
					return false;
			}

			var fromResult = from.result();
			var toResult = to.result();
			if (toResult == to && fromResult == from)
				return true;
			if (implicitCast(fromResult, toResult))
				return true;
		}
	}
	return false;
}

exports.implicit = implicitCast;